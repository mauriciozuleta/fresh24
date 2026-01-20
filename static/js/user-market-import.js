// user-market-import.js
// Handles Import tab: product list for imports.

let importTabCache = null;
const UserMarketImport = {
  renderImportTab: function(tabContent) {
    if (importTabCache) {
      tabContent.innerHTML = '';
      tabContent.appendChild(importTabCache.cloneNode(true));
      // Re-attach event listeners if needed (for dynamic elements)
      return;
    }
    var wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="tab-content-inner">
        <h2>Competitive Prices Import</h2>
        <div style="display: flex; gap: 1.5rem; align-items: flex-end; margin-bottom: 1.5rem;">
          <div>
            <label for="import-country-select" style="display:block; margin-bottom:0.5rem;">Country</label>
            <select id="import-country-select" class="aircraft-form-control" style="min-width:180px;"></select>
          </div>
          <div>
            <label for="import-category-select" style="display:block; margin-bottom:0.5rem;">Category</label>
            <select id="import-category-select" class="aircraft-form-control" style="min-width:180px;">
              <option value="">All Categories</option>
              <option value="Produce">Produce</option>
              <option value="Meats">Meats</option>
              <option value="Other Perishable">Other Perishable</option>
              <option value="Dry Goods">Dry Goods</option>
              <option value="Technology">Technology</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div style="flex:1; min-width:220px;">
            <label for="import-product-filter" style="display:block; margin-bottom:0.5rem;">Filter</label>
            <input type="text" id="import-product-filter" class="aircraft-form-control" placeholder="Type to filter products..." style="width:180px; min-width:150px; background:transparent; border:2px solid #2196f3; border-radius:4px; color:#fff; font-size:0.98em; padding:0.25rem 0.5rem; box-shadow:none; outline:none; z-index:2; position:relative; pointer-events:auto;" autocomplete="off" />
          </div>
          <div id="supermarket-dropdown-container" style="min-width:200px; display:flex; flex-direction:column;">
            <label for="import-supermarket-select" style="display:block; margin-bottom:0.5rem;">Supermarket</label>
            <div style="display:flex; gap:0.5rem; align-items:flex-end;">
              <select id="import-supermarket-select" class="aircraft-form-control" style="min-width:180px;"></select>
              <input type="text" id="supermarket-search-value" class="aircraft-form-control" placeholder="Enter value to search..." style="width:160px; min-width:120px; background:transparent; border:2px solid #2196f3; border-radius:4px; color:#fff; font-size:0.98em; padding:0.25rem 0.5rem; box-shadow:none; outline:none; z-index:2; position:relative; pointer-events:auto;" autocomplete="off" />
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
          <span id="import-exchange-label" style="color:#aaa; font-size:0.95em;"></span>
          <span id="import-exchange-rate" style="color:#aaa; font-size:0.95em;"></span>
        </div>
        <div id="import-products-table-container"></div>
        <div id="import-search-btn-container" style="margin:1.5rem 0 0 0; text-align:center;"></div>
        <div id="import-iframe-container" style="margin-top:2rem; display:none;">
          <h5>Manual Price Search</h5>
          <iframe id="search-iframe" src="https://www.bing.com" title="Manual Price Search" style="width:100%; height:400px; border:1px solid #2196f3; border-radius:8px; background:#fff;"></iframe>
        </div>
      </div>
    `;
    tabContent.innerHTML = '';
    tabContent.appendChild(wrapper);
    importTabCache = wrapper;

    // Fetch countries for dropdown from CountryInfo (unique countries)
    fetch('/api/countries-in-countryinfo/')
      .then(function(response) { return response.json(); })
      .then(function(data) {
        var countrySelect = document.getElementById('import-country-select');
        if (!countrySelect) return;
        countrySelect.innerHTML = '<option value="">Select Country</option>';
        if (data.countries && data.countries.length > 0) {
          data.countries.forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c.code || c.country_code;
            opt.textContent = c.name || c.country_name;
            countrySelect.appendChild(opt);
          });
        }
        var categorySelect = document.getElementById('import-category-select');
        var filterInput = document.getElementById('import-product-filter');
        var exchangeLabelSpan = document.getElementById('import-exchange-label');
        var supermarketDropdownContainer = document.getElementById('supermarket-dropdown-container');
        var supermarketSelect = document.getElementById('import-supermarket-select');
        var supermarketLabel = supermarketDropdownContainer.querySelector('label');

        function updateSupermarketDropdown() {
          var code = countrySelect.value || '';
          supermarketDropdownContainer.style.display = 'flex';
          if (!code) {
            supermarketSelect.innerHTML = '';
            supermarketSelect.disabled = true;
            supermarketLabel.textContent = 'retail price finder not available';
            supermarketLabel.style.color = '#f44336';
            return;
          }
          fetch('/api/available-supermarkets/?country=' + encodeURIComponent(code))
            .then(function(resp) { return resp.json(); })
            .then(function(data) {
              var supermarkets = (data && data.supermarkets) || [];
              if (supermarkets.length > 0) {
                supermarketSelect.disabled = false;
                supermarketLabel.textContent = 'Supermarket';
                supermarketLabel.style.color = '#4caf50';
                supermarketSelect.innerHTML = '';
                supermarkets.forEach(function(s) {
                  var opt = document.createElement('option');
                  opt.value = s.module_name;
                  opt.textContent = s.display_name;
                  supermarketSelect.appendChild(opt);
                });
              } else {
                supermarketSelect.disabled = true;
                supermarketSelect.innerHTML = '';
                supermarketLabel.textContent = 'retail price finder not available';
                supermarketLabel.style.color = '#f44336';
              }
            })
            .catch(function() {
              supermarketSelect.disabled = true;
              supermarketSelect.innerHTML = '';
              supermarketLabel.textContent = 'retail price finder not available';
              supermarketLabel.style.color = '#f44336';
            });
        }

        function filterTable() {
          UserMarketImport.renderProductsTable(
            countrySelect.value,
            categorySelect.value,
            (typeof filterInput.value === 'string' ? filterInput.value : '')
          );
        }
        countrySelect.addEventListener('change', function() {
          filterTable();
          updateSupermarketDropdown();
        });
        categorySelect.addEventListener('change', filterTable);
        filterInput.addEventListener('input', function(e) {
          filterTable();
        });

        // Initial table render
        filterTable();
        updateSupermarketDropdown();
      });
  },

  renderProductsTable: function(countryCode, category, filterText) {
    var container = document.getElementById('import-products-table-container');
    if (!container) return;
    var btnContainer = document.getElementById('import-search-btn-container');
    var exchangeRateSpan = document.getElementById('import-exchange-rate');
    var exchangeLabelSpan = document.getElementById('import-exchange-label');
    container.innerHTML = '<div style="margin:2rem 0; text-align:center; color:#2196f3;">Loading products...</div>';

    fetch('/api/products/?country=' + encodeURIComponent(countryCode || ''))
      .then(function(response) { return response.json(); })
      .then(function(data) {
        var products = data.products || [];

        // Filter by category if selected
        if (category) {
          products = products.filter(function(p) {
            return (p.product_type || '').toLowerCase() === category.toLowerCase();
          });
        }

        // Filter by text if provided
        if (filterText) {
          var filter = filterText.trim().toLowerCase();
          if (filter) {
            products = products.filter(function(p) {
              return (
                (p.name && p.name.toLowerCase().includes(filter)) ||
                (p.product_code && p.product_code.toLowerCase().includes(filter)) ||
                (p.trade_unit && p.trade_unit.toLowerCase().includes(filter))
              );
            });
          }
        }

        if (!products.length) {
          container.innerHTML = '<div style="margin:2rem 0; text-align:center; color:#f44336;">No products found.</div>';
          if (btnContainer) btnContainer.innerHTML = '';
          if (exchangeRateSpan) exchangeRateSpan.textContent = '';
          return;
        }

        // Determine if any product currency is not USD and fetch exchange rate
        var nonUsdProduct = products.find(function(p) { return p.currency && p.currency.toUpperCase() !== 'USD'; });
        // Collect all unique product countries (non-USD) in the filtered list
        var countrySet = new Set();
        products.forEach(function(p) {
          var c = p.country_name || p.country || p.country_code || '';
          var curr = p.currency || '';
          if (c && curr.toUpperCase() !== 'USD') countrySet.add(c);
        });
        var countryList = Array.from(countrySet).join(', ');
        var labelText = countryList ? ('Products from "' + countryList + '" converted at:') : '';
        if (exchangeLabelSpan) {
          exchangeLabelSpan.textContent = labelText;
          exchangeLabelSpan.style.display = countryList ? '' : 'none';
        }

        if (nonUsdProduct && nonUsdProduct.currency && nonUsdProduct.currency.toUpperCase() !== 'USD') {
          fetch('/api/exchange-rate/?from=' + encodeURIComponent(nonUsdProduct.currency) + '&to=USD')
            .then(function(resp) { return resp.json(); })
            .then(function(rateData) {
              if (rateData && typeof rateData.rate === 'number') {
                // Keep existing label text based on product countries
                if (exchangeRateSpan) {
                  exchangeRateSpan.textContent = nonUsdProduct.currency + '→USD: ' + rateData.rate;
                }
                UserMarketImport._renderProductsTableWithRate(products, rateData.rate, nonUsdProduct.currency);
              } else {
                if (exchangeLabelSpan) exchangeLabelSpan.textContent = labelText;
                if (exchangeRateSpan) exchangeRateSpan.textContent = '';
                UserMarketImport._renderProductsTableWithRate(products, null, null);
              }
            })
            .catch(function() {
              if (exchangeLabelSpan) exchangeLabelSpan.textContent = labelText;
              if (exchangeRateSpan) exchangeRateSpan.textContent = '';
              UserMarketImport._renderProductsTableWithRate(products, null, null);
            });
        } else {
          if (exchangeLabelSpan) exchangeLabelSpan.textContent = labelText;
          if (exchangeRateSpan) exchangeRateSpan.textContent = '';
          UserMarketImport._renderProductsTableWithRate(products, null, null);
        }
      })
      .catch(function() {
        container.innerHTML = '<div style="margin:2rem 0; text-align:center; color:#f44336;">Error loading products.</div>';
        if (btnContainer) btnContainer.innerHTML = '';
        if (exchangeRateSpan) exchangeRateSpan.textContent = '';
      });
  },

  _renderProductsTableWithRate: function(products, exchangeRate, currency) {

    var container = document.getElementById('import-products-table-container');
    var btnContainer = document.getElementById('import-search-btn-container');

    if (!products.length) {
      container.innerHTML = '<div style="margin:2rem 0; text-align:center; color:#f44336;">No products found.</div>';
      if (btnContainer) btnContainer.innerHTML = '';
      return;
    }

    var html = '<div class="products-table-wrapper" style="overflow-x:auto; width:100%;">';
    html += '<table class="products-table" id="products-table" style="min-width:1200px; width:100%; border-collapse:collapse; margin-top:1rem;">';
    html += '<thead style="position:sticky;top:0;z-index:2;background:#222;">';
    html += '<tr>';
    html += '<th style="width:32px;background:#222;color:#fff;"> </th>';
    html += '<th class="col-code" style="background:#222;color:#fff;">ID</th>';
    html += '<th style="background:#222;color:#fff;">Name</th>';
    html += '<th style="background:#222;color:#fff;">Origin</th>';
    html += '<th class="col-trade-unit" style="background:#222;color:#fff;">Trade Unit</th>';
    // Removed DB Name and Cost columns as requested
    html += '<th style="background:#222;color:#fff;">Currency</th>';
    html += '<th style="position:sticky;top:0;z-index:3;background:#222;color:#fff;">FOB Price (USD)</th>';
    html += '<th style="background:#222;color:#fff; min-width:180px;">Supermarket</th>';
    html += '<th style="background:#222;color:#fff;">Local Cost</th>';
    html += '<th style="background:#222;color:#fff;">Price Margin</th>';
    html += '<th style="background:#222;color:#fff;">Availability</th>';
    html += '<th style="background:#222;color:#fff;">Updated</th>';
    html += '<th style="background:#222;color:#fff;">Price to Compare</th>';
    html += '</tr></thead><tbody>';

    products.forEach(function(product, idx) {
      html += '<tr>';
      html += '<td><input type="checkbox" class="import-product-checkbox" data-row-idx="' + idx + '" /></td>';
      html += '<td class="col-code">' + (product.product_code || '') + '</td>';
      html += '<td>' + (product.name || '') + '</td>';
      html += '<td>' + (product.country_name || '') + '</td>';
      html += '<td>' + (product.trade_unit || '') + '</td>';
      html += '<td>' + (product.currency || '') + '</td>';
      // FOB Price (USD) with conversion if needed
      if (
        typeof product.fca_cost_per_wu === 'number' &&
        exchangeRate && currency && product.currency && product.currency.toUpperCase() !== 'USD'
      ) {
        var converted = (product.fca_cost_per_wu * exchangeRate).toFixed(2);
        html += '<td>' + converted + ' <span style="color:#aaa; font-size:0.95em;">(' + product.fca_cost_per_wu.toFixed(2) + ' ' + product.currency + ')</span></td>';
      } else {
        html += '<td>' + (typeof product.fca_cost_per_wu === 'number' ? product.fca_cost_per_wu.toFixed(2) : (product.fca_cost_per_wu || '')) + '</td>';
      }
      html += '<td>' + (product.supermarket_name || '') + '</td>';
      html += '<td>' + (typeof product.local_cost === 'number' ? product.local_cost.toFixed(2) : (product.local_cost || '')) + '</td>';
      html += '<td>' + (typeof product.price_margin === 'number' ? product.price_margin.toFixed(2) : (product.price_margin || '')) + '</td>';
      html += '<td>' + (product.availability || '') + '</td>';
      html += '<td>' + (product.updated_date || product.updated_at || '') + '</td>';
      html += '<td>' + (product.price_to_compare || '') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;

    // Make checkboxes mutually exclusive and add country check
    var checkboxes = container.querySelectorAll('.import-product-checkbox');
    var countrySelect = document.getElementById('import-country-select');
    var btnContainer = document.getElementById('import-search-btn-container');
    var iframeContainer = document.getElementById('import-iframe-container');
    function updateSearchBtn() {
      var checked = Array.from(checkboxes).find(cb => cb.checked);
      var selectedProductName = '';
      if (checked) {
        var row = checked.closest('tr');
        if (row) {
          var nameCell = row.querySelector('td:nth-child(3)');
          if (nameCell) selectedProductName = nameCell.textContent.trim();
        }
      }
      var selectedCountry = '';
      if (countrySelect && countrySelect.value) {
        var selectedOption = countrySelect.options[countrySelect.selectedIndex];
        selectedCountry = selectedOption ? selectedOption.textContent.trim() : countrySelect.value;
      }
      if (countrySelect && countrySelect.value && checked && selectedProductName && selectedCountry) {
        var prompt = 'search for online supermarket prices for ' + selectedProductName + ' in ' + selectedCountry + ' main cities';
        btnContainer.innerHTML = '<button id="show-iframe-btn" class="primary-button" style="margin:1rem auto;">' + prompt + '</button>';
        var btn = document.getElementById('show-iframe-btn');
        btn.onclick = function() {
          if (iframeContainer) {
            var iframe = document.getElementById('search-iframe');
            if (iframe) {
              var query = encodeURIComponent(selectedCountry + ' supermarket price ' + selectedProductName + ' main cities');
              iframe.src = 'https://www.bing.com/search?q=' + query;
            }
            iframeContainer.style.display = '';
          }
        };
      } else {
        btnContainer.innerHTML = '';
        if (iframeContainer) iframeContainer.style.display = 'none';
      }
    }
    checkboxes.forEach(function(checkbox) {
      checkbox.addEventListener('change', function(e) {
        if (!countrySelect || !countrySelect.value) {
          checkbox.checked = false;
          alert('Please select a country first.');
          updateSearchBtn();
          return;
        }
        if (checkbox.checked) {
          checkboxes.forEach(function(cb) {
            if (cb !== checkbox) cb.checked = false;
          });
        }
        updateSearchBtn();
      });
    });
    if (countrySelect) {
      countrySelect.addEventListener('change', updateSearchBtn);
    }
    updateSearchBtn();
    html += '</tbody></table></div>';
  }
};
if (typeof window !== 'undefined') {
  window.UserMarketImport = UserMarketImport;
}
