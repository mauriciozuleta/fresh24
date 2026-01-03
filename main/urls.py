from django.urls import path

from . import views
from . import views_countries_api
from . import views_airports_api
from . import views_management_api
from . import views_country_branch_api
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
    path('region-core-data-tab/', views.region_core_data_tab, name='region_core_data_tab'),

    # Management API endpoints
    path('api/check-region-info/', views_management_api.check_region_info, name='check_region_info'),
    path('api/check-country-info/', views_management_api.check_country_info, name='check_country_info'),
    path('api/check-branch-info/', views_management_api.check_branch_info, name='check_branch_info'),
    path('api/save-region-info/', views_management_api.save_region_info, name='save_region_info'),
    path('api/save-country-info/', views_management_api.save_country_info, name='save_country_info'),
    path('api/save-branch-info/', views_management_api.save_branch_info, name='save_branch_info'),
    path('api/get-management-table-data/', views_management_api.get_management_table_data, name='get_management_table_data'),
    path('api/update-country-information/', views_country_branch_api.update_country_information, name='update_country_information'),
    path('api/save-branch-costs/', views_country_branch_api.save_branch_costs, name='save_branch_costs'),
    path('api/get-branch-info/', views_country_branch_api.get_branch_info, name='get_branch_info'),

    # Delete endpoints
    path('delete-charter-provider/<int:pk>/', views.delete_charter_provider, name='delete_charter_provider'),
    path('delete-airport/<int:pk>/', views.delete_airport, name='delete_airport'),
    path('delete-aircraft/<int:pk>/', views.delete_aircraft, name='delete_aircraft'),
    path('api/products/', views.products_api, name='products_api'),
    path('add-product-form/', views.add_product_form, name='add_product_form'),
    path('add-product/', views.add_product, name='add_product'),
    path('edit-product-form/<str:product_code>/', views.edit_product_form, name='edit_product_form'),
    path('edit-product/<int:pk>/', views.edit_product, name='edit_product'),
]
