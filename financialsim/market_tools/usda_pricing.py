import json
import requests
from decimal import Decimal

USDA_BASE_URL = "https://mpr.datamart.ams.usda.gov/services/v1/reports/"

# Universal conversion constants (these never change)
CWT_TO_KG = Decimal("45.3592")
LB_TO_KG = Decimal("0.453592")


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def find_usda_mapping(product_name, code_db):
    """
    Map supermarket product name -> (protein, report_code, sub_primal)
    """
    name = product_name.lower()

    for protein, info in code_db.items():
        report_code = info.get("report_code")
        sub_primals = info.get("sub_primals", {})

        for sub_primal, meta in sub_primals.items():
            keywords = [k.lower() for k in meta.get("keywords", [])]
            if any(k in name for k in keywords):
                return protein, report_code, sub_primal

    return None, None, None


def fetch_usda_report(report_code):
    url = USDA_BASE_URL + report_code
    resp = requests.get(url, timeout=20)
    resp.raise_for_status()
    return resp.json()


def extract_subprimal_value(report_data, sub_primal):
    """
    Extract USDA FOB value for the matched sub-primal.
    """
    target = sub_primal.lower()
    results = report_data.get("results", [])

    for row in results:
        item_desc = (row.get("item_description") or "").strip().lower()
        if item_desc == target:
            try:
                return float(row.get("value"))
            except:
                continue

    return None


def convert_to_usd_per_kg(raw_value, protein):
    """
    Convert USDA units to USD/kg using universal constants.
    """
    raw_value = Decimal(str(raw_value))

    if protein in ["pork", "beef", "lamb"]:
        # USD per cwt → USD per kg
        return (raw_value / CWT_TO_KG).quantize(Decimal("0.0001"))

    if protein in ["chicken", "turkey"]:
        # USD per lb → USD per kg
        return (raw_value / LB_TO_KG).quantize(Decimal("0.0001"))

    return None


def build_product_dict(supermarket_name, protein, sub_primal, usd_per_kg, defaults, unit_weights, report_code):
    """
    Build a Product-ready dict matching your Django model.
    """

    packaging_weight = Decimal(str(defaults["packaging_weight_kg"]))
    unit_weight = Decimal(str(unit_weights.get(sub_primal, 1.0)))

    units_per_pack = int(packaging_weight / unit_weight)
    packaging_cost = packaging_weight * usd_per_kg

    return {
        "product_code": f"{protein.upper()}-{sub_primal.upper()}-USA",
        "product_type": protein,
        "name": supermarket_name,  # supermarket name stays
        "country": defaults["origin_country"],
        "trade_unit": defaults["trade_unit"],
        "fca_cost_per_wu": usd_per_kg,
        "packaging": defaults["packaging_type"],
        "packaging_weight": packaging_weight,
        "units_per_pack": units_per_pack,
        "packaging_cost": packaging_cost,
        "other_info": f"USDA {report_code} → {sub_primal}",
        "currency": defaults["currency"]
    }


def get_usda_product(supermarket_name):
    """
    Main function:
    - Map supermarket name → USDA sub-primal
    - Fetch USDA FOB
    - Convert to USD/kg
    - Compute packaging + units
    - Return Product-ready dict
    """

    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    code_path = os.path.join(base_dir, "usda_codes.json")
    defaults_path = os.path.join(base_dir, "product_default.json")
    try:
        code_db = load_json(code_path)
        defaults_json = load_json(defaults_path)
    except Exception as e:
        print(f"[USDA] Error loading JSON files: {e}")
        return None

    defaults = defaults_json.get("defaults", {})
    unit_weights = defaults_json.get("unit_weights", {})

    protein, report_code, sub_primal = find_usda_mapping(supermarket_name, code_db)

    if not report_code:
        print(f"[MAPPING] No USDA mapping found for: {supermarket_name}")
        return None

    try:
        report_data = fetch_usda_report(report_code)
        raw_value = extract_subprimal_value(report_data, sub_primal)
    except Exception as e:
        print(f"[USDA] Error fetching or parsing USDA report: {e}")
        return None

    if raw_value is None:
        print(f"[USDA] No value found for {sub_primal} in {report_code}")
        return None

    usd_per_kg = convert_to_usd_per_kg(raw_value, protein)

    return build_product_dict(
        supermarket_name,
        protein,
        sub_primal,
        usd_per_kg,
        defaults,
        unit_weights,
        report_code
    )