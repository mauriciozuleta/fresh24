// user-market-data.js
// Handles all User Market Data (products) UI and logic for Export/Import tabs

const UserMarketData = {
  renderExportTab: function(tabContent) {
    tabContent.innerHTML = `
      <div class="tab-content-inner">
        <h2>Export User Market Data</h2>
        <div style="display: flex; gap: 1.5rem; align-items: flex-end; margin-bottom: 2rem;">
          <div>
            <label for="export-country-select" style="display:block; margin-bottom:0.5rem;">Countries</label>
            <select id="export-country-select" class="aircraft-form-control" style="min-width:180px;">
              <option value="">Select Country</option>
              <!-- Options will be populated later -->
            </select>
          </div>
          <div>
            <label for="export-category-select" style="display:block; margin-bottom:0.5rem;">Filter by Category</label>
            <select id="export-category-select" class="aircraft-form-control" style="min-width:180px;">
              <option value="">All Categories</option>
              <option value="Produce">Produce</option>
              <option value="Meats">Meats</option>
              <option value="Other Perishable">Other Perishable</option>
              <option value="Dry Goods">Dry Goods</option>
              <option value="Technology">Technology</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <button id="add-supplier-btn" class="primary-button" style="margin-left:2rem; height:2.5rem;">Add Supplier</button>
          <button id="add-product-btn" class="primary-button" style="margin-left:1rem; height:2.5rem;">Add Product</button>
          <button id="edit-product-btn" class="primary-button" style="margin-left:1rem; height:2.5rem;">Edit Product</button>
        </div>
        <div id="export-products-table-container">
          <!-- Table or export content will go here -->
        </div>
      </div>
    `;
    // Add event listener to open Add Product tab and fetch products
    setTimeout(function() {
      var btn = document.getElementById('add-product-btn');
      if (btn && typeof window.createTab === 'function' && typeof window.setActiveTab === 'function') {
        btn.addEventListener('click', function() {
          window.createTab('Add Products', { nonClosable: false });
          window.setActiveTab('Add Products');
          // Fetch form HTML from backend
          setTimeout(function() {
            fetch('/add-product-form/')
              .then(function(response) { return response.text(); })
              .then(function(html) {
                var tabContent = document.getElementById('tab-content');
                if (tabContent) {
                  tabContent.innerHTML = html;
                }
              })
              .catch(function() {
                var tabContent = document.getElementById('tab-content');
                if (tabContent) tabContent.innerHTML = '<div class="tab-content-inner"><h2>Add Product</h2><p>Could not load product form.</p></div>';
              });
          }, 50);
        });
      }
      var editBtn = document.getElementById('edit-product-btn');
      if (editBtn && typeof window.createTab === 'function' && typeof window.setActiveTab === 'function') {
        editBtn.addEventListener('click', function() {
          var checkboxes = document.querySelectorAll('.product-select-checkbox');
          var selected = Array.from(checkboxes).find(cb => cb.checked);
          if (!selected) {
            alert('Please select a product to edit.');
            return;
          }
          var productCode = selected.getAttribute('data-product-code');
          var row = selected.closest('tr');
          var productName = row ? row.children[2].textContent : productCode;
          var tabLabel = 'Edit ' + productName;
          var tab = window.createTab(tabLabel, { nonClosable: false });
          
          // Store product code directly on the tab element
          if (tab) {
            tab.dataset.productCode = productCode;
          }
          
          window.setActiveTab(tabLabel);
          // Fetch form HTML and inject with product data
          fetch(`/edit-product-form/${encodeURIComponent(productCode)}/`)
            .then(function(response) { return response.text(); })
            .then(function(html) {
              // Clear tab content and inject form directly
              var tabContent = document.getElementById('tab-content');
              if (tabContent) {
                tabContent.innerHTML = html;
              }
            })
            .catch(function() {
              var tabContent = document.getElementById('tab-content');
              if (tabContent) tabContent.innerHTML = '<div class="tab-content-inner"><h2>Edit Product</h2><p>Could not load product form.</p></div>';
            });
        });
      }
      // Fetch products from API and render list
      fetch('/api/products/')
        .then(function(response) { return response.json(); })
        .then(function(data) {
          var container = document.getElementById('export-products-table-container');
          if (!container) return;
          if (!data.products || data.products.length === 0) {
            container.innerHTML = '<div style="margin:2rem 0; text-align:center; color:#f44336;">No products found.</div>';
            return;
          }
          var maxRows = 15;
          var html = '<div style="max-height:480px; overflow-y:auto; border-bottom:1px solid #444;">';
          html += '<table class="products-table" style="width:100%; border-collapse:collapse; margin-top:1rem;">';
          html += '<thead><tr style="background:#23272e; color:#FF5C00;">';
          html += '<th></th><th>Code</th><th>Name</th><th>Type</th><th>Country</th><th>Trade Unit</th><th>FCA Cost</th><th>Packaging</th><th>Currency</th></tr></thead><tbody>';
          (data.products.slice(0, maxRows)).forEach(function(p, idx) {
            html += `<tr style="background:#181c22; color:#fff; border-bottom:1px solid #23272e;" data-country-code="${p.country_code}">
              <td><input type="checkbox" class="product-select-checkbox" data-product-code="${p.product_code}" style="transform:scale(1.2);" ${idx===0 ? '' : ''}></td>
              <td>${p.product_code}</td>
              <td>${p.name}</td>
              <td>${p.product_type}</td>
              <td>${p.country_name}</td>
              <td>${p.trade_unit}</td>
              <td>${p.fca_cost_per_wu}</td>
              <td>${p.packaging}</td>
              <td>${p.currency}</td>
            </tr>`;
          });
          html += '</tbody></table></div>';
          html += '<div style="border-top:2px solid #0078d4; margin:1.5rem 0 0.5rem 0;"></div>';
          html += '<div id="supplier-form-container"></div>';
          container.innerHTML = html;
            html += '<div id="supply-chain-table-container"></div>';
            container.innerHTML = html;
            // Render supply chain table
            renderSupplyChainTable();
                          // Helper to render supply chain summary table
                          function renderSupplyChainTable() {
                            fetch('/api/supply-chain/')
                              .then(function(response) { return response.json(); })
                              .then(function(data) {
                                var sc = data.supply_chain || [];
                                var scHtml = '<div style="margin-top:2rem;">';
                                scHtml += '<h3>Supply Chain Summary</h3>';
                                if (!sc.length) {
                                  scHtml += '<div style="color:#f44336;">No supply chain data found.</div>';
                                } else {
                                  scHtml += '<table class="products-table" style="width:100%; border-collapse:collapse; margin-top:0.5rem; text-align:center;">';
                                  scHtml += '<thead><tr style="background:#23272e; color:#FF5C00;">' +
                                    '<th style="text-align:center; padding:8px 0;">Product</th>' +
                                    '<th style="text-align:center; padding:8px 0;">Suppliers</th>' +
                                    '<th style="text-align:center; padding:8px 0;">Branches</th>' +
                                    '<th style="text-align:center; padding:8px 0;">Total Yield</th>' +
                                    '</tr></thead><tbody>';
                                  sc.forEach(function(row, idx) {
                                    var zebra = idx % 2 === 0 ? 'background:#181c22;' : 'background:#23272e;';
                                    scHtml += `<tr style="${zebra} color:#fff; border-bottom:1px solid #23272e;">` +
                                      `<td style="text-align:center; padding:6px 0; font-weight:500;">${row.product_name}</td>` +
                                      `<td style="text-align:center; padding:6px 0;">${row.num_suppliers}</td>` +
                                      `<td style="text-align:center; padding:6px 0;">${row.num_branches}</td>` +
                                      `<td style="text-align:center; padding:6px 0;">${row.total_yield}</td>` +
                                      `</tr>`;
                                  });
                                  scHtml += '</tbody></table>';
                                }
                                scHtml += '</div>';
                                // Place below supplier form if open, else below product table
                                var formContainer = document.getElementById('supplier-form-container');
                                var scContainer = document.getElementById('supply-chain-table-container');
                                if (formContainer && formContainer.innerHTML.trim()) {
                                  formContainer.insertAdjacentHTML('afterend', scHtml);
                                } else if (scContainer) {
                                  scContainer.innerHTML = scHtml;
                                }
                              });
                          }
                    // Add Supplier form logic
                    var addSupplierBtn = document.getElementById('add-supplier-btn');
                    if (addSupplierBtn) {
                      addSupplierBtn.addEventListener('click', function() {
                        // Find selected product
                        var checkboxes = document.querySelectorAll('.product-select-checkbox');
                        var selected = Array.from(checkboxes).find(cb => cb.checked);
                        var productName = '';
                        var country = '';
                        if (selected) {
                          var row = selected.closest('tr');
                          if (row) {
                            productName = row.children[2].textContent;
                            country = row.getAttribute('data-country-code');
                          }
                        }
                        if (!selected) {
                          alert('Please select a product in the table to add a supplier for.');
                          return;
                        }
                        // Fetch airports for the selected country
                        fetch(`/api/airports-by-country/?country=${encodeURIComponent(country)}`)
                          .then(function(response) { return response.json(); })
                          .then(function(data) {
                            var airportOptions = '<option value="">Select Branch (Airport)</option>';
                            if (data.airports && data.airports.length > 0) {
                              data.airports.forEach(function(airport) {
                                var label = airport.iata_code ? `${airport.iata_code} - ${airport.city}` : airport.city;
                                airportOptions += `<option value="${airport.iata_code}">${label}</option>`;
                              });
                            } else {
                              airportOptions += '<option value="">No airports found</option>';
                            }
                            var formHtml = `
                              <form id="supplier-form" class="aircraft-form-section" style="margin-top:1.5rem; background:#23272e; padding:1.5rem; border-radius:8px;">
                                <div class="aircraft-form-row three-col">
                                  <div class="form-group">
                                    <label>Product Name</label>
                                    <input type="text" name="product_name" class="aircraft-form-control" required value="${productName}">
                                  </div>
                                  <div class="form-group">
                                    <label>Supplier Name</label>
                                    <input type="text" name="supplier_name" class="aircraft-form-control" required>
                                  </div>
                                  <div class="form-group">
                                    <label>Country</label>
                                    <input type="text" name="country" class="aircraft-form-control" required value="${country}">
                                  </div>
                                </div>
                                <div class="aircraft-form-row three-col">
                                  <div class="form-group">
                                    <label>Location</label>
                                    <input type="text" name="location" class="aircraft-form-control" required>
                                  </div>
                                  <div class="form-group">
                                    <label>Assigned Branch</label>
                                    <select name="assigned_branch" class="aircraft-form-control" required>${airportOptions}</select>
                                  </div>
                                  <div class="form-group">
                                    <label>Crop Area</label>
                                    <input type="text" name="crop_area" class="aircraft-form-control" required>
                                  </div>
                                </div>
                                <div class="aircraft-form-row">
                                  <div class="form-group" style="flex:1;">
                                    <label>Crop Yield</label>
                                    <input type="text" name="crop_yield" class="aircraft-form-control" required>
                                  </div>
                                </div>
                                <div style="margin-top:1.5rem; text-align:right;">
                                  <button type="submit" class="primary-button">Add to supply chain</button>
                                </div>
                              </form>
                            `;
                            var formContainer = document.getElementById('supplier-form-container');
                            if (formContainer) formContainer.innerHTML = formHtml;
                            // Attach submit handler
                            var form = document.getElementById('supplier-form');
                            if (form) {
                              form.addEventListener('submit', function(e) {
                                e.preventDefault();
                                var formData = new FormData(form);
                                fetch('/add-supplier/', {
                                  method: 'POST',
                                  body: formData,
                                  headers: { 'X-Requested-With': 'XMLHttpRequest' }
                                })
                                .then(function(response) { return response.json(); })
                                .then(function(result) {
                                  if (result.success) {
                                    alert('Supplier added to supply chain');
                                    form.reset();
                                    var formContainer = document.getElementById('supplier-form-container');
                                    if (formContainer) formContainer.innerHTML = '';
                                      // Refresh supply chain table
                                      var scContainer = document.getElementById('supply-chain-table-container');
                                      if (scContainer) scContainer.innerHTML = '';
                                      renderSupplyChainTable();
                                  } else {
                                    alert('Error: ' + (result.error || 'Unknown error'));
                                  }
                                })
                                .catch(function() {
                                  alert('Error saving supplier');
                                });
                              });
                            }
                          });
                      });
                    }
          // Only one checkbox active logic
          var checkboxes = container.querySelectorAll('.product-select-checkbox');
          checkboxes.forEach(function(cb) {
            cb.addEventListener('change', function() {
              if (this.checked) {
                checkboxes.forEach(function(other) {
                  if (other !== cb) other.checked = false;
                });
              }
            });
          });
        })
        .catch(function() {
          var container = document.getElementById('export-products-table-container');
          if (container) container.innerHTML = '<div style="margin:2rem 0; text-align:center; color:#f44336;">Failed to load products.</div>';
        });
    }, 50);
  },

  renderImportTab: function(tabContent) {
    tabContent.innerHTML = `
      <div class="tab-content-inner">
        <h2>Import User Market Data</h2>
        <p>Import functionality coming soon.</p>
      </div>
    `;
  }
};

// Export for module usage and attach to window for browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserMarketData;
}
if (typeof window !== 'undefined') {
  window.UserMarketData = UserMarketData;
}
