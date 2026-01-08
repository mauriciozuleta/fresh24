// Always clear importTabState country on page load so dropdown shows placeholder
if (typeof window !== 'undefined') {
  try {
    var importTabState = JSON.parse(localStorage.getItem('importTabState') || '{}');
    if (importTabState.country) {
      importTabState.country = '';
      localStorage.setItem('importTabState', JSON.stringify(importTabState));
    }
  } catch (e) {}
}
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
              <option value="" disabled selected>Select Country to Analize</option>
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
          var products = data.products || [];
          var html = '<div class="products-table-wrapper">';
          html += '<table class="products-table" style="width:100%; border-collapse:collapse; margin-top:1rem;">';
          html += '<thead><tr style="background:#23272e; color:#FF5C00;">';
          html += '<th class="col-checkbox"></th>';
          html += '<th class="col-code">Code</th>';
          html += '<th>Name</th>';
          html += '<th>Type</th>';
          html += '<th>Country</th>';
          html += '<th class="col-trade-unit">Trade Unit</th>';
          html += '<th class="col-packaging">Packaging</th>';
          html += '<th class="col-currency">Currency</th>';
          html += '</tr></thead><tbody>';
          products.forEach(function(p, idx) {
            html += '<tr style="background:#181c22; color:#fff; border-bottom:1px solid #23272e;" data-country-code="' + (p.country_code || '') + '">';
            html += '<td class="col-checkbox" style="text-align:center;"><input type="checkbox" class="product-select-checkbox" data-product-code="' + p.product_code + '" style="transform:scale(1.2);" ' + (idx === 0 ? '' : '') + '></td>';
            html += '<td class="col-code" style="text-align:center;">' + p.product_code + '</td>';
            html += '<td>' + p.name + '</td>';
            html += '<td>' + p.product_type + '</td>';
            html += '<td>' + (p.country_name || '') + '</td>';
            html += '<td class="col-trade-unit" style="text-align:center;">' + p.trade_unit + '</td>';
            html += '<td class="col-packaging" style="text-align:center;">' + p.packaging + '</td>';
            html += '<td class="col-currency" style="text-align:center;">' + p.currency + '</td>';
            html += '</tr>';
          });
          html += '</tbody></table></div>';
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
                                  <div class="form-group">
                                    <label>Location</label>
                                    <input type="text" name="location" class="aircraft-form-control" required>
                                  </div>
                                  <div class="form-group">
                                    <label>Assigned Branch</label>
                                    <select name="assigned_branch" class="aircraft-form-control" required>${airportOptions}</select>
                                  </div>
                                </div>
                                <div class="aircraft-form-row three-col">
                                  <div class="form-group">
                                    <label>Crop Area</label>
                                    <input type="text" name="crop_area" class="aircraft-form-control" required>
                                  </div>
                                  <div class="form-group">
                                    <label>Crop Yield</label>
                                    <input type="text" name="crop_yield" class="aircraft-form-control" required>
                                  </div>
                                  <div class="form-group">
                                    <label>Delivery</label>
                                    <select name="delivery" id="delivery-type" class="aircraft-form-control" required>
                                      <option value="Year-round">Year-round</option>
                                      <option value="Seasonal">Seasonal</option>
                                      <option value="On Order">On Order</option>
                                      <option value="On Shelf">On Shelf</option>
                                    </select>
                                  </div>
                                  <div class="form-group">
                                    <label>Delivery time</label>
                                    <input type="text" name="delivery_time" class="aircraft-form-control" placeholder="e.g. 2 days">
                                  </div>
                                  <div class="form-group" id="ready-for-shelf-group" style="display:none;">
                                    <label>Ready for shelf (Days)</label>
                                    <input type="text" name="ready_for_shelf_days" class="aircraft-form-control" placeholder="e.g. 1">
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
                                    if (window.UserMarketData && typeof window.UserMarketData.renderSupplyChainTable === 'function') {
                                      window.UserMarketData.renderSupplyChainTable(productName);
                                    }
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
                if (window.UserMarketData && typeof window.UserMarketData.renderSupplyChainTable === 'function') {
                  var row = this.closest('tr');
                  var nameCell = row ? row.children[2] : null;
                  var selectedProductName = nameCell ? nameCell.textContent.trim() : '';
                  window.UserMarketData.renderSupplyChainTable(selectedProductName);
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
          scHtml += '<table class="products-table" style="width:100%; border-collapse:collapse; margin-top:0.5rem; text-align:center;">';
          scHtml += '<thead><tr style="background:#23272e; color:#FF5C00;">';
          scHtml += '<th style="text-align:center; padding:8px 0;">Product</th>';
          scHtml += '<th style="text-align:center; padding:8px 0;">Suppliers</th>';
          scHtml += '<th style="text-align:center; padding:8px 0;">Branches</th>';
          scHtml += '<th style="text-align:center; padding:8px 0;">Total Yield</th>';
          scHtml += '</tr></thead><tbody>';
          var zebra = 'background:#181c22;';
          scHtml += '<tr style="' + zebra + ' color:#fff; border-bottom:1px solid #23272e;">' +
            '<td style="padding:6px 8px; text-align:left;">' + row.product_name + '</td>' +
            '<td style="padding:6px 8px; text-align:center;">' + row.num_suppliers + '</td>' +
            '<td style="padding:6px 8px; text-align:center;">' + row.num_branches + '</td>' +
            '<td style="padding:6px 8px; text-align:center;">' + row.total_yield + '</td>' +
          '</tr>';
          scHtml += '<tr class="supplier-details-row" style="background:#23272e; color:#fff;">' +
            '<td style="padding:12px 8px; text-align:left;" class="details-suppliers"></td>' +
            '<td style="padding:12px 8px; text-align:center;" class="details-suppliers-list"></td>' +
            '<td style="padding:12px 8px; text-align:center;" class="details-branches-list"></td>' +
            '<td style="padding:12px 8px; text-align:center;" class="details-yields-list"></td>' +
          '</tr>';
          scHtml += '</tbody></table>';
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
                      var formHtml = `
                        <form id="supplier-form" class="aircraft-form-section" style="margin-top:1.5rem; background:#23272e; padding:1.5rem; border-radius:8px;">
                          <input type="hidden" name="supplier_id" value="${supplier.id || ''}">
                          <div class="aircraft-form-row three-col">
                            <div class="form-group">
                              <label>Product Name</label>
                              <input type="text" name="product_name" class="aircraft-form-control" required value="${supplier.product_name || ''}">
                            </div>
                            <div class="form-group">
                              <label>Supplier Name</label>
                              <input type="text" name="supplier_name" class="aircraft-form-control" required value="${supplier.supplier_name || ''}">
                            </div>
                            <div class="form-group">
                              <label>Country</label>
                              <input type="text" name="country" class="aircraft-form-control" required value="${supplier.country || ''}">
                            </div>
                            <div class="form-group">
                              <label>Location</label>
                              <input type="text" name="location" class="aircraft-form-control" required value="${supplier.location || ''}">
                            </div>
                            <div class="form-group">
                              <label>Assigned Branch</label>
                              <select name="assigned_branch" class="aircraft-form-control" required>${airportOptions}</select>
                            </div>
                          </div>
                          <div class="aircraft-form-row three-col">
                            <div class="form-group">
                              <label>Crop Area</label>
                              <input type="text" name="crop_area" class="aircraft-form-control" required value="${supplier.crop_area || ''}">
                            </div>
                            <div class="form-group">
                              <label>Crop Yield</label>
                              <input type="text" name="crop_yield" class="aircraft-form-control" required value="${supplier.crop_yield || ''}">
                            </div>
                            <div class="form-group">
                              <label>Delivery</label>
                              <select name="delivery" id="delivery-type" class="aircraft-form-control" required>
                                <option value="Year-round"${supplier.delivery === 'Year-round' ? ' selected' : ''}>Year-round</option>
                                <option value="Seasonal"${supplier.delivery === 'Seasonal' ? ' selected' : ''}>Seasonal</option>
                                <option value="On Order"${supplier.delivery === 'On Order' ? ' selected' : ''}>On Order</option>
                                <option value="On Shelf"${supplier.delivery === 'On Shelf' ? ' selected' : ''}>On Shelf</option>
                              </select>
                            </div>
                            <div class="form-group">
                              <label>Delivery time</label>
                              <input type="text" name="delivery_time" class="aircraft-form-control" placeholder="e.g. 2 days" value="${supplier.delivery_time || ''}">
                            </div>
                            <div class="form-group" id="ready-for-shelf-group" style="display:${["produce","meats","other perishable"].includes((supplier.product_type||'').toLowerCase()) ? '' : 'none'};">
                              <label>Ready for shelf (Days)</label>
                              <input type="text" name="ready_for_shelf_days" class="aircraft-form-control" placeholder="e.g. 1" value="${supplier.ready_for_shelf_days || ''}">
                            </div>
                          </div>
                          <div style="margin-top:1.5rem; text-align:right;">
                            <button type="submit" class="primary-button">Update Supplier</button>
                          </div>
                        </form>
                      `;
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
                              if (window.UserMarketData && typeof window.UserMarketData.renderSupplyChainTable === 'function') {
                                window.UserMarketData.renderSupplyChainTable(supplier.product_name);
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
  },

  renderImportTab: function(tabContent) {
    // Restore state if available
    var importTabState = {};
    try {
      importTabState = JSON.parse(localStorage.getItem('importTabState') || '{}');
    } catch (e) { importTabState = {}; }
    tabContent.innerHTML = `
      <div class="tab-content-inner">
        <h2>Import User Market Data</h2>
        <div style="margin-bottom:1.5rem; display:flex; gap:1rem; align-items:flex-end;">
          <div>
            <label for="import-country-select" style="display:block; margin-bottom:0.5rem;">Country</label>
            <select id="import-country-select" class="aircraft-form-control" style="width:120px;"></select>
          </div>
          <div>
            <label for="import-product-search" style="display:block; margin-bottom:0.5rem;">Search by Product Name</label>
            <input id="import-product-search" type="text" class="aircraft-form-control" style="min-width:220px;" placeholder="Start typing...">
          </div>
        </div>
        <div id="import-products-table-container"></div>
      </div>
    `;

    // State for filtering
    var filterState = {
      country: importTabState.country || '',
      search: importTabState.search || ''
    };

    // Fetch countries for dropdown
    fetch('/api/countries/')
      .then(function(response) { return response.json(); })
      .then(function(data) {
        var select = document.getElementById('import-country-select');
        if (!select) return;
        select.innerHTML = '<option value="" disabled selected>Select Country to Analize</option>';
        if (data.countries && data.countries.length > 0) {
          data.countries.forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c.code || c.country_code;
            opt.textContent = c.name || c.country_name;
            if (c.currency_code) {
              opt.setAttribute('data-currency', c.currency_code);
            } else if (c.currency) {
              opt.setAttribute('data-currency', c.currency);
            }
            select.appendChild(opt);
          });
        }
        // Restore country selection
        if (filterState.country) select.value = filterState.country;
        // Enhanced country change handler with unsaved data warning
        select.addEventListener('change', function(e) {
          var prevCountry = filterState.country;
          var newCountry = this.value;
          // Check if there are unsaved values
          var enteredPrices = {};
          try {
            enteredPrices = JSON.parse(localStorage.getItem('importTabEnteredPrices') || '{}');
          } catch (e) { enteredPrices = {}; }
          var hasUnsaved = Object.values(enteredPrices).some(function(val) { return val && val.trim() !== ''; });
          if (hasUnsaved) {
            // Show custom modal
            var modal = document.createElement('div');
            modal.id = 'country-change-modal';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.background = 'rgba(0,0,0,0.45)';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.zIndex = '9999';
            modal.innerHTML = '<div style="background:#23272e; color:#fff; padding:2rem 2.5rem; border-radius:10px; box-shadow:0 4px 32px #0008; max-width:400px; text-align:center;">' +
              '<div style="font-size:1.1rem; margin-bottom:1.5rem;">Updated Prices are still not saved, if you change country for market comparision, data will be erased</div>' +
              '<div style="display:flex; gap:1.5rem; justify-content:center; margin-top:1.5rem;">' +
                '<button id="cancel-country-change" class="primary-button" style="background:#888; color:#fff;">Cancel</button>' +
                '<button id="confirm-country-change" class="primary-button" style="background:#FF5C00; color:#fff;">Change Country</button>' +
              '</div>' +
            '</div>';
            document.body.appendChild(modal);
            // Cancel: revert select to previous value
            document.getElementById('cancel-country-change').onclick = function() {
              select.value = prevCountry;
              document.body.removeChild(modal);
            };
            // Confirm: clear values, update country, rerender
            document.getElementById('confirm-country-change').onclick = function() {
              localStorage.removeItem('importTabEnteredPrices');
              filterState.country = newCountry;
              localStorage.setItem('importTabState', JSON.stringify(filterState));
              document.body.removeChild(modal);
              UserMarketData.renderImportProductsTable(filterState.country, filterState.search);
            };
          } else {
            filterState.country = newCountry;
            localStorage.setItem('importTabState', JSON.stringify(filterState));
            UserMarketData.renderImportProductsTable(filterState.country, filterState.search);
          }
        });
      });

    // Product search input
    var searchInput = document.getElementById('import-product-search');
    if (searchInput) {
      // Restore search value
      if (filterState.search) searchInput.value = filterState.search;
      searchInput.addEventListener('input', function() {
        filterState.search = this.value;
        var select = document.getElementById('import-country-select');
        filterState.country = select ? select.value : '';
        localStorage.setItem('importTabState', JSON.stringify(filterState));
        UserMarketData.renderImportProductsTable(filterState.country, filterState.search);
      });
    }

    // Initial table render (empty)
    UserMarketData.renderImportProductsTable(filterState.country, filterState.search);
  },

  renderImportProductsTable: function(countryCode, searchTerm) {
    var container = document.getElementById('import-products-table-container');
    if (!container) return;
    container.innerHTML = '<div style="margin:2rem 0; text-align:center; color:#2196f3;">Loading products...</div>';
    var url = '/api/products/';
    if (countryCode) {
      url += '?country=' + encodeURIComponent(countryCode);
    }
    fetch(url)
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (!data.products || data.products.length === 0) {
          container.innerHTML = '<div style="margin:2rem 0; text-align:center; color:#f44336;">No products found.</div>';
          return;
        }
        var products = data.products || [];
        if (searchTerm && searchTerm.trim().length > 0) {
          var term = searchTerm.trim().toLowerCase();
          products = products.filter(function(p) {
            return p.name && p.name.toLowerCase().includes(term);
          });
        }
        // Restore entered values from localStorage
        var enteredPrices = {};
        try {
          enteredPrices = JSON.parse(localStorage.getItem('importTabEnteredPrices') || '{}');
        } catch (e) { enteredPrices = {}; }
        // Get selected country's currency (not used for display since currency is fixed to USD, but kept for future use)
        var selectedCountryCurrency = '';
        var countrySelect = document.getElementById('import-country-select');
        if (countrySelect && countrySelect.value) {
          var selectedOption = countrySelect.options[countrySelect.selectedIndex];
          selectedCountryCurrency = selectedOption && selectedOption.getAttribute('data-currency') ? selectedOption.getAttribute('data-currency') : '';
        }
        // Fetch saved price comparison data for the selected country and then render table + wire logic
        var countryCode = countrySelect ? countrySelect.value : '';
        fetch('/api/get-saved-price-comparison/?country_code=' + encodeURIComponent(countryCode))
          .then(function(resp) { return resp.json(); })
          .then(function(savedData) {
            var savedMap = {};
            if (savedData && savedData.results) {
              savedData.results.forEach(function(item) {
                savedMap[item.product_code] = item;
              });
            }
            var html = '<div class="products-table-wrapper">';
            html += '<table class="products-table" style="width:100%; border-collapse:collapse; margin-top:1rem;">';
            html += '<thead><tr style="background:#23272e; color:#FF5C00;">';
            html += '<th class="col-checkbox"></th>';
            html += '<th class="col-code">Code</th>';
            html += '<th>Name</th>';
            html += '<th>Type</th>';
            html += '<th>Country</th>';
            html += '<th class="col-trade-unit">Trade Unit</th>';
            html += '<th class="col-packaging">Packaging</th>';
            html += '<th class="col-currency" style="text-align:center;">Currency</th>';
            html += '<th>Last Updated Price</th>';
            html += '<th>Last Updated Date</th>';
            html += '<th>Enter New Price</th>';
            html += '</tr></thead><tbody>';
            products.forEach(function(p, idx) {
              var saved = savedMap[p.product_code] || {};
              html += '<tr style="background:#181c22; color:#fff; border-bottom:1px solid #23272e;" data-country-code="' + (p.country_code || '') + '">';
              html += '<td class="col-checkbox" style="text-align:center;"><input type="checkbox" class="product-select-checkbox" data-product-code="' + p.product_code + '" style="transform:scale(1.2);"></td>';
              html += '<td class="col-code" style="text-align:center;">' + p.product_code + '</td>';
              html += '<td>' + p.name + '</td>';
              html += '<td>' + p.product_type + '</td>';
              html += '<td>' + (p.country_name || '') + '</td>';
              html += '<td class="col-trade-unit" style="text-align:center;">' + p.trade_unit + '</td>';
              html += '<td class="col-packaging" style="text-align:center;">' + p.packaging + '</td>';
              html += '<td class="col-currency" style="text-align:center;">USD</td>';
              html += '<td style="text-align:center;">' + (saved.last_updated_price !== undefined && saved.last_updated_price !== null ? saved.last_updated_price : '-') + '</td>';
              html += '<td style="text-align:center;">' + (saved.last_updated_date ? saved.last_updated_date : '-') + '</td>';
              var priceVal = enteredPrices[p.product_code] !== undefined ? enteredPrices[p.product_code] : '';
              html += '<td style="text-align:center;"><input type="number" class="form-control form-control-sm import-new-price" data-product-code="' + p.product_code + '" style="width:90px;" placeholder="$ value" value="' + priceVal + '" /></td>';
              html += '</tr>';
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;

            // Add Save updated Prices and Search button container (flex for side-by-side buttons)
            var btnsContainer = document.createElement('div');
            btnsContainer.id = 'import-action-btns-container';
            btnsContainer.style.display = 'flex';
            btnsContainer.style.justifyContent = 'center';
            btnsContainer.style.gap = '1.5rem';
            btnsContainer.style.margin = '1.5rem 0 0.5rem 0';
            container.appendChild(btnsContainer);

            // --- Render Commercial Structure Overview table below buttons ---
            var managementDiv = document.createElement('div');
            managementDiv.id = 'import-management-table-container';
            managementDiv.style.margin = '2.5rem 0 0 0';
            managementDiv.innerHTML = '<div style="width:100%; background:#1e2227; border:2px solid #0078d4; border-radius:8px; padding:1.5rem; text-align:center;"><span style="color:#888;">Loading Commercial Structure Overview...</span></div>';
            container.appendChild(managementDiv);
            fetch('/api/get-management-table-data/')
              .then(function(r) { return r.json(); })
              .then(function(managementResponse) {
                var data = managementResponse.data || [];
                var totalProducts = managementResponse.total_products || 0;
                if (!data.length) {
                  managementDiv.innerHTML = '<span style="color:#f44336;">No management data yet. Start by selecting a region and saving info.</span>';
                  return;
                }
                var html = '<div style="width:100%; max-width:1000px; margin:0 auto; background:#1e2227; border:2px solid #0078d4; border-radius:8px; padding:1.5rem;">';
                html += '<div style="display:flex;align-items:center;gap:2rem;">';
                html += '<h3 style="margin-top:0; margin-bottom:1.5rem; color:#0078d4;">Commercial Structure Overview</h3>';
                html += '<span style="font-size:1rem;color:#FF5C00;">Total products in Portfolio: <b>' + totalProducts + '</b></span>';
                html += '</div>';
                html += '<table style="width:100%; max-width:1000px; table-layout:fixed; border-collapse:collapse; font-size:0.95rem;">';
                html += '<thead><tr style="background:#363d48;">';
                html += '<th style="padding:10px; min-width:70px; max-width:100px; width:7vw; text-align:center; border:1px solid #444;">Region</th>';
                html += '<th style="padding:10px; text-align:left; border:1px solid #444;">Regional Manager</th>';
                html += '<th style="padding:10px; text-align:left; border:1px solid #444;">Region User</th>';
                html += '<th style="padding:10px; min-width:70px; max-width:100px; width:7vw; text-align:center; border:1px solid #444;">Country</th>';
                html += '<th style="padding:10px; text-align:left; border:1px solid #444;">Country Manager</th>';
                html += '<th style="padding:10px; min-width:70px; max-width:100px; width:7vw; text-align:center; border:1px solid #444;">Country User</th>';
                html += '<th style="padding:10px; min-width:60px; max-width:80px; width:6vw; text-align:center; border:1px solid #444;">Analysis %</th>';
                html += '</tr></thead><tbody>';
                data.forEach(function(region) {
                  var regionRowspan = 0;
                  region.countries.forEach(function(country) {
                    regionRowspan += Math.max(1, country.branches.length);
                  });
                  if (regionRowspan === 0) regionRowspan = 1;
                  var firstRegionRow = true;
                  if (region.countries.length === 0) {
                    html += '<tr>';
                    html += '<td style="padding:10px; border:1px solid #444; background:#26304a; font-weight:bold; color:#0078d4;" rowspan="1">' + region.region + '</td>';
                    html += '<td style="padding:10px; border:1px solid #444; background:#26304a;" rowspan="1">' + region.regional_manager + '</td>';
                    html += '<td style="padding:10px; border:1px solid #444; background:#26304a;" rowspan="1">' + region.region_user + '</td>';
                    html += '<td style="padding:10px; border:1px solid #444; color:#888; font-style:italic;" colspan="6">No countries added yet</td>';
                    html += '</tr>';
                  } else {
                    region.countries.forEach(function(country) {
                      var countryRowspan = Math.max(1, country.branches.length);
                      var firstCountryRow = true;
                      if (country.branches.length === 0) {
                        html += '<tr>';
                        if (firstRegionRow) {
                          html += '<td style="padding:10px; min-width:70px; max-width:100px; width:7vw; text-align:center; border:1px solid #444; background:#26304a; font-weight:bold; color:#0078d4;" rowspan="' + regionRowspan + '">' + region.region + '</td>';
                          html += '<td style="padding:10px; border:1px solid #444; background:#26304a;" rowspan="' + regionRowspan + '">' + region.regional_manager + '</td>';
                          html += '<td style="padding:10px; border:1px solid #444; background:#26304a;" rowspan="' + regionRowspan + '">' + region.region_user + '</td>';
                          firstRegionRow = false;
                        }
                        html += '<td style="padding:10px; border:1px solid #444; background:#23272e; color:#4a9eff;" rowspan="1">' + country.country_name + '</td>';
                        html += '<td style="padding:10px; border:1px solid #444; background:#23272e;" rowspan="1">' + country.country_manager + '</td>';
                        html += '<td style="padding:10px; border:1px solid #444; background:#23272e;" rowspan="1">' + country.country_user + '</td>';
                        // Analysis % column for country without branches
                        html += '<td style="padding:10px; min-width:60px; max-width:80px; width:6vw; text-align:center; border:1px solid #444; background:#2d3139;">' + (country.analysis_percent || '') + '</td>';
                        html += '</tr>';
                      } else {
                        country.branches.forEach(function(branch) {
                          html += '<tr>';
                          if (firstRegionRow) {
                            html += '<td style="padding:10px; border:1px solid #444; background:#26304a; font-weight:bold; color:#0078d4;" rowspan="' + regionRowspan + '">' + region.region + '</td>';
                            html += '<td style="padding:10px; border:1px solid #444; background:#26304a;" rowspan="' + regionRowspan + '">' + region.regional_manager + '</td>';
                            html += '<td style="padding:10px; border:1px solid #444; background:#26304a;" rowspan="' + regionRowspan + '">' + region.region_user + '</td>';
                            firstRegionRow = false;
                          }
                          if (firstCountryRow) {
                            html += '<td style="padding:10px; min-width:70px; max-width:100px; width:7vw; text-align:center; border:1px solid #444; background:#23272e; color:#4a9eff;" rowspan="' + countryRowspan + '">' + country.country_name + '</td>';
                            html += '<td style="padding:10px; border:1px solid #444; background:#23272e;" rowspan="' + countryRowspan + '">' + country.country_manager + '</td>';
                            html += '<td style="padding:10px; min-width:70px; max-width:100px; width:7vw; text-align:center; border:1px solid #444; background:#23272e;" rowspan="' + countryRowspan + '">' + country.country_user + '</td>';
                            // Analysis % column, one cell per country
                            html += '<td style="padding:10px; min-width:60px; max-width:80px; width:6vw; text-align:center; border:1px solid #444; background:#2d3139;" rowspan="' + countryRowspan + '">' + (country.analysis_percent || '') + '</td>';
                            firstCountryRow = false;
                          }
                          html += '</tr>';
                        });
                      }
                    });
                  }
                });
                html += '</tbody></table></div>';
                managementDiv.innerHTML = html;
              })
              .catch(function(err) {
                managementDiv.innerHTML = '<span style="color:#f44336;">Failed to load Commercial Structure Overview.</span>';
                console && console.error && console.error('Error loading management table:', err);
              });

            // Helper to check if any price input has a value
            function anyPriceEntered() {
              return Array.from(container.querySelectorAll('.import-new-price')).some(function(input) {
                return input.value && input.value.trim() !== '';
              });
            }

            // Show/hide Save button
            function updateSaveButton() {
              var btns = document.getElementById('import-action-btns-container');
              if (!btns) return;
              var existingSaveBtn = document.getElementById('save-updated-prices-btn');
              if (existingSaveBtn) btns.removeChild(existingSaveBtn);
              if (anyPriceEntered()) {
                var saveBtn = document.createElement('button');
                saveBtn.id = 'save-updated-prices-btn';
                saveBtn.className = 'primary-button';
                saveBtn.style.fontSize = '1rem';
                saveBtn.style.padding = '0.7rem 2.5rem';
                saveBtn.textContent = 'Save updated Prices';
                saveBtn.addEventListener('click', function() {
                  var tableRows = container.querySelectorAll('tbody tr');
                  var updates = [];
                  tableRows.forEach(function(row) {
                    var input = row.querySelector('.import-new-price');
                    if (!input) return;
                    var code = input.getAttribute('data-product-code');
                    var priceVal = input.value;
                    if (code && priceVal && priceVal.trim() !== '') {
                      updates.push({
                        product_code: code,
                        product_name: row.children[2] ? row.children[2].textContent : '',
                        product_type: row.children[3] ? row.children[3].textContent : '',
                        trade_unit: row.children[5] ? row.children[5].textContent : '',
                        packaging: row.children[6] ? row.children[6].textContent : '',
                        currency: 'USD',
                        new_price: priceVal
                      });
                    }
                  });
                    // --- Add summary table below buttons ---
                    var summaryDiv = document.createElement('div');
                    summaryDiv.id = 'import-summary-table-container';
                    summaryDiv.style.margin = '2.5rem 0 0 0';
                    // Build summary table data from products and savedMap
                    var summaryHtml = '<h3 style="margin-bottom:1rem;">Portfolio Analysis Overview</h3>';
                    summaryHtml += '<table class="products-table" style="width:100%; border-collapse:collapse; margin-top:0.5rem; text-align:center;">';
                    summaryHtml += '<thead><tr style="background:#23272e; color:#FF5C00;">';
                    summaryHtml += '<th style="text-align:center; padding:8px 0;">Code</th>';
                    summaryHtml += '<th style="text-align:center; padding:8px 0;">Name</th>';
                    summaryHtml += '<th style="text-align:center; padding:8px 0;">Type</th>';
                    summaryHtml += '<th style="text-align:center; padding:8px 0;">Country</th>';
                    summaryHtml += '<th style="text-align:center; padding:8px 0;">Trade Unit</th>';
                    summaryHtml += '<th style="text-align:center; padding:8px 0;">Packaging</th>';
                    summaryHtml += '<th style="text-align:center; padding:8px 0;">Currency</th>';
                    summaryHtml += '<th style="text-align:center; padding:8px 0;">Last Updated Price</th>';
                    summaryHtml += '<th style="text-align:center; padding:8px 0;">Last Updated Date</th>';
                    summaryHtml += '<th style="text-align:center; padding:8px 0;">Portfolio Analisis %</th>';
                    summaryHtml += '</tr></thead><tbody>';
                    products.forEach(function(p) {
                      var saved = savedMap[p.product_code] || {};
                      // Portfolio Analisis %: Example calculation, can be replaced with real logic
                      var portfolioPercent = saved.last_updated_price && p.reference_price ?
                      (((parseFloat(saved.last_updated_price) / parseFloat(p.reference_price)) * 100).toFixed(2) + '%') : '-';
                      summaryHtml += '<tr style="background:#181c22; color:#fff; border-bottom:1px solid #23272e;">';
                      summaryHtml += '<td>' + p.product_code + '</td>';
                      summaryHtml += '<td>' + p.name + '</td>';
                      summaryHtml += '<td>' + p.product_type + '</td>';
                      summaryHtml += '<td>' + (p.country_name || '') + '</td>';
                      summaryHtml += '<td>' + p.trade_unit + '</td>';
                      summaryHtml += '<td>' + p.packaging + '</td>';
                      summaryHtml += '<td>USD</td>';
                      summaryHtml += '<td>' + (saved.last_updated_price !== undefined && saved.last_updated_price !== null ? saved.last_updated_price : '-') + '</td>';
                      summaryHtml += '<td>' + (saved.last_updated_date ? saved.last_updated_date : '-') + '</td>';
                      summaryHtml += '<td>' + portfolioPercent + '</td>';
                      summaryHtml += '</tr>';
                    });
                    summaryHtml += '</tbody></table>';
                    summaryDiv.innerHTML = summaryHtml;
                    container.appendChild(summaryDiv);
                  var cs = document.getElementById('import-country-select');
                  var cc = cs ? cs.value : '';
                  if (!cc) {
                    alert('Please select a country before saving.');
                    return;
                  }
                  if (updates.length === 0) {
                    alert('No prices entered to save.');
                    return;
                  }
                  saveBtn.disabled = true;
                  saveBtn.textContent = 'Saving...';
                  fetch('/api/save-price-comparison/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates: updates, country_code: cc })
                  })
                  .then(function(resp) { return resp.json(); })
                  .then(function(data) {
                    if (data && data.results && data.results.every(function(r) { return r.success; })) {
                      localStorage.removeItem('importTabEnteredPrices');
                      UserMarketData.renderImportProductsTable(cc, searchTerm);
                      alert('Prices saved successfully!');
                    } else {
                      alert('Some prices could not be saved. Please try again.');
                      saveBtn.disabled = false;
                      saveBtn.textContent = 'Save updated Prices';
                    }
                  })
                  .catch(function() {
                    alert('Error saving prices. Please try again.');
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save updated Prices';
                  });
                });
                btns.insertBefore(saveBtn, btns.firstChild);
              }
            }

            // Save entered values and update Save button on input
            var priceInputs = container.querySelectorAll('.import-new-price');
            priceInputs.forEach(function(input) {
              input.addEventListener('input', function() {
                var code = this.getAttribute('data-product-code');
                enteredPrices[code] = this.value;
                localStorage.setItem('importTabEnteredPrices', JSON.stringify(enteredPrices));
                updateSaveButton();
              });
            });

            // Only allow one checkbox to be selected at a time and update search button
            var checkboxes = container.querySelectorAll('.product-select-checkbox');

            function updateSearchButton() {
              var checked = container.querySelector('.product-select-checkbox:checked');
              var btn = document.getElementById('import-search-btn');
              var countryLabel = '';
              var cs = document.getElementById('import-country-select');
              if (cs) {
                var opt = cs.options[cs.selectedIndex];
                countryLabel = opt && opt.value ? opt.textContent : '';
              }
              var productName = '';
              if (checked) {
                var row = checked.closest('tr');
                if (row) productName = row.children[2].textContent;
              }
              if (btn) {
                if (checked && countryLabel) {
                  btn.disabled = false;
                  btn.textContent = 'Search for ' + productName + ' in ' + countryLabel;
                } else {
                  btn.disabled = true;
                  btn.textContent = 'Search';
                }
              }
            }

            checkboxes.forEach(function(checkbox) {
              checkbox.addEventListener('change', function() {
                if (this.checked) {
                  checkboxes.forEach(function(cb) {
                    if (cb !== checkbox) cb.checked = false;
                  });
                }
                updateSearchButton();
              });
            });

            // Create Search button and iframe container
            var searchBtn = document.createElement('button');
            searchBtn.id = 'import-search-btn';
            searchBtn.className = 'primary-button';
            searchBtn.style.fontSize = '1rem';
            searchBtn.style.padding = '0.7rem 2.5rem';
            searchBtn.disabled = true;
            searchBtn.textContent = 'Search';
            btnsContainer.appendChild(searchBtn);

            var iframeDiv = document.createElement('div');
            iframeDiv.id = 'import-search-iframe-container';
            iframeDiv.style.margin = '1.5rem 0 0 0';
            container.appendChild(iframeDiv);

            searchBtn.addEventListener('click', function() {
              var checked = container.querySelector('.product-select-checkbox:checked');
              var cs = document.getElementById('import-country-select');
              var countryLabel = '';
              if (cs) {
                var opt = cs.options[cs.selectedIndex];
                countryLabel = opt && opt.value ? opt.textContent : '';
              }
              var productName = '';
              if (checked) {
                var row = checked.closest('tr');
                if (row) productName = row.children[2].textContent;
              }
              if (productName && countryLabel) {
                var prompt = encodeURIComponent(productName + ' price in ' + countryLabel + ' supermarket USD');
                var url = 'https://www.bing.com/search?q=' + prompt;
                iframeDiv.innerHTML = '<iframe src="' + url + '" style="width:100%; height:400px; border:1px solid #2196f3; border-radius:8px; background:#fff;"></iframe>';
              }
            });

            // Initial state
            updateSaveButton();
            updateSearchButton();
          });

        // Clear entered prices if user closes the tab or refreshes the browser (global handlers)
        if (!window._importTabPersistenceHandlerAdded) {
          window._importTabPersistenceHandlerAdded = true;
          window.addEventListener('beforeunload', function() {
            localStorage.removeItem('importTabEnteredPrices');
          });
        }
        if (typeof window !== 'undefined') {
          if (!window._importTabCloseHandlerAdded) {
            window._importTabCloseHandlerAdded = true;
            window.addEventListener('importTabClosed', function() {
              localStorage.removeItem('importTabEnteredPrices');
            });
          }
        }
      });

  }
};

// Export for module usage and attach to window for browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserMarketData;
}
if (typeof window !== 'undefined') {
  window.UserMarketData = UserMarketData;
}
