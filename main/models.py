from django.db import models


class Aircraft(models.Model):
	aircraft_id = models.CharField(max_length=20, unique=True)
	manufacturer = models.CharField(max_length=100)
	model = models.CharField(max_length=100)
	short_name = models.CharField(max_length=20)
	mtow_kg = models.FloatField()
	mtow_lbs = models.FloatField()
	empty_weight_kg = models.FloatField()
	empty_weight_lbs = models.FloatField()
	max_payload_kg = models.FloatField()
	max_payload_lbs = models.FloatField()
	zero_fuel_kg = models.FloatField()
	zero_fuel_lbs = models.FloatField()
	fuel_capacity_gal = models.FloatField()
	fuel_capacity_lbs = models.FloatField()
	fuel_burn_gal = models.FloatField()
	fuel_burn_lbs = models.FloatField()
	cargo_positions_main_deck = models.IntegerField()
	cargo_positions_lower_deck = models.IntegerField()
	cruise_speed = models.FloatField()
	acmi_cost = models.FloatField()

	def __str__(self):
		return f"{self.short_name} ({self.model})"



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
