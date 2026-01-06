from django.db import models

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
