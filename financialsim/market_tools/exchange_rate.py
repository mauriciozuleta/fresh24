"""
Exchange Rate Utility for Logistics App

This module provides functions to fetch and manage currency exchange rates
from various external APIs. It integrates with the logistics app to provide
up-to-date currency conversions for financial calculations.
"""

import os
import requests
import json
from datetime import datetime, timedelta
import logging
from typing import Dict, Optional, Tuple, Union, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants


def get_exchange_rate(
    from_currency: str,
    to_currency: str,
    api_key: Optional[str] = None,
    force_refresh: bool = False
) -> float:
    """
    Get the exchange rate between two currencies.
    
    Args:
        from_currency: The source currency code (3-letter ISO code, e.g., "USD")
        to_currency: The target currency code (3-letter ISO code, e.g., "EUR")
        api_key: API key for the exchange rate service (optional)
        force_refresh: If True, ignore any cached data and fetch fresh from the API (currently unused)
    Returns:
        The exchange rate as a float
    
    Raises:
        ValueError: If invalid currency codes are provided
        ConnectionError: If unable to connect to exchange rate API
    """
    # Standardize currency codes
    from_currency = from_currency.upper().strip()
    to_currency = to_currency.upper().strip()
    
    # If same currency, return 1.0
    if from_currency == to_currency:
        return 1.0
    
    # Use the primary API directly without fallbacks or caching.
    rate = None
    try:
        rate = _get_rate_from_exchangerate_api(from_currency, to_currency, api_key)
    except Exception as e:
        # If the primary API fails, raise an error immediately.
        raise ConnectionError(f"Failed to get exchange rate from ExchangeRate-API: {e}") from e
    
    # If rate is still None, we couldn't get data from any API
    if rate is None:
        raise ConnectionError(f"ExchangeRate-API did not return a rate for {from_currency} to {to_currency}.")
    
    return rate


def _get_rate_from_exchangerate_api(from_currency: str, to_currency: str, api_key: Optional[str] = None) -> Optional[float]:
    """
    Get exchange rate from the ExchangeRate-API.
    
    API details: https://www.exchangerate-api.com/
    Free tier available with limited requests.
    """
    # Try to get API key from environment if not provided
    if api_key is None:
        api_key = os.environ.get('EXCHANGERATE_API_KEY')
    
    # If still no API key, can't use this service
    if not api_key:
        logger.warning("No API key for ExchangeRate-API")
        return None
    
    url = f"https://v6.exchangerate-api.com/v6/{api_key}/pair/{from_currency}/{to_currency}"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        data = response.json()
        
        if data.get('result') == 'success':
            return data.get('conversion_rate')
        else:
            logger.warning(f"ExchangeRate-API error: {data.get('error', 'Unknown error')}")
            return None
            # Build the API URL for v6.exchangerate-api.com
            url = f"https://v6.exchangerate-api.com/v6/{api_key}/latest/{from_currency}"
    except requests.exceptions.RequestException as e:
        logger.warning(f"ExchangeRate-API request failed: {str(e)}")
        return None


def convert_amount(
    amount: float, 
    from_currency: str, 
    to_currency: str, 
    api_key: Optional[str] = None
) -> float:
    """
    Convert an amount from one currency to another.
    
    Args:
        amount: The amount to convert
        from_currency: The source currency code
        to_currency: The target currency code
        api_key: API key for exchange rate service (optional)
        
    Returns:
        The converted amount as a float
    """
    rate = get_exchange_rate(from_currency, to_currency, api_key)
    return amount * rate


def main():
    """Command-line interface for exchange rate utility."""
    import argparse
    parser = argparse.ArgumentParser(description='Get currency exchange rates')
    parser.add_argument('--from', dest='from_currency', required=True, help='Source currency code (3-letter ISO)')
    parser.add_argument('--to', dest='to_currency', required=True, help='Target currency code (3-letter ISO)')
    parser.add_argument('--amount', type=float, default=1.0, help='Amount to convert (default: 1.0)')
    parser.add_argument('--api-key', help='API key for exchange rate service')
    args = parser.parse_args()
    try:
        rate = get_exchange_rate(
            args.from_currency,
            args.to_currency,
            api_key=args.api_key
        )
        converted = args.amount * rate
        print(f"Exchange Rate: 1 {args.from_currency} = {rate:.6f} {args.to_currency}")
        print(f"Converted Amount: {args.amount:.2f} {args.from_currency} = {converted:.2f} {args.to_currency}")
    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == "__main__":
    main()
