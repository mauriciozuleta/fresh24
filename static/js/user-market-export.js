// user-market-export.js
// Handles Export tab: product list, supply chain, suppliers, etc.

const UserMarketExport = {
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
          <div>
            <label for="export-product-search" style="display:block; margin-bottom:0.5rem;">Search Product by name</label>
            <input id="export-product-search" type="text" class="aircraft-form-control" style="min-width:220px;" placeholder="Start typing...">
          </div>
          <button id="add-supplier-btn" class="primary-button" style="margin-left:2rem; height:2.5rem;">Add Supplier</button>
          <button id="add-product-btn" class="primary-button" style="margin-left:1rem; height:2.5rem;">Add Product</button>
          <button id="edit-product-btn" class="primary-button" style="margin-left:1rem; height:2.5rem;">Edit Product</button>
        </div>
        <div id="export-products-summary" style="margin-bottom:1.5rem;"></div>
        <div id="export-products-table-container">
          <!-- Table or export content will go here -->
        </div>
      </div>
    `;
    // After rendering, fetch products and build table and country dropdown
    setTimeout(function() {
      var countrySelect = document.getElementById('export-country-select');
      var container = document.getElementById('export-products-table-container');
      fetch('/api/products/')
        .then(function(response) { return response.json(); })
        .then(function(data) {
          if (!container) return;
          if (!data.products || data.products.length === 0) {
            container.innerHTML = '<div style="margin:2rem 0; text-align:center; color:#f44336;">No products found.</div>';
            if (countrySelect) countrySelect.innerHTML = '<option value="">Select Country</option>';
            return;
          }
          var products = data.products || [];
          // Build summary
          var summaryDiv = document.getElementById('export-products-summary');
          if (summaryDiv) {
            var total = products.length;
            var byCountry = {};
            var byCategory = {};
            products.forEach(function(p) {
              var country = p.country_name || p.country_code || 'Unknown';
              var cat = (p.product_type || '').trim() || 'Unknown';
              byCountry[country] = (byCountry[country] || 0) + 1;
              byCategory[cat] = (byCategory[cat] || 0) + 1;
            });
            var countrySummary = Object.entries(byCountry).map(([name, count]) => `${count} from ${name}`).join(', ');
            var categorySummary = Object.entries(byCategory).map(([cat, count]) => `${count} are ${cat}`).join(', ');
            summaryDiv.innerHTML = `<div style="background:#23272e; color:#fff; border-radius:8px; padding:1rem 1.5rem; font-size:1rem;">
              <b>${total}</b> products available<br>
              ${countrySummary}<br>
              ${categorySummary}
            </div>`;
          }
          // Build country set from products
          var countrySet = new Set();
          var countryList = [];
          products.forEach(function(p) {
            var code = p.country_code || '';
            var name = p.country_name || '';
            // Use composite key to ensure uniqueness
            var key = code + '||' + name;
            if (!countrySet.has(key) && (code || name)) {
              countrySet.add(key);
              countryList.push({ code: code, name: name });
            }
          });
          // Populate dropdown
          if (countrySelect) {
            countrySelect.innerHTML = '<option value="">Select Country</option>';
            countryList.forEach(function(c) {
              var opt = document.createElement('option');
              // Prefer code for value, fallback to name
              opt.value = c.code || c.name;
              opt.textContent = c.name || c.code;
              countrySelect.appendChild(opt);
            });
          }
          // Build product table
          var html = (window.UserMarketHelpers && UserMarketHelpers.buildProductsTable)
            ? UserMarketHelpers.buildProductsTable(products)
            : (window.UserMarketData && UserMarketData.buildProductsTable
                ? UserMarketData.buildProductsTable(products)
                : '');
          html += '<div style="border-top:2px solid #0078d4; margin:1.5rem 0 0.5rem 0;"></div>';
          html += '<div id="supplier-form-container"></div>';
          html += '<div id="supply-chain-table-container"></div>';
          container.innerHTML = html;

          // Filtering logic
          var filterProducts = function() {
            var selectedCountry = countrySelect ? countrySelect.value : '';
            var categorySelect = document.getElementById('export-category-select');
            var selectedCategory = categorySelect ? categorySelect.value : '';
            var searchInput = document.getElementById('export-product-search');
            var term = searchInput ? searchInput.value.toLowerCase() : '';
            var productsTable = container.querySelector('.products-table-wrapper table');
            if (!productsTable) return;
            var rows = productsTable.querySelectorAll('tbody tr');
            rows.forEach(function(row) {
              var countryCode = row.getAttribute('data-country-code') || '';
              var countryName = row.getAttribute('data-country-name') || '';
              var typeCell = row.children[3];
              var typeText = typeCell ? typeCell.textContent.trim().toLowerCase() : '';
              var nameCell = row.children[2];
              var nameText = nameCell ? nameCell.textContent.toLowerCase() : '';
              var show = true;
              if (selectedCountry && countryCode !== selectedCountry && countryName !== selectedCountry) show = false;
              if (selectedCategory && selectedCategory !== '' && typeText !== selectedCategory.trim().toLowerCase()) show = false;
              if (term && nameText.indexOf(term) === -1) show = false;
              row.style.display = show ? '' : 'none';
            });
          };
          if (countrySelect) countrySelect.addEventListener('change', filterProducts);
          var categorySelect = document.getElementById('export-category-select');
          if (categorySelect) categorySelect.addEventListener('change', filterProducts);
          var searchInput = document.getElementById('export-product-search');
          if (searchInput) searchInput.addEventListener('input', filterProducts);
        })
        .catch(function() {
          if (container) container.innerHTML = '<div style="margin:2rem 0; text-align:center; color:#f44336;">Failed to load products.</div>';
          if (countrySelect) countrySelect.innerHTML = '<option value="">Select Country</option>';
        });
    }, 10);
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
          var products = data.products || [];
          var html = (window.UserMarketHelpers && UserMarketHelpers.buildProductsTable)
            ? UserMarketHelpers.buildProductsTable(products)
            : (window.UserMarketData && UserMarketData.buildProductsTable
                ? UserMarketData.buildProductsTable(products)
                : '');
          html += '<div style="border-top:2px solid #0078d4; margin:1.5rem 0 0.5rem 0;"></div>';
          html += '<div id="supplier-form-container"></div>';
          html += '<div id="supply-chain-table-container"></div>';
          container.innerHTML = html;

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
                  var formHtml = (window.UserMarketHelpers && UserMarketHelpers.buildAddSupplierForm)
                    ? UserMarketHelpers.buildAddSupplierForm(productName, country, airportOptions)
                    : (window.UserMarketData && UserMarketData.buildAddSupplierForm
                        ? UserMarketData.buildAddSupplierForm(productName, country, airportOptions)
                        : '');
                  var formContainer = document.getElementById('supplier-form-container');
                  if (formContainer) formContainer.innerHTML = formHtml;
                  // Attach submit handler
                  var form = document.getElementById('supplier-form');
                  if (form) {
                    // Show/hide Ready for shelf field based on product type
                    var readyForShelfGroup = document.getElementById('ready-for-shelf-group');
                    var productType = '';
                    // Try to get product type from the selected product row
                    var selectedRow = document.querySelector('.product-select-checkbox:checked');
                    if (selectedRow) {
                      var tr = selectedRow.closest('tr');
                      if (tr) productType = tr.children[3].textContent.trim().toLowerCase();
                    }
                    function updateReadyForShelfVisibility() {
                      if (["produce","meats","other perishable"].includes(productType)) {
                        readyForShelfGroup.style.display = '';
                      } else {
                        readyForShelfGroup.style.display = 'none';
                      }
                    }
                    updateReadyForShelfVisibility();

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
                          // Refresh supply chain summary table for this product
                          if (window.UserMarketExport && typeof window.UserMarketExport.renderSupplyChainTable === 'function') {
                            window.UserMarketExport.renderSupplyChainTable(productName);
                          }
                        } else {
                          alert('Error: ' + (result.error || 'Unknown error'));
                        }
                      })
                      .catch(function() {
                  // Add filter logic for country and category
                  var countrySelect = document.getElementById('export-country-select');
                  var categorySelect = document.getElementById('export-category-select');
                  function filterProducts() {
                    var selectedCountry = countrySelect ? countrySelect.value : '';
                    var selectedCategory = categorySelect ? categorySelect.value : '';
                    var productsTable = container.querySelector('.products-table-wrapper table');
                    if (!productsTable) return;
                    var rows = productsTable.querySelectorAll('tbody tr');
                    rows.forEach(function(row) {
                      var countryCode = row.getAttribute('data-country-code') || '';
                      var category = row.children[3] ? row.children[3].textContent : '';
                      var show = true;
                      if (selectedCountry && countryCode !== selectedCountry) show = false;
                      if (selectedCategory && selectedCategory !== '' && category !== selectedCategory) show = false;
                      row.style.display = show ? '' : 'none';
                    });
                  }
                  if (countrySelect) countrySelect.addEventListener('change', filterProducts);
                  if (categorySelect) categorySelect.addEventListener('change', filterProducts);
                        alert('Error saving supplier');
                      });
                    });
                  }
                });
            });
          }
          // Only one checkbox active logic and drive supply chain summary display
          var checkboxes = container.querySelectorAll('.product-select-checkbox');
          var scContainer = document.getElementById('supply-chain-table-container');
          checkboxes.forEach(function(cb) {
            cb.addEventListener('change', function() {
              if (this.checked) {
                // ensure only one selected
                checkboxes.forEach(function(other) {
                  if (other !== cb) other.checked = false;
                });
                // show supply chain only for selected product
                if (window.UserMarketExport && typeof window.UserMarketExport.renderSupplyChainTable === 'function') {
                  var row = this.closest('tr');
                  var nameCell = row ? row.children[2] : null;
                  var selectedProductName = nameCell ? nameCell.textContent.trim() : '';
                  window.UserMarketExport.renderSupplyChainTable(selectedProductName);
                }
              } else {
                // if no checkbox remains selected, hide supply chain summary
                var anyChecked = Array.from(checkboxes).some(function(other) { return other.checked; });
                if (!anyChecked && scContainer) {
                  scContainer.innerHTML = '';
                }
              }
            });
          });

          // Search Product by name - live filter
          var searchInput = document.getElementById('export-product-search');
          if (searchInput) {
            searchInput.addEventListener('input', function() {
              var term = this.value.toLowerCase();
              var productsTable = container.querySelector('.products-table-wrapper table');
              if (!productsTable) return;
              var rows = productsTable.querySelectorAll('tbody tr');
              rows.forEach(function(row) {
                var nameCell = row.children[2]; // Name column
                var nameText = nameCell ? nameCell.textContent.toLowerCase() : '';
                if (!term || nameText.indexOf(term) !== -1) {
                  row.style.display = '';
                } else {
                  row.style.display = 'none';
                }
              });
            });
          }
        })
        .catch(function() {
          var container = document.getElementById('export-products-table-container');
          if (container) container.innerHTML = '<div style="margin:2rem 0; text-align:center; color:#f44336;">Failed to load products.</div>';
        });
    }, 50);
  },

  renderSupplyChainTable: function(productName) {
    var scContainer = document.getElementById('supply-chain-table-container');
    if (!scContainer) return;
    fetch('/api/supply-chain/')
      .then(function(response) { return response.json(); })
      .then(function(data) {
        var sc = data.supply_chain || [];
        if (productName) {
          sc = sc.filter(function(row) { return row.product_name === productName; });
        }
        var scHtml = '<div style="margin-top:2rem;">';
        scHtml += '<h3>Supply Chain Summary</h3>';
        if (!sc.length) {
          scHtml += '<div style="color:#f44336;">No supply chain data found for the selected product.</div>';
        } else {
          var row = sc[0];
          var tableHtml = (window.UserMarketHelpers && UserMarketHelpers.buildSupplyChainTableHTML)
            ? UserMarketHelpers.buildSupplyChainTableHTML(row)
            : (window.UserMarketData && UserMarketData.buildSupplyChainTableHTML
                ? UserMarketData.buildSupplyChainTableHTML(row)
                : '');
          scHtml += tableHtml;
        }
        scHtml += '</div>';
        scContainer.innerHTML = scHtml;

        var detailsRow = scContainer.querySelector('.supplier-details-row');
        if (detailsRow && sc.length) {
          // Always show details for the selected product
          detailsRow.style.display = '';
          detailsRow.querySelector('.details-suppliers-list').innerHTML = '<span style="color:#888;">Loading...</span>';
          detailsRow.querySelector('.details-branches-list').innerHTML = '';
          detailsRow.querySelector('.details-yields-list').innerHTML = '';
          fetch('/api/supply-chain-details/?product_name=' + encodeURIComponent(row.product_name))
            .then(function(resp) { return resp.json(); })
            .then(function(data) {
              // Suppliers
              var suppliersHtml = '';
              if (data.suppliers && data.suppliers.length) {
                suppliersHtml = data.suppliers.map(function(s, idx) {
                  // Add a pencil icon for each supplier
                  return '<div style="display:flex;align-items:center;justify-content:center;gap:6px;">' +
                    '<span>' + s + '</span>' +
                    '<span class="edit-supplier-btn" data-supplier-name="' + encodeURIComponent(s) + '" title="Edit Supplier" style="cursor:pointer;display:inline-block;vertical-align:middle;">' +
                      '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.85 2.85a1.2 1.2 0 0 1 1.7 1.7l-1.1 1.1-1.7-1.7 1.1-1.1Zm-2.1 2.1 1.7 1.7-8.1 8.1c-.13.13-.22.29-.26.47l-.38 1.9a.5.5 0 0 0 .59.59l1.9-.38c.18-.04.34-.13.47-.26l8.1-8.1-1.7-1.7-8.1 8.1c-.13.13-.22.29-.26.47l-.38 1.9a.5.5 0 0 0 .59.59l1.9-.38c.18-.04.34-.13.47-.26l8.1-8.1Z" fill="#FF5C00"/></svg>' +
                    '</span>' +
                  '</div>';
                }).join('');
              } else {
                suppliersHtml = '<span style="color:#888;">None</span>';
              }
              detailsRow.querySelector('.details-suppliers-list').innerHTML = suppliersHtml;

              // Add click listeners for edit icons
              var editBtns = detailsRow.querySelectorAll('.edit-supplier-btn');
              editBtns.forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                  var supplierName = decodeURIComponent(this.getAttribute('data-supplier-name'));
                  // Fetch supplier data for this supplier and open the form prefilled
                  fetch('/api/supplier-details/?product_name=' + encodeURIComponent(row.product_name) + '&supplier_name=' + encodeURIComponent(supplierName))
                    .then(function(resp) { return resp.json(); })
                    .then(function(supplier) {
                      // Open the add supplier form with prefilled data
                      var formContainer = document.getElementById('supplier-form-container');
                      if (!formContainer) return;
                      // Build the form HTML (reuse logic from add supplier, but prefill values)
                      var airportOptions = '<option value="">Select Branch (Airport)</option>';
                      if (supplier.airports && supplier.airports.length > 0) {
                        supplier.airports.forEach(function(airport) {
                          var label = airport.iata_code ? `${airport.iata_code} - ${airport.city}` : airport.city;
                          airportOptions += `<option value="${airport.iata_code}"${airport.iata_code === supplier.assigned_branch ? ' selected' : ''}>${label}</option>`;
                        });
                      } else {
                        airportOptions += '<option value="">No airports found</option>';
                      }
                      var formHtml = (window.UserMarketHelpers && UserMarketHelpers.buildEditSupplierForm)
                        ? UserMarketHelpers.buildEditSupplierForm(supplier, airportOptions)
                        : (window.UserMarketData && UserMarketData.buildEditSupplierForm
                            ? UserMarketData.buildEditSupplierForm(supplier, airportOptions)
                            : '');
                      formContainer.innerHTML = formHtml;
                      var form = document.getElementById('supplier-form');
                      if (form) {
                        form.addEventListener('submit', function(e) {
                          e.preventDefault();
                          var formData = new FormData(form);
                          fetch('/edit-supplier/', {
                            method: 'POST',
                            body: formData,
                            headers: { 'X-Requested-With': 'XMLHttpRequest' }
                          })
                          .then(function(response) { return response.json(); })
                          .then(function(result) {
                            if (result.success) {
                              alert('Supplier updated successfully');
                              form.reset();
                              formContainer.innerHTML = '';
                              if (window.UserMarketExport && typeof window.UserMarketExport.renderSupplyChainTable === 'function') {
                                window.UserMarketExport.renderSupplyChainTable(supplier.product_name);
                              }
                            } else {
                              alert('Error: ' + (result.error || 'Unknown error'));
                            }
                          })
                          .catch(function() {
                            alert('Error updating supplier');
                          });
                        });
                      }
                    });
                });
              });
              // Branches
              var branchesHtml = '';
              if (data.branches && data.branches.length) {
                branchesHtml = data.branches.map(function(b) { return '<div>' + b + '</div>'; }).join('');
              } else {
                branchesHtml = '<span style="color:#888;">None</span>';
              }
              detailsRow.querySelector('.details-branches-list').innerHTML = branchesHtml;
              // Yields
              var yieldsHtml = '';
              if (data.yields && data.yields.length) {
                yieldsHtml = data.yields.map(function(y) { return '<div>' + (y || 0) + '</div>'; }).join('');
              } else {
                yieldsHtml = '<span style="color:#888;">None</span>';
              }
              detailsRow.querySelector('.details-yields-list').innerHTML = yieldsHtml;
            })
            .catch(function() {
              detailsRow.querySelector('.details-suppliers-list').innerHTML = '<span style="color:#f44336;">Failed to load</span>';
              detailsRow.querySelector('.details-branches-list').innerHTML = '';
              detailsRow.querySelector('.details-yields-list').innerHTML = '';
            });
        }
      })
      .catch(function() {
        scContainer.innerHTML = '<div style="margin-top:2rem; color:#f44336;">Failed to load supply chain summary.</div>';
      });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserMarketExport;
}
if (typeof window !== 'undefined') {
  window.UserMarketExport = UserMarketExport;
}
