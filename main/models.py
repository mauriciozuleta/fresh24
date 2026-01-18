from django.db import models

# Supplier model for supply chain
class Supplier(models.Model):
	product_name = models.CharField(max_length=128)
	supplier_name = models.CharField(max_length=128)
	country = models.CharField(max_length=64)
	location = models.CharField(max_length=128)
	assigned_branch = models.CharField(max_length=128)
	crop_area = models.CharField(max_length=64)
	crop_yield = models.CharField(max_length=64)
	delivery = models.CharField(max_length=32, choices=[
		("Year-round", "Year-round"),
		("Seasonal", "Seasonal"),
		("On Order", "On Order"),
		("On Shelf", "On Shelf")
	], default="Year-round")
	delivery_time = models.CharField(max_length=64, blank=True, null=True)
	ready_for_shelf_days = models.CharField(max_length=16, blank=True, null=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"{self.supplier_name} - {self.product_name}"


# Product model for user market data
class Product(models.Model):
	product_code = models.CharField(max_length=32, unique=True)
	product_type = models.CharField(max_length=32)
	name = models.CharField(max_length=128)
	country = models.ForeignKey('Country', on_delete=models.CASCADE)
	trade_unit = models.CharField(max_length=8)
	fca_cost_per_wu = models.DecimalField(max_digits=14, decimal_places=2)
	packaging = models.CharField(max_length=64)
	packaging_weight = models.DecimalField(max_digits=10, decimal_places=2)
	units_per_pack = models.IntegerField()
	packaging_cost = models.DecimalField(max_digits=14, decimal_places=2)
	other_info = models.TextField(blank=True, null=True)
	currency = models.CharField(max_length=8)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"{self.product_code} - {self.name}"




class Route(models.Model):
	leg = models.CharField(max_length=16)  # e.g., 'JFK-LHR'
	distance = models.FloatField(help_text='Distance in nautical miles')
	aircraft_type = models.ForeignKey('Aircraft', on_delete=models.CASCADE)
	provider = models.ForeignKey('CharterProvider', on_delete=models.CASCADE)
	flight_time = models.FloatField(help_text='Flight time in hours')
	adjusted_flight_time = models.FloatField(help_text='Adjusted flight time in hours')
	max_payload = models.FloatField(help_text='Max payload in lbs')
	service_type = models.CharField(max_length=16)
	block_hours_cost = models.DecimalField(max_digits=12, decimal_places=2)
	route_fuel_gls = models.FloatField(help_text='Route fuel in gallons')
	fuel_cost = models.DecimalField(max_digits=12, decimal_places=2)
	overflight_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	overflight_cost = models.DecimalField(max_digits=12, decimal_places=2)
	airport_fees_cost = models.DecimalField(max_digits=12, decimal_places=2)
	total_flight_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)

	def __str__(self):
		return f"{self.leg} | {self.aircraft_type} | {self.provider} | {self.service_type}"



from django.db import models

class Country(models.Model):
    name = models.CharField(max_length=100)
    country_code = models.CharField(max_length=4)
    currency = models.CharField(max_length=64)
    currency_code = models.CharField(max_length=8)
    region = models.CharField(max_length=64)

    def __str__(self):
        return f"{self.name} ({self.country_code})"


class Aircraft(models.Model):
	aircraft_id = models.CharField(max_length=64, unique=True)
	manufacturer = models.CharField(max_length=64)
	model = models.CharField(max_length=64)
	short_name = models.CharField(max_length=32)

	mtow_kg = models.FloatField()
	mtow_lbs = models.FloatField()
	mldgw_kg = models.FloatField(blank=True, null=True)
	mldgw_lbs = models.FloatField(blank=True, null=True)
	zero_fuel_kg = models.FloatField()
	zero_fuel_lbs = models.FloatField()
	max_ramp_kg = models.FloatField(blank=True, null=True)
	max_ramp_lbs = models.FloatField(blank=True, null=True)

	empty_weight_kg = models.FloatField()
	empty_weight_lbs = models.FloatField()
	max_payload_kg = models.FloatField()
	max_payload_lbs = models.FloatField()

	fuel_capacity_gal = models.FloatField()
	fuel_capacity_lbs = models.FloatField()
	fuel_burn_gal = models.FloatField()
	fuel_burn_lbs = models.FloatField()
	min_fuel_landed_gal = models.FloatField(blank=True, null=True)
	min_fuel_landed_lbs = models.FloatField(blank=True, null=True)
	min_fuel_alternate_gal = models.FloatField(blank=True, null=True)
	min_fuel_alternate_lbs = models.FloatField(blank=True, null=True)

	cargo_positions_main_deck = models.IntegerField()
	cargo_positions_lower_deck = models.IntegerField()
	cruise_speed = models.FloatField()
	max_range_at_max_payload = models.FloatField(blank=True, null=True, verbose_name="Max Range at Max Payload (nm)")
	max_range_with_max_fuel = models.FloatField(blank=True, null=True, verbose_name="Max Range with Max Fuel (nm)")

	def __str__(self):
		return f"{self.short_name} ({self.model})"



