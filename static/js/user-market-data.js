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
// Orchestrates User Market Data tabs and delegates to feature modules

const UserMarketData = {
  // High-level API used by templates / app-core to render Export tab
  renderExportTab: function(tabContent) {
    if (typeof window !== 'undefined' && window.UserMarketExport &&
        typeof window.UserMarketExport.renderExportTab === 'function') {
      window.UserMarketExport.renderExportTab(tabContent);
    } else if (typeof console !== 'undefined' && console.warn) {
      console.warn('UserMarketExport.renderExportTab is not available.');
    }
  },

  // Delegate supply chain summary rendering to the Export module
  renderSupplyChainTable: function(productName) {
    if (typeof window !== 'undefined' && window.UserMarketExport &&
        typeof window.UserMarketExport.renderSupplyChainTable === 'function') {
      window.UserMarketExport.renderSupplyChainTable(productName);
    } else if (typeof console !== 'undefined' && console.warn) {
      console.warn('UserMarketExport.renderSupplyChainTable is not available.');
    }
  },

  // Delegate Import tab rendering to the dedicated module
  renderImportTab: function(tabContent) {
    if (typeof window !== 'undefined' && window.UserMarketImport &&
        typeof window.UserMarketImport.renderImportTab === 'function') {
      window.UserMarketImport.renderImportTab(tabContent);
    } else if (typeof console !== 'undefined' && console.warn) {
      console.warn('UserMarketImport.renderImportTab is not available.');
    }
  },

  // Kept for backwards compatibility; delegates to Import module
  // Note: current Import implementation ignores searchTerm.
  renderImportProductsTable: function(countryCode, searchTerm) {
    if (typeof window !== 'undefined' && window.UserMarketImport &&
        typeof window.UserMarketImport.renderProductsTable === 'function') {
      window.UserMarketImport.renderProductsTable(countryCode || '');
    } else if (typeof console !== 'undefined' && console.warn) {
      console.warn('UserMarketImport.renderProductsTable is not available.');
    }
  },

  // Backwards-compatible accessors that forward to UserMarketHelpers if needed.
  buildProductsTable: function(products) {
    if (typeof window !== 'undefined' && window.UserMarketHelpers &&
        typeof window.UserMarketHelpers.buildProductsTable === 'function') {
      return window.UserMarketHelpers.buildProductsTable(products);
    }
    return '';
  },

  buildAddSupplierForm: function(productName, country, airportOptions) {
    if (typeof window !== 'undefined' && window.UserMarketHelpers &&
        typeof window.UserMarketHelpers.buildAddSupplierForm === 'function') {
      return window.UserMarketHelpers.buildAddSupplierForm(productName, country, airportOptions);
    }
    return '';
  },

  buildSupplyChainTableHTML: function(row) {
    if (typeof window !== 'undefined' && window.UserMarketHelpers &&
        typeof window.UserMarketHelpers.buildSupplyChainTableHTML === 'function') {
      return window.UserMarketHelpers.buildSupplyChainTableHTML(row);
    }
    return '';
  },

  buildEditSupplierForm: function(supplier, airportOptions) {
    if (typeof window !== 'undefined' && window.UserMarketHelpers &&
        typeof window.UserMarketHelpers.buildEditSupplierForm === 'function') {
      return window.UserMarketHelpers.buildEditSupplierForm(supplier, airportOptions);
    }
    return '';
  }
};

// Export for module usage and attach to window for browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserMarketData;
}
if (typeof window !== 'undefined') {
  window.UserMarketData = UserMarketData;
}
