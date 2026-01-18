import logging
import os
import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Callable, Dict, Iterable, List, Optional, Tuple

import difflib

from django.db import transaction
from django.utils import timezone

from main.models import Country, Product, ProductDiagnosis
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


# Map countries to the scrapers that can diagnose their local market.
# St. Maarten / Saint Martin are handled by the two custom scrapers.
COUNTRY_SCRAPERS: List[Tuple[str, Tuple[str, ScraperFunc], Tuple[str, ScraperFunc]]] = [
    (
        "maarten",  # substring to look for in Country.name (case-insensitive)
        ("ShopNDrop SXM", sxm_shopndrop.search_products),
        ("Les Halles SXM", sxm_scrapper.search_products),
    ),
]


def _get_openai_client() -> Optional[object]:
    """Return a cached OpenAI client if API key and library are available.

    If not configured, returns None so that callers can gracefully
    fall back to simple string matching.
    """

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

    For now this is hard-wired for St. Maarten / Saint Martin based
    on substrings in the country name, but can be extended later.
    """

    name = (country.name or "").lower()
    scrapers: List[Tuple[str, ScraperFunc]] = []

    for marker, scraper_a, scraper_b in COUNTRY_SCRAPERS:
        if marker in name:
            scrapers.append(scraper_a)
            scrapers.append(scraper_b)

    return scrapers


def _build_search_queries(product: Product) -> List[str]:
    """Return a list of search queries to try for a product.

    1) Full product name.
    2) First significant word as a fallback (e.g. 'pork', 'chicken').
    """

    queries: List[str] = []

    full_name = (product.name or "").strip()
    if full_name:
        queries.append(full_name)

    # Very simple fallback: first word that is at least 3 characters.
    parts = re.split(r"\s+", full_name)
    for part in parts:
        token = re.sub(r"[^a-zA-Z]", "", part).lower()
        if len(token) >= 3:
            queries.append(token)
            break

    # De-duplicate while preserving order
    seen = set()
    unique_queries = []
    for q in queries:
        if q.lower() not in seen:
            seen.add(q.lower())
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
        try:
            results = scraper(query, limit_results)  # type: ignore[arg-type]
        except TypeError:
            # Some scrapers may define search_products(query) without limit.
            results = scraper(query)  # type: ignore[call-arg]
        except Exception as exc:  # pragma: no cover - network/runtime failure
            logger.warning("Scraper %s failed for query '%s': %s", supermarket_name, query, exc)
            continue

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


def run_market_diagnosis_for_country(country: Country) -> int:
    """Run market diagnosis for all products relative to a given country.

    - Only products whose country is different from the selected country
      are considered (imported products).
    - Uses dedicated scrapers for that country (if any).
    - For each product, finds the best supermarket match across scrapers,
      computes price margin, availability, and stores/updates a
      `ProductDiagnosis` row.

    Returns the number of products processed.
    """

    scrapers = _get_country_scrapers(country)
    if not scrapers:
        logger.info("No dedicated scrapers configured for country '%s'", country.name)
        return 0

    products = Product.objects.exclude(country=country).order_by("product_code")

    processed_count = 0
    now = timezone.now()

    with transaction.atomic():
        for product in products:
            matches: List[SupermarketMatch] = []

            for supermarket_name, scraper in scrapers:
                match = _search_supermarket_for_product(
                    supermarket_name=supermarket_name,
                    scraper=scraper,
                    product=product,
                )
                if match is not None:
                    matches.append(match)

            availability = len(matches)

            best_match: Optional[SupermarketMatch] = None
            if matches:
                # Choose the cheapest non-null price, otherwise the first match.
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
