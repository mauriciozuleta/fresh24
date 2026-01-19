import logging
import os
import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Callable, Dict, Iterable, List, Optional, Tuple

import difflib
import importlib
from pathlib import Path
from threading import Lock, Thread

from django.conf import settings
from django.utils import timezone

from main.models import Country, Product, ProductDiagnosis, BranchInfo, Airport
from financialsim.market_tools import sxm_scrapper, sxm_shopndrop

try:
    # New-style OpenAI client (openai>=1.0.0)
    from openai import OpenAI  # type: ignore
except Exception:  # pragma: no cover - library may not be installed yet
    OpenAI = None  # type: ignore


logger = logging.getLogger(__name__)


@dataclass
class SupermarketMatch:
    supermarket_name: str
    product_name: str
    raw_price: str
    numeric_price: Optional[Decimal]
    url: Optional[str]


ScraperFunc = Callable[[str, int], List[Dict[str, object]]]


# Simple in-memory cache for scraper search results.
# Key: (supermarket_name, query) -> list of raw candidate dicts.
SCRAPER_RESULTS_CACHE: Dict[Tuple[str, str], List[Dict[str, object]]] = {}


# Track running diagnosis jobs per country_code so the UI can know if
# a job is still in progress and avoid starting duplicates.
_RUNNING_COUNTRIES: set[str] = set()
_RUNNING_LOCK = Lock()


def _discover_country_scrapers_by_iata(country: Country) -> List[Tuple[str, ScraperFunc]]:
    """Discover scrapers for a country based on airport IATA codes.

    Follows the same logic as the retail price finder availability check:
    - Find all airports linked to this country via BranchInfo.
    - Fallback: airports whose text "country" field contains the country name.
    - In financialsim/market_tools (recursively), any .py whose filename
      starts with one of those IATA codes (case-insensitive) is considered
      a scraper module.
    - For each such module, we import it and look for a callable
      "search_products" function.
    """

    # Collect airport codes associated with this country
    airport_codes = set(
        BranchInfo.objects.filter(country=country)
        .values_list("airport__iata_code", flat=True)
    )

    if not airport_codes:
        airport_codes.update(
            Airport.objects.filter(country__icontains=country.name)
            .values_list("iata_code", flat=True)
        )

    codes_upper = { (code or "").upper() for code in airport_codes if code }
    if not codes_upper:
        return []

    scrapers: List[Tuple[str, ScraperFunc]] = []
    scraper_root = Path(settings.BASE_DIR) / "financialsim" / "market_tools"
    if not scraper_root.exists():
        return []

    for py_file in scraper_root.rglob("*.py"):
        name = py_file.name
        if name.startswith("__"):
            continue
        prefix = name.split("_", 1)[0].upper()
        if prefix not in codes_upper:
            continue

        # Build module path relative to financialsim.market_tools
        rel = py_file.relative_to(scraper_root).with_suffix("")
        module_parts = ["financialsim", "market_tools"] + list(rel.parts)
        module_name = ".".join(module_parts)
        try:
            module = importlib.import_module(module_name)
        except Exception as exc:  # pragma: no cover - import/runtime failures
            logger.warning("Failed to import scraper module %s: %s", module_name, exc)
            continue

        func = getattr(module, "search_products", None)
        if not callable(func):
            continue

        # Simple human-readable supermarket name from filename
        display_name = rel.stem.replace("_", " ").title()
        scrapers.append((display_name, func))

    return scrapers


def _get_openai_client() -> Optional[object]:
    """Return a cached OpenAI client if API key and library are available.

    If not configured, returns None so that callers can gracefully
    fall back to simple string matching.
    """

    # Optional feature flag: require explicit opt-in for OpenAI usage,
    # because LLM calls can be slow and costly for large product sets.
    use_openai = os.getenv("MARKET_DIAGNOSIS_USE_OPENAI", "").lower()
    if use_openai not in {"1", "true", "yes", "on"}:
        # Do not spam logs on every call; only log once.
        if not hasattr(_get_openai_client, "_logged_disabled"):
            logger.info(
                "OpenAI matching is disabled for market diagnosis. "
                "Set MARKET_DIAGNOSIS_USE_OPENAI=1 to enable it."
            )
            setattr(_get_openai_client, "_logged_disabled", True)
        return None

    if OpenAI is None:
        logger.warning("OpenAI library is not installed; falling back to fuzzy matching only.")
        return None

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OPENAI_API_KEY is not set; falling back to fuzzy matching only.")
        return None

    # Simple cached singleton
    if not hasattr(_get_openai_client, "_client"):
        setattr(_get_openai_client, "_client", OpenAI(api_key=api_key))
    return getattr(_get_openai_client, "_client")


