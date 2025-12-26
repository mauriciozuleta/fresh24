from .models import CharterProvider
from django import forms
from .models import CharterProvider, Aircraft, Airport

class CharterProviderForm(forms.ModelForm):
    country = forms.ModelChoiceField(
        queryset=None,
        widget=forms.Select(attrs={'class': 'aircraft-form-control'}),
        label='Country',
        required=True
    )

    main_base = forms.ModelChoiceField(
        queryset=None,
        widget=forms.Select(attrs={'class': 'aircraft-form-control', 'id': 'id_main_base'}),
        label='Main Base',
        required=True
    )

    def __init__(self, *args, **kwargs):
        from .models import Country, Airport
        super().__init__(*args, **kwargs)
        self.fields['country'].queryset = Country.objects.all().order_by('name')
        airports = list(Airport.objects.all().order_by('iata_code'))
        self.fields['main_base'].queryset = Airport.objects.all().order_by('iata_code')
        # Add 'Add Base' option at the end
        choices = [(a.pk, a.iata_code) for a in airports]
        choices.append(('add', 'Add Base'))
        self.fields['main_base'].choices = choices

    class Meta:
        model = CharterProvider
        fields = ['name', 'country', 'main_base', 'aircraft', 'block_hour_cost']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'aircraft-form-control'}),
            'main_base': forms.TextInput(attrs={'class': 'aircraft-form-control'}),
            'aircraft': forms.Select(attrs={'class': 'aircraft-form-control'}),
            'block_hour_cost': forms.NumberInput(attrs={'class': 'aircraft-form-control', 'step': '0.01'}),
        }
from django import forms
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
        widgets = {field: forms.TextInput(attrs={'class': 'aircraft-form-control'}) for field in fields}

class AirportForm(forms.ModelForm):
    class Meta:
        model = Airport
        fields = [
            'iata_code', 'name', 'city', 'country',
            'latitude', 'longitude', 'altitude_ft',
            'fuel_cost_gl', 'cargo_handling_cost_kg', 'airport_fee', 'turnaround_cost',
            'other_desc', 'other_cost'
        ]
        widgets = {field: forms.TextInput(attrs={'class': 'aircraft-form-control'}) for field in fields}
