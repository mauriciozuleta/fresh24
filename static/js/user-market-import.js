// user-market-import.js
// Handles Import tab: product list for imports.

const UserMarketImport = {
  renderImportTab: function(tabContent) {
    tabContent.innerHTML = `
      <div class="tab-content-inner">
        <h2>Competitive Prices Import</h2>
        <div style="margin-bottom:1.5rem;">
          <label for="import-country-select" style="display:block; margin-bottom:0.5rem;">Country</label>
          <select id="import-country-select" class="aircraft-form-control" style="min-width:180px;"></select>
        </div>
        <div id="import-products-table-container"></div>
        <div style="margin-top:2rem;">
          <h5>Manual Price Search</h5>
          <iframe id="search-iframe" src="https://www.bing.com" title="Manual Price Search" style="width:100%; height:400px; border:1px solid #2196f3; border-radius:8px; background:#fff;"></iframe>
        </div>
      </div>
    `;

    // Fetch countries for dropdown
    fetch('/api/countries/')
      .then(function(response) { return response.json(); })
      .then(function(data) {
        var select = document.getElementById('import-country-select');
        if (!select) return;
        select.innerHTML = '<option value="">Select Country</option>';
        if (data.countries && data.countries.length > 0) {
          data.countries.forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c.code || c.country_code;
            opt.textContent = c.name || c.country_name;
            select.appendChild(opt);
          });
        }
        select.addEventListener('change', function() {
          UserMarketImport.renderProductsTable(this.value);
        });
      });
  },

  renderProductsTable: function(countryCode) {
    var container = document.getElementById('import-products-table-container');
    if (!container) return;
    container.innerHTML = '<div style="margin:2rem 0; text-align:center; color:#2196f3;">Loading products...</div>';
    fetch('/api/products/?country=' + encodeURIComponent(countryCode))
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (!data.products || data.products.length === 0) {
          container.innerHTML = '<div style="margin:2rem 0; text-align:center; color:#f44336;">No products found.</div>';
          return;
        }
        var html = '<div class="products-table-wrapper">';
        html += '<table class="products-table" id="products-table" style="width:100%; border-collapse:collapse; margin-top:1rem;">';
        html += '<thead><tr>';
        html += '<th class="col-code">ID</th>';
        html += '<th>Name</th>';
        html += '<th>Origin</th>';
        html += '<th class="col-trade-unit">Trade Unit</th>';
        html += '<th>Updated</th>';
        html += '<th>Price to Compare</th>';
        html += '<th>Action</th>';
        html += '<th>A.I. Result</th>';
        html += '<th>Price Accuracy</th>';
        html += '</tr></thead><tbody>';
        data.products.forEach(function(product) {
          html += '<tr>';
          html += '<td class="col-code">' + (product.product_code || '') + '</td>';
          html += '<td>' + (product.name || '') + '</td>';
          html += '<td>' + (product.origin || '') + '</td>';
          html += '<td class="col-trade-unit">' + (product.trade_unit || '') + '</td>';
          html += '<td><span id="updated-' + product.id + '">' + (product.updated_date || '-') + '</span></td>';
          html += '<td>';
          html +=   '<input type="text" class="form-control form-control-sm" placeholder="$ value" style="width:80px;" id="input-' + product.id + '" value="' + (product.price_to_compare || '') + '" />';
          html +=   '<div style="font-size:0.65rem;">';
          html +=     '<input type="radio" name="source-' + product.id + '" id="ai-source-' + product.id + '" value="AI" style="margin-top:1px;width:10px;height:10px;">';
          html +=     '<label for="ai-source-' + product.id + '">A.I</label>';
          html +=     '<input type="radio" name="source-' + product.id + '" id="manual-source-' + product.id + '" value="Manual" style="margin-top:1px;width:10px;height:10px;margin-left:10px;">';
          html +=     '<label for="manual-source-' + product.id + '">M</label>';
          html +=   '</div>';
          html +=   '<div class="copilot-suggestions" id="copilot-' + product.id + '"></div>';
          html += '</td>';
          html += '<td><button class="btn btn-sm btn-primary py-1 px-2" style="font-size:0.8rem;" onclick="UserMarketImport.combinedSearch(' + product.id + ', \'' + (product.name || '') + '\', \'' + (product.origin || '') + '\')">Search & AI</button></td>';
          html += '<td><span id="ai-result-' + product.id + '">-</span></td>';
          html += '<td><span id="price-accuracy-' + product.id + '">-</span></td>';
          html += '</tr>';
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
      });
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
