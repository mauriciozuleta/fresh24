from django import forms
from .models import Aircraft, Airport

class AircraftForm(forms.ModelForm):
    class Meta:
        model = Aircraft
        fields = [
            'manufacturer', 'model', 'short_name',
            'mtow_kg', 'mtow_lbs',
            'mldgw_kg', 'mldgw_lbs',
            'zero_fuel_kg', 'zero_fuel_lbs',
            'max_ramp_kg', 'max_ramp_lbs',
            'empty_weight_kg', 'empty_weight_lbs',
            'max_payload_kg', 'max_payload_lbs',
            'fuel_capacity_gal', 'fuel_capacity_lbs',
            'fuel_burn_gal', 'fuel_burn_lbs',
            'min_fuel_landed_gal', 'min_fuel_landed_lbs',
            'min_fuel_alternate_gal', 'min_fuel_alternate_lbs',
            'cargo_positions_main_deck', 'cargo_positions_lower_deck',
            'cruise_speed'
        ]

class AirportForm(forms.ModelForm):
    class Meta:
        model = Airport
        fields = [
            'iata_code', 'name', 'city', 'country',
            'latitude', 'longitude', 'altitude_ft',
            'fuel_cost_gl', 'cargo_handling_cost_kg', 'airport_fee', 'turnaround_cost',
            'other_desc', 'other_cost'
        ]
        widgets = {
            'name': forms.TextInput(attrs={'id': 'id_name'}),
            'city': forms.TextInput(attrs={'id': 'id_city'}),
            'country': forms.TextInput(attrs={'id': 'id_country'}),
        }
