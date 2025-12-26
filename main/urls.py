from django.urls import path
from . import views
from .airport_api import airport_lookup, airports_by_country

urlpatterns = [
    path('', views.home, name='home'),
    path('add-aircraft/', views.add_aircraft, name='add_aircraft'),
    path('add-airport/', views.add_airport, name='add_airport'),
    path('edit-aircraft/<int:pk>/', views.edit_aircraft, name='edit_aircraft'),
    path('edit-airport/<int:pk>/', views.edit_airport, name='edit_airport'),
    path('api/airport-lookup/', airport_lookup, name='airport_lookup'),
    path('api/airports-by-country/', airports_by_country, name='airports_by_country'),
    path('api/airports/', views.airport_list_api, name='airport_list_api'),
    path('mode-tab/', views.mode_tab, name='mode_tab'),

    # Delete endpoints
    path('delete-charter-provider/<int:pk>/', views.delete_charter_provider, name='delete_charter_provider'),
    path('delete-airport/<int:pk>/', views.delete_airport, name='delete_airport'),
    path('delete-aircraft/<int:pk>/', views.delete_aircraft, name='delete_aircraft'),
]