def _parse_price(value: str) -> Optional[Decimal]:
    """Extract a numeric price from a string like '$12.34' or 'ANG 5.99'."""

    if not value:
        return None

    # Find the first number (integer or decimal) in the string
    match = re.search(r"([0-9]+(?:\.[0-9]+)?)", value.replace(",", ""))
    if not match:
        return None

    try:
        return Decimal(match.group(1))
    except (InvalidOperation, ValueError):
        return None


def _get_country_scrapers(country: Country) -> List[Tuple[str, ScraperFunc]]:
    """Return a list of (supermarket_name, scraper_func) for a Country.

    Primary mechanism is airport/IATA-based discovery so that any scraper
    file whose name starts with an airport code for this country is used.
    """

    # First, try dynamic discovery based on airport IATA codes
    scrapers = _discover_country_scrapers_by_iata(country)
    if scrapers:
        return scrapers

    # Fallback: legacy hard-coded mapping for St. Maarten, if needed
    name = (country.name or "").lower()
    legacy_scrapers: List[Tuple[str, ScraperFunc]] = []
    if "maarten" in name:
        legacy_scrapers.append(("ShopNDrop SXM", sxm_shopndrop.search_products))
        legacy_scrapers.append(("Les Halles SXM", sxm_scrapper.search_products))

    return legacy_scrapers


def _build_search_queries(product: Product) -> List[str]:
    """Return a small set of *normalized* search queries for a product.

    The goal is to group similar variants (e.g. many "pork loin" SKUs in
    different sizes) so that they share the same supermarket search.

    Strategy:
    - Extract alphabetic "significant" tokens from the name (>=3 chars).
    - Use the first 1–2 tokens joined as the main query (e.g. "pork loin").
    - Use the first token alone as a simple fallback (e.g. "pork").

    This avoids issuing one unique search per full product name while still
    giving OpenAI/fuzzy matching enough information to distinguish variants.
    """

    full_name = (product.name or "").strip().lower()
    if not full_name:
        return []

    # Keep only alphabetic tokens, drop numbers/weights, require length >= 3.
    raw_tokens = re.findall(r"[a-zA-Z]+", full_name)
    tokens = [t.lower() for t in raw_tokens if len(t) >= 3]
    if not tokens:
        return []

    queries: List[str] = []

    # Main grouped query: first 1–2 significant tokens, e.g. "pork loin".
    main_query = " ".join(tokens[:2])
    queries.append(main_query)

    # Fallback: first token alone (e.g. "pork").
    if len(tokens) > 1:
        queries.append(tokens[0])

    # De-duplicate while preserving order.
    seen = set()
    unique_queries: List[str] = []
    for q in queries:
        key = q.lower()
        if key not in seen:
            seen.add(key)
            unique_queries.append(q)

    return unique_queries


def _choose_with_openai(
    *,
    db_product: Product,
    candidates: List[Dict[str, object]],
) -> Optional[int]:
    """Return index of best candidate using OpenAI, or None.

    The model is asked to return ONLY a JSON object with an integer
    index or null when there is no sufficiently close match.
    """

    client = _get_openai_client()
    if client is None or not candidates:
        return None

    # Build a concise description of DB product and candidates.
    db_desc = {
        "product_code": db_product.product_code,
        "name": db_product.name,
        "type": db_product.product_type,
        "trade_unit": db_product.trade_unit,
    }

    simplified_candidates = []
    for idx, c in enumerate(candidates):
        simplified_candidates.append(
            {
                "index": idx,
                "name": str(c.get("name") or c.get("title") or ""),
                "price": str(c.get("price") or ""),
                "description": str(c.get("description") or c.get("weight") or ""),
            }
        )

    system_prompt = (
        "You are matching grocery products between a user database and supermarket search results. "
        "Choose the single best supermarket product that refers to the same real-world item as the database product, "
        "or return null if none are a reasonable match."
    )

    user_prompt = (
        "Database product:\n" f"{db_desc}\n\n" "Supermarket candidates:\n" f"{simplified_candidates}\n\n"
        "Reply with ONLY a JSON object like {\"index\": 0} or {\"index\": null}.\n"
        "Consider name, type (meat, vegetable, etc.), unit/weight, and any other clues."
    )

    try:
        response = client.chat.completions.create(  # type: ignore[attr-defined]
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0,
        )
        content = response.choices[0].message.content or ""  # type: ignore[index]
    except Exception as exc:  # pragma: no cover - network/runtime failure
        logger.warning("OpenAI matching failed, falling back to fuzzy matching: %s", exc)
        return None

    # Very defensive JSON parsing without importing json for robustness
    match = re.search(r"\{[^}]*\}", content)
    if not match:
        return None

    obj_text = match.group(0)
    idx_match = re.search(r"\"index\"\s*:\s*(null|-?\d+)", obj_text)
    if not idx_match:
        return None

    value = idx_match.group(1)
    if value == "null":
        return None

    try:
        idx = int(value)
    except ValueError:
        return None

    if 0 <= idx < len(candidates):
        return idx
    return None


