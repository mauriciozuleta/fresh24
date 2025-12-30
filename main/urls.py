from django.urls import path

from . import views
from . import views_countries_api
from . import views_airports_api
from .airport_api import airport_lookup

urlpatterns = [
    path('', views.home, name='home'),
    path('add-aircraft/', views.add_aircraft, name='add_aircraft'),
    path('add-airport/', views.add_airport, name='add_airport'),
    path('edit-aircraft/<int:pk>/', views.edit_aircraft, name='edit_aircraft'),
    path('edit-airport/<int:pk>/', views.edit_airport, name='edit_airport'),
    path('edit-charter-provider/<int:pk>/', views.edit_charter_provider, name='edit_charter_provider'),
    path('api/airport-lookup/', airport_lookup, name='airport_lookup'),
    path('api/airports/', views.airport_list_api, name='airport_list_api'),
    path('api/route-records/', views.route_records_api, name='route_records_api'),
    path('api/regions/', views.regions_api, name='regions_api'),
    path('api/countries-by-region/', views_countries_api.countries_by_region_api, name='countries_by_region_api'),
    path('api/airports-by-country/', views_airports_api.airports_by_country_api, name='airports_by_country_api'),
    path('mode-tab/', views.mode_tab, name='mode_tab'),

    # Delete endpoints
    path('delete-charter-provider/<int:pk>/', views.delete_charter_provider, name='delete_charter_provider'),
    path('delete-airport/<int:pk>/', views.delete_airport, name='delete_airport'),
    path('delete-aircraft/<int:pk>/', views.delete_aircraft, name='delete_aircraft'),
]