class CharterProvider(models.Model):

	name = models.CharField(max_length=100)
	country = models.ForeignKey(Country, on_delete=models.CASCADE)
	main_base = models.ForeignKey('Airport', on_delete=models.CASCADE, related_name='charter_providers')
	aircraft = models.ForeignKey(Aircraft, on_delete=models.CASCADE, related_name='charter_providers')
	block_hour_cost = models.DecimalField(max_digits=12, decimal_places=2)
	TYPE_CHOICES = [
		('charter', 'Charter'),
		('acmi', 'ACMI'),
		('by_kg', 'By Kg.')
	]
	type = models.CharField(max_length=16, choices=TYPE_CHOICES, default='charter')

	def __str__(self):
		return self.name



class Airport(models.Model):
	iata_code = models.CharField(max_length=3, unique=True)
	name = models.CharField(max_length=100)
	city = models.CharField(max_length=100)
	country = models.CharField(max_length=100)
	latitude = models.FloatField(blank=True, null=True)
	longitude = models.FloatField(blank=True, null=True)
	altitude_ft = models.IntegerField(blank=True, null=True)
	fuel_cost_gl = models.FloatField()
	cargo_handling_cost_kg = models.FloatField()
	airport_fee = models.FloatField()
	turnaround_cost = models.FloatField()
	other_desc = models.CharField(max_length=255, blank=True)
	other_cost = models.FloatField(blank=True, null=True)

	def __str__(self):
		return f"{self.iata_code} - {self.name}"


class RegionalInfo(models.Model):
	region = models.CharField(max_length=64, unique=True)
	regional_manager = models.CharField(max_length=100)
	region_user = models.CharField(max_length=100)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"{self.region} - {self.regional_manager}"


class CountryInfo(models.Model):
	country = models.ForeignKey(Country, on_delete=models.CASCADE)
	region = models.CharField(max_length=64)
	country_manager = models.CharField(max_length=100)
	country_user = models.CharField(max_length=100)
	export_sales_tax = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	export_other_tax = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	country_profit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	country_revenue_tax = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	import_tax = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	other_tax = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	country_import_profit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ['country', 'region']

	def __str__(self):
		return f"{self.country.name} - {self.country_manager}"


class BranchInfo(models.Model):
	airport = models.ForeignKey(Airport, on_delete=models.CASCADE)
	country = models.ForeignKey(Country, on_delete=models.CASCADE)
	branch_manager = models.CharField(max_length=100)
	branch_user = models.CharField(max_length=100)
	marketing_expenses = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	payroll = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	rent_expenses = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	utilities_expenses = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	office_supplies = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	other_expenses = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"{self.airport.iata_code} - {self.branch_manager}"


class ProductPriceComparison(models.Model):
    product_code = models.CharField(max_length=32)
    product_name = models.CharField(max_length=128)
    trade_unit = models.CharField(max_length=16, blank=True, null=True)
    packaging = models.CharField(max_length=64, blank=True, null=True)
    currency = models.CharField(max_length=8, blank=True, null=True)
    last_updated_price = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    last_updated_date = models.DateTimeField(blank=True, null=True)
    new_price = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    prices_in_country = models.CharField(max_length=100, blank=True, null=True, db_index=True)  # hidden column for selected country
    # Add any other fields as needed

    def __str__(self):
        return f"{self.product_code} - {self.product_name} ({self.prices_in_country})"


# MarketDB model for user_imported_data/market_db.CSV
class MarketDB(models.Model):
	country_island = models.CharField(max_length=64)
	supermarket = models.CharField(max_length=128)
	website = models.URLField(max_length=256)
	platform = models.CharField(max_length=64)
	scrapable = models.CharField(max_length=32)
	product_selector = models.CharField(max_length=128)
	title_selector = models.CharField(max_length=128)
	price_selector = models.CharField(max_length=128)
	js_render = models.CharField(max_length=16)
	scrape_method = models.CharField(max_length=64)
	notes = models.TextField(blank=True, null=True)

	def __str__(self):
		return f"{self.country_island} - {self.supermarket}"


class ProductDiagnosis(models.Model):
	"""Stores per-product market diagnosis results for a specific country."""

	country_of_diagnosis = models.CharField(max_length=100)
	product_code = models.CharField(max_length=32)
	db_name = models.CharField(max_length=128)
	product_type = models.CharField(max_length=32, blank=True, null=True)
	trade_unit = models.CharField(max_length=16, blank=True, null=True)
	cost = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
	currency = models.CharField(max_length=8, blank=True, null=True)

	supermarket_name = models.CharField(max_length=128, blank=True, null=True)
	local_cost = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
	price_margin = models.DecimalField(max_digits=7, decimal_places=2, blank=True, null=True)

	# 0 = no close match, 1 = found in 1 supermarket, 2 = found in 2 supermarkets
	availability = models.PositiveSmallIntegerField(default=0)

	updated = models.DateTimeField(auto_now=True)

	class Meta:
		indexes = [
			models.Index(fields=["country_of_diagnosis", "product_code"]),
		]

	def __str__(self) -> str:
		return f"{self.product_code} - {self.country_of_diagnosis} ({self.supermarket_name or 'no match'})"