def _choose_with_fuzzy_name(
    *, db_product: Product, candidates: List[Dict[str, object]]
) -> Optional[int]:
    """Fallback matcher using fuzzy string similarity on names only."""

    if not candidates:
        return None

    db_name = (db_product.name or "").lower()
    if not db_name:
        return None

    names = [str(c.get("name") or c.get("title") or "").lower() for c in candidates]
    best = difflib.get_close_matches(db_name, names, n=1, cutoff=0.6)
    if not best:
        return None

    best_name = best[0]
    for idx, n in enumerate(names):
        if n == best_name:
            return idx
    return None


def _select_best_candidate(db_product: Product, candidates: List[Dict[str, object]]) -> Optional[Dict[str, object]]:
    """Select the best candidate using OpenAI, with fuzzy fallback."""

    if not candidates:
        return None

    idx = _choose_with_openai(db_product=db_product, candidates=candidates)
    if idx is None:
        idx = _choose_with_fuzzy_name(db_product=db_product, candidates=candidates)

    if idx is None:
        return None

    return candidates[idx]


def _search_supermarket_for_product(
    *,
    supermarket_name: str,
    scraper: ScraperFunc,
    product: Product,
    limit_results: int = 20,
) -> Optional[SupermarketMatch]:
    """Run one scraper for a product and return the best match, if any."""

    queries = _build_search_queries(product)
    all_candidates: List[Dict[str, object]] = []

    for query in queries:
        cache_key = (supermarket_name, query)
        if cache_key in SCRAPER_RESULTS_CACHE:
            results = SCRAPER_RESULTS_CACHE[cache_key]
        else:
            try:
                results = scraper(query, limit_results)  # type: ignore[arg-type]
            except TypeError:
                # Some scrapers may define search_products(query) without limit.
                results = scraper(query)  # type: ignore[call-arg]
            except Exception as exc:  # pragma: no cover - network/runtime failure
                logger.warning("Scraper %s failed for query '%s': %s", supermarket_name, query, exc)
                SCRAPER_RESULTS_CACHE[cache_key] = []
                continue

            # Cache even empty results so we don't hit the scraper again for the same query
            SCRAPER_RESULTS_CACHE[cache_key] = results or []

        if results:
            all_candidates.extend(results)
            # We keep all candidates; selection is done by OpenAI/fuzzy matcher.

    best = _select_best_candidate(product, all_candidates)
    if not best:
        return None

    raw_price = str(best.get("price") or "")
    numeric_price = _parse_price(raw_price)

    return SupermarketMatch(
        supermarket_name=supermarket_name,
        product_name=str(best.get("name") or best.get("title") or ""),
        raw_price=raw_price,
        numeric_price=numeric_price,
        url=str(best.get("url") or ""),
    )


def _get_subtype_for_product(product: Product) -> str:
    """Rudimentary mapping of product_type/name to a broad subtype for portfolio search."""
    # This can be improved with a lookup table or more advanced NLP.
    name = (product.name or '').lower()
    ptype = (product.product_type or '').lower()
    if 'pork' in name or 'pork' in ptype:
        return 'pork'
    if 'beef' in name or 'beef' in ptype:
        return 'beef'
    if 'lamb' in name or 'lamb' in ptype:
        return 'lamb'
    if 'chicken' in name or 'chicken' in ptype:
        return 'chicken'
    # Add more as needed
    return 'other'

