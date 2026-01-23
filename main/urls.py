from django.urls import path
from . import views
from . import views_countries_api
from .views import save_price_comparison_api
from . import views_airports_api
from . import views_management_api
from . import views_country_branch_api
from . import views_supply_chain_api
from . import views_scraping
from . import views_products_api
from . import views_routes_api
from .airport_api import airport_lookup

urlpatterns = [
    path('api/save-price-comparison/', save_price_comparison_api, name='save_price_comparison_api'),
    path('api/get-saved-price-comparison/', views.get_saved_price_comparison_api, name='get_saved_price_comparison_api'),
    path('api/countries/', views.countries_api, name='countries_api'),
    path('', views_routes_api.home, name='home'),
    path('add-aircraft/', views_routes_api.add_aircraft, name='add_aircraft'),
    path('add-airport/', views_routes_api.add_airport, name='add_airport'),
    path('edit-aircraft/<int:pk>/', views_routes_api.edit_aircraft, name='edit_aircraft'),
    path('edit-airport/<int:pk>/', views_routes_api.edit_airport, name='edit_airport'),
    path('edit-charter-provider/<int:pk>/', views_routes_api.edit_charter_provider, name='edit_charter_provider'),
    path('api/airport-lookup/', airport_lookup, name='airport_lookup'),
    path('api/airports/', views_routes_api.airport_list_api, name='airport_list_api'),
    path('api/route-records/', views_routes_api.route_records_api, name='route_records_api'),
    path('api/regions/', views_routes_api.regions_api, name='regions_api'),
    path('api/countries-by-region/', views_countries_api.countries_by_region_api, name='countries_by_region_api'),
    path('api/airports-by-country/', views_airports_api.airports_by_country_api, name='airports_by_country_api'),
    path('mode-tab/', views_routes_api.mode_tab, name='mode_tab'),
    path('region-core-data-tab/', views_routes_api.region_core_data_tab, name='region_core_data_tab'),
    path('user-management-tab/', views_routes_api.user_management_tab, name='user_management_tab'),
    path('branch-information-tab/', views_routes_api.branch_information_tab, name='branch_information_tab'),

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
    path('delete-charter-provider/<int:pk>/', views_routes_api.delete_charter_provider, name='delete_charter_provider'),
    path('delete-airport/<int:pk>/', views_routes_api.delete_airport, name='delete_airport'),
    path('delete-aircraft/<int:pk>/', views_routes_api.delete_aircraft, name='delete_aircraft'),
    path('api/products/', views_products_api.products_api, name='products_api'),
    path('api/run-market-diagnosis/', views_products_api.run_market_diagnosis_api, name='run_market_diagnosis_api'),
    path('add-product-form/', views_products_api.add_product_form, name='add_product_form'),
    path('add-product/', views_products_api.add_product, name='add_product'),
    path('edit-product-form/<str:product_code>/', views_products_api.edit_product_form, name='edit_product_form'),
    path('edit-product/<int:pk>/', views_products_api.edit_product, name='edit_product'),
    path('add-supplier/', views_supply_chain_api.add_supplier, name='add_supplier'),
    path('api/supply-chain/', views_supply_chain_api.supply_chain_api, name='supply_chain_api'),
    path('api/supply-chain-details/', views_supply_chain_api.supply_chain_details_api, name='supply_chain_details_api'),
    path('edit-supplier/', __import__('main.views_edit_supplier_api').views_edit_supplier_api.edit_supplier, name='edit_supplier'),
    path('api/supplier-details/', views_supply_chain_api.supplier_details_api, name='supplier_details_api'),
    path('api/countries-in-countryinfo/', views_countries_api.countries_in_countryinfo_api, name='countries_in_countryinfo_api'),
    path('api/exchange-rate/', views_products_api.exchange_rate_api, name='exchange_rate_api'),
    path('api/country-has-retail-scraper/', views_scraping.country_has_retail_scraper_api, name='country_has_retail_scraper_api'),
    path('api/available-supermarkets/', views_scraping.available_supermarkets_api, name='available_supermarkets_api'),
    path('api/shopndrop-categories/', views_scraping.shopndrop_categories_api, name='shopndrop_categories_api'),
    path('api/scrape-supermarket/', views_scraping.scrape_supermarket_api, name='scrape_supermarket_api'),
    path('api/scrape-summary/', views_scraping.scrape_summary_api, name='scrape_summary_api'),
    path('api/scrape-results/', views_scraping.scrape_results_api, name='scrape_results_api'),
]
