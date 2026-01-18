// user-market-import.js
// Handles Import tab: product list for imports.

const UserMarketImport = {
  renderImportTab: function(tabContent) {
    tabContent.innerHTML = `
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
          <div style="flex:1; min-width:200px;">
            <label for="import-product-filter" style="display:block; margin-bottom:0.5rem;">Filter</label>
            <div style="display:flex; align-items:center; gap:1rem;">
              <input type="text" id="import-product-filter" class="aircraft-form-control" placeholder="Type to filter products..." style="width:100%; min-width:180px;" />
              <span id="import-exchange-rate" style="color:#aaa; font-size:0.95em;"></span>
            </div>
          </div>
        </div>
        <div id="import-products-table-container"></div>
        <div id="import-search-btn-container" style="margin:1.5rem 0 0 0; text-align:center;"></div>
        <div id="import-iframe-container" style="margin-top:2rem; display:none;">
          <h5>Manual Price Search</h5>
          <iframe id="search-iframe" src="https://www.bing.com" title="Manual Price Search" style="width:100%; height:400px; border:1px solid #2196f3; border-radius:8px; background:#fff;"></iframe>
        </div>
      </div>
    `;

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
        function filterTable() {
          UserMarketImport.renderProductsTable(countrySelect.value, categorySelect.value, filterInput.value);
        }
        countrySelect.addEventListener('change', filterTable);
        categorySelect.addEventListener('change', filterTable);
        filterInput.addEventListener('input', filterTable);
        // Initial table render
        filterTable();
      });
  },

  renderProductsTable: function(countryCode, category, filterText) {
    var container = document.getElementById('import-products-table-container');
    if (!container) return;
    var btnContainer = document.getElementById('import-search-btn-container');
    var exchangeRateSpan = document.getElementById('import-exchange-rate');
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

        if (nonUsdProduct && nonUsdProduct.currency && nonUsdProduct.currency.toUpperCase() !== 'USD') {
          fetch('/api/exchange-rate/?from=' + encodeURIComponent(nonUsdProduct.currency) + '&to=USD')
            .then(function(resp) { return resp.json(); })
            .then(function(rateData) {
              if (rateData && typeof rateData.rate === 'number') {
                if (exchangeRateSpan) {
                  exchangeRateSpan.textContent = nonUsdProduct.currency + '→USD: ' + rateData.rate;
                }
                UserMarketImport._renderProductsTableWithRate(products, rateData.rate, nonUsdProduct.currency);
              } else {
                if (exchangeRateSpan) exchangeRateSpan.textContent = '';
                UserMarketImport._renderProductsTableWithRate(products, null, null);
              }
            })
            .catch(function() {
              if (exchangeRateSpan) exchangeRateSpan.textContent = '';
              UserMarketImport._renderProductsTableWithRate(products, null, null);
            });
        } else {
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

    var html = '<div class="products-table-wrapper">';
    html += '<table class="products-table" id="products-table" style="width:100%; border-collapse:collapse; margin-top:1rem;">';
    html += '<thead><tr>';
    html += '<th style="width:32px;"></th>';
    html += '<th class="col-code">ID</th>';
    html += '<th>Name</th>';
    html += '<th>Origin</th>';
    html += '<th class="col-trade-unit">Trade Unit</th>';
    html += '<th>FOB Price</th>';
    html += '<th>Updated</th>';
    html += '<th>Price to Compare</th>';
    html += '</tr></thead><tbody>';

    products.forEach(function(product, idx) {
      html += '<tr>';
      html += '<td><input type="checkbox" class="import-product-checkbox" data-row-idx="' + idx + '" /></td>';
      html += '<td class="col-code">' + (product.product_code || '') + '</td>';
      html += '<td>' + (product.name || '') + '</td>';
      html += '<td>' + (product.country_name || product.country_code || '') + '</td>';
      html += '<td class="col-trade-unit">' + (product.trade_unit || '') + '</td>';

      // FOB Price: display FCA cost, converted to USD if needed
      var fca = (product.fca_cost_per_wu !== undefined && product.fca_cost_per_wu !== null)
        ? product.fca_cost_per_wu
        : '-';
      if (exchangeRate && currency && product.currency && product.currency.toUpperCase() === currency.toUpperCase()) {
        var numericFca = parseFloat(fca);
        if (!isNaN(numericFca)) {
          fca = (numericFca * exchangeRate).toFixed(2) + ' USD';
        }
      }
      html += '<td>' + fca + '</td>';

      html += '<td><span id="updated-' + product.id + '">' + (product.updated_date || '-') + '</span></td>';
      html += '<td>';
      html +=   '<input type="text" class="form-control form-control-sm" placeholder="$ value" style="width:80px;" id="input-' + product.id + '" value="' + (product.price_to_compare || '') + '" />';
      html += '</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;

    // Only allow one checkbox to be selected at a time
    var checkboxes = container.querySelectorAll('.import-product-checkbox');

    function updateButton() {
      var selectedIdx = -1;
      checkboxes.forEach(function(cb, i) { if (cb.checked) selectedIdx = i; });
      if (selectedIdx >= 0) {
        var selectedProduct = products[selectedIdx];
        var countrySelect = document.getElementById('import-country-select');
        var countryName = countrySelect && countrySelect.options[countrySelect.selectedIndex]
          ? countrySelect.options[countrySelect.selectedIndex].text
          : '';
        if (btnContainer) {
          btnContainer.innerHTML = '<button class="btn btn-primary aircraft-btn" id="import-search-btn" style="padding: 0.5rem 1.5rem; font-size: 1rem; border-radius: 6px; background: #2196f3; color: #fff; border: none; box-shadow: 0 2px 6px rgba(33,150,243,0.08); transition: background 0.2s;">Search for ' + (selectedProduct.name || '') + ' in ' + countryName + '</button>';
        }

        // Add click handler for the button
        setTimeout(function() {
          var btn = document.getElementById('import-search-btn');
          if (btn) {
            btn.onclick = function(e) {
              if (!countrySelect || !countrySelect.value) {
                alert('Please select a country first.');
                e.preventDefault();
                return false;
              }
              // Build search query and update iframe
              var query = (selectedProduct.name || '') + ' price in ' + countryName;
              var iframe = document.getElementById('search-iframe');
              var iframeContainer = document.getElementById('import-iframe-container');
              if (iframe && iframeContainer) {
                var url = 'https://www.bing.com/search?q=' + encodeURIComponent(query);
                iframe.src = url;
                iframeContainer.style.display = '';
              }
            };
          }
        }, 0);
      } else if (btnContainer) {
        btnContainer.innerHTML = '';
      }
    }

    checkboxes.forEach(function(checkbox) {
      checkbox.addEventListener('change', function(e) {
        var countrySelect = document.getElementById('import-country-select');
        if (this.checked && (!countrySelect || !countrySelect.value)) {
          alert('Please select a country first.');
          this.checked = false;
          e.preventDefault();
          return;
        }
        if (this.checked) {
          checkboxes.forEach(function(cb) {
            if (cb !== checkbox) cb.checked = false;
          });
        }
        updateButton();
      });
    });

    // Initial state
    updateButton();
  },

  combinedSearch: function(productId, productName, country) {
    var prompt = productName + ' price in ' + country + ' supermarket USD';
    var bingUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(prompt);
    document.getElementById('search-iframe').src = bingUrl;
    // Optionally, trigger AI search logic here
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserMarketImport;
}
if (typeof window !== 'undefined') {
  window.UserMarketImport = UserMarketImport;
}
