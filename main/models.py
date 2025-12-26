
from django.db import models

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
