// user-market-helpers.js
// Shared helper functions for User Market Data (Export / Import tabs).

const UserMarketHelpers = {
  buildProductsTable: function(products) {
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
    html += '</tr></thead><tbody>';

    (products || []).forEach(function(p, idx) {
      html += '<tr style="background:#181c22; color:#fff; border-bottom:1px solid #23272e;"' +
              ' data-country-code="' + (p.country_code || '') + '"' +
              ' data-country-name="' + (p.country_name || '') + '">';
      html += '<td class="col-checkbox" style="text-align:center;">' +
              '<input type="checkbox" class="product-select-checkbox" data-product-code="' + p.product_code + '"' +
              ' style="transform:scale(1.2);" ' + (idx === 0 ? '' : '') + '></td>';
      html += '<td class="col-code" style="text-align:center;">' + p.product_code + '</td>';
      html += '<td>' + p.name + '</td>';
      html += '<td>' + p.product_type + '</td>';
      html += '<td>' + (p.country_name || '') + '</td>';
      html += '<td class="col-trade-unit" style="text-align:center;">' + p.trade_unit + '</td>';
      html += '<td class="col-packaging" style="text-align:center;">' + (p.packaging || '') + '</td>';
      html += '<td class="col-currency" style="text-align:center;">USD</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    return html;
  },

  buildAddSupplierForm: function(productName, country, airportOptions) {
    return (
      '<form id="supplier-form" class="aircraft-form-section" style="margin-top:1.5rem; background:#23272e; padding:1.5rem; border-radius:8px;">' +
        '<div class="aircraft-form-row three-col">' +
          '<div class="form-group">' +
            '<label>Product Name</label>' +
            '<input type="text" name="product_name" class="aircraft-form-control" required value="' + (productName || '') + '">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Supplier Name</label>' +
            '<input type="text" name="supplier_name" class="aircraft-form-control" required>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Country</label>' +
            '<input type="text" name="country" class="aircraft-form-control" required value="' + (country || '') + '">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Location</label>' +
            '<input type="text" name="location" class="aircraft-form-control" required>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Assigned Branch</label>' +
            '<select name="assigned_branch" class="aircraft-form-control" required>' + (airportOptions || '') + '</select>' +
          '</div>' +
        '</div>' +
        '<div class="aircraft-form-row three-col">' +
          '<div class="form-group">' +
            '<label>Crop Area</label>' +
            '<input type="text" name="crop_area" class="aircraft-form-control" required>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Crop Yield</label>' +
            '<input type="text" name="crop_yield" class="aircraft-form-control" required>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Delivery</label>' +
            '<select name="delivery" id="delivery-type" class="aircraft-form-control" required>' +
              '<option value="Year-round">Year-round</option>' +
              '<option value="Seasonal">Seasonal</option>' +
              '<option value="On Order">On Order</option>' +
              '<option value="On Shelf">On Shelf</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Delivery time</label>' +
            '<input type="text" name="delivery_time" class="aircraft-form-control" placeholder="e.g. 2 days">' +
          '</div>' +
          '<div class="form-group" id="ready-for-shelf-group" style="display:none;">' +
            '<label>Ready for shelf (Days)</label>' +
            '<input type="text" name="ready_for_shelf_days" class="aircraft-form-control" placeholder="e.g. 1">' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:1.5rem; text-align:right;">' +
          '<button type="submit" class="primary-button">Add to supply chain</button>' +
        '</div>' +
      '</form>'
    );
  },

  buildSupplyChainTableHTML: function(row) {
    if (!row) return '';
    var html = '';
    html += '<table class="products-table" style="width:100%; border-collapse:collapse; margin-top:0.5rem; text-align:center;">';
    html += '<thead><tr style="background:#23272e; color:#FF5C00;">';
    html += '<th style="text-align:center; padding:8px 0;">Product</th>';
    html += '<th style="text-align:center; padding:8px 0;">Suppliers</th>';
    html += '<th style="text-align:center; padding:8px 0;">Branches</th>';
    html += '<th style="text-align:center; padding:8px 0;">Total Yield</th>';
    html += '</tr></thead><tbody>';
    var zebra = 'background:#181c22;';
    html += '<tr style="' + zebra + ' color:#fff; border-bottom:1px solid #23272e;">' +
              '<td style="padding:6px 8px; text-align:left;">' + (row.product_name || '') + '</td>' +
              '<td style="padding:6px 8px; text-align:center;">' + (row.num_suppliers || 0) + '</td>' +
              '<td style="padding:6px 8px; text-align:center;">' + (row.num_branches || 0) + '</td>' +
              '<td style="padding:6px 8px; text-align:center;">' + (row.total_yield || 0) + '</td>' +
            '</tr>';
    html += '<tr class="supplier-details-row" style="background:#23272e; color:#fff;">' +
              '<td style="padding:12px 8px; text-align:left;" class="details-suppliers"></td>' +
              '<td style="padding:12px 8px; text-align:center;" class="details-suppliers-list"></td>' +
              '<td style="padding:12px 8px; text-align:center;" class="details-branches-list"></td>' +
              '<td style="padding:12px 8px; text-align:center;" class="details-yields-list"></td>' +
            '</tr>';
    html += '</tbody></table>';
    return html;
  },

  buildEditSupplierForm: function(supplier, airportOptions) {
    supplier = supplier || {};
    var prodType = (supplier.product_type || '').toLowerCase();
    var showReady = ["produce", "meats", "other perishable"].indexOf(prodType) !== -1;
    return (
      '<form id="supplier-form" class="aircraft-form-section" style="margin-top:1.5rem; background:#23272e; padding:1.5rem; border-radius:8px;">' +
        '<input type="hidden" name="supplier_id" value="' + (supplier.id || '') + '">' +
        '<div class="aircraft-form-row three-col">' +
          '<div class="form-group">' +
            '<label>Product Name</label>' +
            '<input type="text" name="product_name" class="aircraft-form-control" required value="' + (supplier.product_name || '') + '">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Supplier Name</label>' +
            '<input type="text" name="supplier_name" class="aircraft-form-control" required value="' + (supplier.supplier_name || '') + '">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Country</label>' +
            '<input type="text" name="country" class="aircraft-form-control" required value="' + (supplier.country || '') + '">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Location</label>' +
            '<input type="text" name="location" class="aircraft-form-control" required value="' + (supplier.location || '') + '">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Assigned Branch</label>' +
            '<select name="assigned_branch" class="aircraft-form-control" required>' + (airportOptions || '') + '</select>' +
          '</div>' +
        '</div>' +
        '<div class="aircraft-form-row three-col">' +
          '<div class="form-group">' +
            '<label>Crop Area</label>' +
            '<input type="text" name="crop_area" class="aircraft-form-control" required value="' + (supplier.crop_area || '') + '">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Crop Yield</label>' +
            '<input type="text" name="crop_yield" class="aircraft-form-control" required value="' + (supplier.crop_yield || '') + '">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Delivery</label>' +
            '<select name="delivery" id="delivery-type" class="aircraft-form-control" required>' +
              '<option value="Year-round"' + (supplier.delivery === 'Year-round' ? ' selected' : '') + '>Year-round</option>' +
              '<option value="Seasonal"' + (supplier.delivery === 'Seasonal' ? ' selected' : '') + '>Seasonal</option>' +
              '<option value="On Order"' + (supplier.delivery === 'On Order' ? ' selected' : '') + '>On Order</option>' +
              '<option value="On Shelf"' + (supplier.delivery === 'On Shelf' ? ' selected' : '') + '>On Shelf</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Delivery time</label>' +
            '<input type="text" name="delivery_time" class="aircraft-form-control" placeholder="e.g. 2 days" value="' + (supplier.delivery_time || '') + '">' +
          '</div>' +
          '<div class="form-group" id="ready-for-shelf-group" style="display:' + (showReady ? '' : 'none') + ';">' +
            '<label>Ready for shelf (Days)</label>' +
            '<input type="text" name="ready_for_shelf_days" class="aircraft-form-control" placeholder="e.g. 1" value="' + (supplier.ready_for_shelf_days || '') + '">' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:1.5rem; text-align:right;">' +
          '<button type="submit" class="primary-button">Update Supplier</button>' +
        '</div>' +
      '</form>'
    );
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserMarketHelpers;
}
if (typeof window !== 'undefined') {
  window.UserMarketHelpers = UserMarketHelpers;
}
