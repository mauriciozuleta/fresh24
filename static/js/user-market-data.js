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
          <button id="add-product-btn" class="primary-button" style="margin-left:2rem; height:2.5rem;">Add Product</button>
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
          var html = '<table class="products-table" style="width:100%; border-collapse:collapse; margin-top:1rem;">';
          html += '<thead><tr style="background:#23272e; color:#FF5C00;">';
          html += '<th></th><th>Code</th><th>Name</th><th>Type</th><th>Country</th><th>Trade Unit</th><th>FCA Cost</th><th>Packaging</th><th>Currency</th></tr></thead><tbody>';
          data.products.forEach(function(p, idx) {
            html += `<tr style="background:#181c22; color:#fff; border-bottom:1px solid #23272e;">
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
          html += '</tbody></table>';
          container.innerHTML = html;
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