def run_market_diagnosis_for_country(country: Country) -> int:
    """New approach: scrape supermarket portfolios by subtype, then match locally."""
    scrapers = _get_country_scrapers(country)
    if not scrapers:
        logger.info("No dedicated scrapers configured for country '%s'", country.name)
        return 0

    # Reset scraper cache for this run so results reflect fresh data
    SCRAPER_RESULTS_CACHE.clear()
    products = list(Product.objects.exclude(country=country).order_by("product_code"))

    # Step 1: Build set of subtypes needed for this run
    needed_subtypes = set(_get_subtype_for_product(p) for p in products)

    # Step 2: For each supermarket, fetch portfolio for each needed subtype
    supermarket_portfolios = {}  # (supermarket_name, subtype) -> list[dict]
    for supermarket_name, scraper in scrapers:
        for subtype in needed_subtypes:
            # Use the subtype as the query (e.g., 'pork', 'beef', ...)
            try:
                results = scraper(subtype, 100)
            except Exception as exc:
                logger.warning(f"Scraper {supermarket_name} failed for subtype '{subtype}': {exc}")
                results = []
            supermarket_portfolios[(supermarket_name, subtype)] = results or []

    processed_count = 0
    now = timezone.now()

    # Step 3: For each product, match against the relevant supermarket portfolios
    for product in products:
        subtype = _get_subtype_for_product(product)
        matches: list[SupermarketMatch] = []
        for supermarket_name, scraper in scrapers:
            candidates = supermarket_portfolios.get((supermarket_name, subtype), [])
            best = _select_best_candidate(product, candidates)
            if best:
                raw_price = str(best.get("price") or "")
                numeric_price = _parse_price(raw_price)
                matches.append(SupermarketMatch(
                    supermarket_name=supermarket_name,
                    product_name=str(best.get("name") or best.get("title") or ""),
                    raw_price=raw_price,
                    numeric_price=numeric_price,
                    url=str(best.get("url") or ""),
                ))
        availability = len(matches)
        best_match: Optional[SupermarketMatch] = None
        if matches:
            priced = [m for m in matches if m.numeric_price is not None]
            if priced:
                best_match = min(priced, key=lambda m: m.numeric_price)
            else:
                best_match = matches[0]
        local_cost: Optional[Decimal] = best_match.numeric_price if best_match else None
        price_margin: Optional[Decimal] = None
        if local_cost is not None and product.fca_cost_per_wu and product.fca_cost_per_wu > 0:
            try:
                price_margin = (local_cost - product.fca_cost_per_wu) / product.fca_cost_per_wu * Decimal("100")
            except (InvalidOperation, ZeroDivisionError):
                price_margin = None
        ProductDiagnosis.objects.update_or_create(
            country_of_diagnosis=country.name,
            product_code=product.product_code,
            defaults={
                "db_name": product.name,
                "product_type": product.product_type,
                "trade_unit": product.trade_unit,
                "cost": product.fca_cost_per_wu,
                "currency": product.currency,
                "supermarket_name": best_match.supermarket_name if best_match else None,
                "local_cost": local_cost,
                "price_margin": price_margin,
                "availability": availability,
                "updated": now,
            },
        )
        processed_count += 1
    return processed_count


def start_market_diagnosis_job(country: Country) -> bool:
    """Start market diagnosis for a country in a background thread.

    Returns True if a new job was started, or False if a job is already
    running for this country's code.
    """

    code = country.country_code
    with _RUNNING_LOCK:
        if code in _RUNNING_COUNTRIES:
            return False
        _RUNNING_COUNTRIES.add(code)

    def _worker(country_id: int, country_code: str) -> None:
        try:
            c = Country.objects.get(id=country_id)
            run_market_diagnosis_for_country(c)
        finally:  # pragma: no cover - defensive cleanup
            with _RUNNING_LOCK:
                _RUNNING_COUNTRIES.discard(country_code)

    thread = Thread(target=_worker, args=(country.id, code), daemon=True)
    thread.start()
    return True


def is_market_diagnosis_running(country: Country) -> bool:
    """Return True if a diagnosis job is currently running for this country."""

    code = country.country_code
    with _RUNNING_LOCK:
        return code in _RUNNING_COUNTRIES
