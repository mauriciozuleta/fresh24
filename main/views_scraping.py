import os
from pathlib import Path
from threading import Thread

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .models import Airport, BranchInfo, Country


def _run_supermarket_scrape_job(country_id: int, module_name: str, query: str, slug: str) -> None:
    """Background worker: run scraper and write CSV for a supermarket query."""
    from datetime import datetime
    import csv
    from financialsim.market_tools.market_diagnosis import _get_country_scrapers

    try:
        country = Country.objects.get(id=country_id)
    except Country.DoesNotExist:
        print(f"DEBUG: background scrape aborted, country id {country_id} not found", flush=True)
        return

    scrapers = _get_country_scrapers(country)
    scraper_func = None
    display_name = None
    for dname, func in scrapers:
        if func.__module__.split('.')[-1] == module_name:
            scraper_func = func
            display_name = dname
            break
    if not scraper_func:
        print(f"DEBUG: background scrape aborted, scraper {module_name} not found for country {country}", flush=True)
        return

    print(f"DEBUG: [bg] starting scrape for {module_name} query={query}", flush=True)
    try:
        results = scraper_func(query)
    except Exception as exc:
        print(f"DEBUG: [bg] scraper failed for {module_name} query={query}: {exc}", flush=True)
        return
    print(f"DEBUG: [bg] scraper returned {len(results)} raw items for {display_name}", flush=True)

    rows = []
    sxm_module = None
    if module_name == 'sxm_scrapper':
        try:
            from financialsim.market_tools import sxm_scrapper as _sxm
            sxm_module = _sxm
            print("DEBUG: [bg] using sxm_scrapper enrichment logic", flush=True)
        except Exception as exc:
            print(f"DEBUG: [bg] failed to import sxm_scrapper for enrichment: {exc}", flush=True)

    for item in results:
        name = item.get('name', '')
        price = item.get('price', '')
        if module_name == 'sxm_scrapper' and sxm_module is not None:
            description = item.get('weight')
            product_page_url = item.get('url')
            try:
                if (not description or not str(description).strip()):
                    if (not product_page_url) and name:
                        product_page_url = sxm_module.find_product_page_url(name) or product_page_url
                    if product_page_url:
                        description = sxm_module.get_product_weight(product_page_url) or description
            except Exception as exc:
                print(f"DEBUG: [bg] sxm_scrapper enrichment failed for {name}: {exc}", flush=True)
            description = description or 'N/A'
            url = product_page_url or 'N/A'
        else:
            description = item.get('description') or item.get('weight') or 'N/A'
            url = item.get('url') or item.get('URL') or 'N/A'

        rows.append({
            'name': name,
            'price': price,
            'description': description,
            'url': url,
        })

    try:
        tools_dir = Path(settings.BASE_DIR) / 'financialsim' / 'market_tools'
        tools_dir.mkdir(parents=True, exist_ok=True)
        date_str = datetime.now().strftime('%m-%d-%Y')
        csv_path = tools_dir / f"{module_name}_{slug}_{date_str}.csv"
        with csv_path.open('w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=['Name', 'Price', 'Description', 'URL'])
            writer.writeheader()
            for row in rows:
                writer.writerow({
                    'Name': row.get('name', ''),
                    'Price': row.get('price', ''),
                    'Description': row.get('description', ''),
                    'URL': row.get('url', ''),
                })
        pattern = f"{module_name}_{slug}_*.csv"
        matches = list(tools_dir.glob(pattern))
        if len(matches) > 1:
            sorted_files = sorted(matches, key=lambda path: path.stat().st_mtime)
            for old in sorted_files[:-1]:
                try:
                    os.remove(old)
                except Exception:
                    pass
    except Exception as exc:
        print(f"DEBUG: [bg] failed to write CSV for {module_name} {slug}: {exc}", flush=True)


@require_GET
def shopndrop_categories_api(request):
    """Return navbar-based categories for the sxm_shopndrop scraper."""
    try:
        from financialsim.market_tools import sxm_shopndrop
    except Exception as exc:
        return JsonResponse({'error': f'Failed to import sxm_shopndrop: {exc}', 'categories': []}, status=500)

    try:
        categories = sxm_shopndrop.get_nav_categories()
    except Exception as exc:
        return JsonResponse({'error': f'Failed to build ShopNDrop navbar categories: {exc}', 'categories': []}, status=500)

    return JsonResponse({'categories': categories})


@require_GET
def available_supermarkets_api(request):
    """Return supermarkets for a country based on IATA-prefixed scrapers.

    Any .py file in financialsim/market_tools/scrapers whose filename starts
    with an airport IATA code for the selected country is treated as a
    supermarket scraper. The supermarket label is built from its URL if
    present in the source code.
    """
    from urllib.parse import urlparse
    country_code = request.GET.get('country_code') or request.GET.get('country')
    if not country_code:
        return JsonResponse({'supermarkets': []})
    try:
        country = Country.objects.get(country_code=country_code)
    except Country.DoesNotExist:
        return JsonResponse({'supermarkets': []})

    # Gather IATA codes for the country
    airport_codes = set(
        BranchInfo.objects.filter(country=country).values_list('airport__iata_code', flat=True)
    )
    if not airport_codes:
        airport_codes.update(
            Airport.objects.filter(country__icontains=country.name).values_list('iata_code', flat=True)
        )
    codes_upper = { (code or '').upper() for code in airport_codes if code }
    if not codes_upper:
        return JsonResponse({'supermarkets': []})

    from django.conf import settings
    from pathlib import Path
    scraper_dir = Path(settings.BASE_DIR) / 'financialsim' / 'market_tools' / 'scrapers'
    supermarkets = []
    if scraper_dir.exists():
        import re
        for py_file in scraper_dir.glob('*.py'):
            name = py_file.name
            if name.startswith('__') or not name.endswith('.py'):
                continue

            # File must start with an IATA code for this country
            prefix = name.split('_', 1)[0].upper()
            if prefix not in codes_upper:
                continue

            rel = py_file.with_suffix('').name

            # Try to extract a URL from the source code.
            try:
                text = py_file.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                text = ''

            candidate_url = None

            # 1) Look for explicit BASE_URL / SEARCH_URL style constants
            url_match = re.search(
                r"^(?:BASE_URL|SEARCH_URL|base_url|search_url)\s*=\s*['\"]([^'\"]+)['\"]",
                text,
                re.MULTILINE,
            )
            if url_match:
                candidate_url = url_match.group(1)

            # 2) Fallback: first literal http(s) URL in the file
            if not candidate_url:
                any_url = re.search(r"https?://[^'\"\s]+", text)
                if any_url:
                    candidate_url = any_url.group(0)

            # Derive supermarket URL/domain from whatever we found (if anything)
            domain = ''
            if candidate_url:
                parsed = urlparse(candidate_url)
                if parsed.scheme and parsed.netloc:
                    domain = f"{parsed.scheme}://{parsed.netloc}"
                elif parsed.netloc:  # scheme-less like //example.com
                    domain = parsed.netloc
                else:
                    domain = str(candidate_url).rstrip('/')

            display_name = domain or rel.replace('_', ' ').title()
            supermarkets.append({'display_name': display_name, 'module_name': rel, 'url': domain})

    return JsonResponse({'supermarkets': supermarkets})


@csrf_exempt
@require_POST
def scrape_supermarket_api(request):
    """Start a supermarket scrape in the background for a given query."""
    import json
    data = json.loads(request.body.decode('utf-8'))
    country_code = data.get('country_code')
    module_name = data.get('module_name')
    query = data.get('query')
    if not (country_code and module_name and query):
        return JsonResponse({'error': 'Missing required fields'}, status=400)
    try:
        country = Country.objects.get(country_code=country_code)
    except Country.DoesNotExist:
        return JsonResponse({'error': 'Invalid country code'}, status=400)

    from financialsim.market_tools.market_diagnosis import _get_country_scrapers

    scrapers = _get_country_scrapers(country)
    if not any(func.__module__.split('.')[-1] == module_name for _display, func in scrapers):
        return JsonResponse({'error': 'Scraper not found for this country'}, status=404)

    slug = (query or '').strip().lower().replace(' ', '-')
    print(f"DEBUG: scheduling background scrape for {module_name} query={query} slug={slug}", flush=True)

    thread = Thread(target=_run_supermarket_scrape_job, args=(country.id, module_name, query, slug), daemon=True)
    thread.start()

    return JsonResponse({
        'ok': True,
        'query': query,
        'module_name': module_name,
        'category': slug,
    })


@require_GET
def scrape_summary_api(request):
    """Summarize existing scraper CSV files in financialsim/market_tools."""
    tools_dir = Path(settings.BASE_DIR) / 'financialsim' / 'market_tools'

    scraper_urls = {
        'sxm_scrapper': 'https://www.sxmleshalles.com',
        'sxm_shopndrop': 'https://www.shopndropgrocerysxm.com',
    }

    module_to_domain = {}
    for module, url in scraper_urls.items():
        clean = url.replace('http://', '').replace('https://', '').rstrip('/')
        module_to_domain[module] = clean

    summary = {}
    if tools_dir.exists():
        for entry in tools_dir.iterdir():
            if not entry.is_file() or not entry.name.endswith('.csv'):
                continue
            stem = entry.stem
            parts = stem.split('_')

            module_name = None
            category = None

            if len(parts) >= 3:
                module_name = '_'.join(parts[0:2])
                category = parts[2]
            else:
                if stem.startswith('sxm_shopndrop-'):
                    module_name = 'sxm_shopndrop'
                    category = stem[len('sxm_shopndrop-'):]

            if not module_name or not category:
                continue

            domain = module_to_domain.get(module_name)
            if not domain:
                continue
            cats = summary.setdefault(domain, set())
            cats.add(category)

    serializable = {domain: sorted(list(categories)) for domain, categories in summary.items()}
    return JsonResponse({'summary': serializable})


@require_GET
def scrape_results_api(request):
    """Return detailed CSV records for a given scraper module and category."""
    module_name = request.GET.get('module_name')
    category = request.GET.get('category')
    if not module_name or not category:
        return JsonResponse({'error': 'module_name and category are required'}, status=400)

    from datetime import datetime
    import csv

    tools_dir = Path(settings.BASE_DIR) / 'financialsim' / 'market_tools'
    if not tools_dir.exists():
        return JsonResponse({'records': [], 'total': 0, 'category': category, 'domain': '', 'date': ''})

    matches = []
    for entry in tools_dir.iterdir():
        if not entry.is_file() or not entry.name.endswith('.csv'):
            continue
        stem = entry.stem
        parts = stem.split('_')
        if len(parts) < 4:
            continue
        file_module = '_'.join(parts[0:2])
        file_category = parts[2]
        if file_module != module_name or file_category.lower() != category.lower():
            continue
        date_str = '_'.join(parts[3:])
        try:
            parsed_dt = datetime.strptime(date_str, '%m-%d-%Y')
        except ValueError:
            parsed_dt = None
        matches.append((entry, parsed_dt, date_str))

    if not matches:
        return JsonResponse({'records': [], 'total': 0, 'category': category, 'domain': '', 'date': ''})

    def _sort_key(item):
        _file, parsed_dt, _date_str = item
        from datetime import datetime as _dt
        return parsed_dt or _dt.min

    latest_file, _latest_dt, latest_date_str = sorted(matches, key=_sort_key)[-1]

    scraper_urls = {
        'sxm_scrapper': 'https://www.sxmleshalles.com',
        'sxm_shopndrop': 'https://www.shopndropgrocerysxm.com',
    }
    full_url = scraper_urls.get(module_name, '')
    domain = full_url.replace('http://', '').replace('https://', '').rstrip('/') if full_url else ''

    records = []
    try:
        with latest_file.open('r', encoding='utf-8') as file_handle:
            reader = csv.DictReader(file_handle)
            for row in reader:
                records.append({
                    'name': row.get('Name', ''),
                    'price': row.get('Price', ''),
                    'description': row.get('Description', ''),
                    'url': row.get('URL', ''),
                })
    except Exception as exc:
        return JsonResponse({'error': f'Failed to read CSV: {exc}'}, status=500)

    total = len(records)

    return JsonResponse({
        'records': records,
        'total': total,
        'category': category,
        'domain': domain,
        'date': latest_date_str,
    })


def country_has_retail_scraper_api(request):
    """Return whether the selected country has any retail price scraper."""
    country_code = request.GET.get('country') or request.GET.get('country_code')
    if not country_code:
        return JsonResponse({'has_scraper': False})

    try:
        country = Country.objects.get(country_code=country_code)
    except Country.DoesNotExist:
        return JsonResponse({'has_scraper': False})

    airport_codes = set(
        BranchInfo.objects.filter(country=country).values_list('airport__iata_code', flat=True)
    )

    if not airport_codes:
        airport_codes.update(
            Airport.objects.filter(country__icontains=country.name).values_list('iata_code', flat=True)
        )

    if not airport_codes:
        return JsonResponse({'has_scraper': False})

    scraper_dir = Path(settings.BASE_DIR) / 'financialsim' / 'market_tools'
    codes_with_scrapers = set()
    if scraper_dir.exists():
        for py_file in scraper_dir.rglob('*.py'):
            name = py_file.name
            if name.startswith('__'):
                continue
            prefix = name.split('_', 1)[0]
            if len(prefix) == 3:
                codes_with_scrapers.add(prefix.upper())

    has_scraper = any((code or '').upper() in codes_with_scrapers for code in airport_codes)
    return JsonResponse({'has_scraper': bool(has_scraper)})
