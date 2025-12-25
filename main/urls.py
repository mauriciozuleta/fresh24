from django.urls import path
from . import views
from .airport_api import airport_lookup

urlpatterns = [
    path('', views.home, name='home'),
    path('add-aircraft/', views.add_aircraft, name='add_aircraft'),
    path('add-airport/', views.add_airport, name='add_airport'),
    path('api/airport-lookup/', airport_lookup, name='airport_lookup'),
]
