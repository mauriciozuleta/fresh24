// Admin Market Analysis tab module
// Responsible for rendering the Market Analysis tab UI and wiring basic interactions.

window.AdminMarketAnalysis = (function() {
  function renderMarketAnalysisTab(tabContent) {
    if (!tabContent) return;

    var html = [
      '<div class="tab-content-inner">',
      '  <h2>Market Analysis</h2>',
      '  <div style="margin-bottom:1.5rem;">',
      '    <label for="market-analysis-country-select" style="display:block; margin-bottom:0.5rem;">Country</label>',
      '    <select id="market-analysis-country-select" class="aircraft-form-control" style="min-width:180px;"></select>',
      '  </div>',
      '  <div id="market-analysis-supermarket-dropdown-container" style="min-width:200px; display:flex; flex-direction:column; margin-bottom:1.5rem;">',
      '    <label for="market-analysis-supermarket-select" style="display:block; margin-bottom:0.5rem;">Supermarket</label>',
      '    <select id="market-analysis-supermarket-select" class="aircraft-form-control" style="min-width:180px;"></select>',
      '  </div>',
      '  <div style="display:flex; align-items:flex-end; gap:1.5rem; margin-bottom:1rem; flex-wrap:wrap;">',
      '    <div style="flex:0 0 180px;">',
      '      <label for="market-analysis-category-select" style="display:block; margin-bottom:0.5rem;">Category</label>',
      '      <select id="market-analysis-category-select" class="aircraft-form-control" style="min-width:160px; width:100%;">',
      '        <option value="search new">search new</option>',
      '        <option value="beef">beef</option>',
      '        <option value="pork">pork</option>',
      '        <option value="chicken">chicken</option>',
      '        <option value="lamb">lamb</option>',
      '        <option value="fruits">fruits</option>',
      '        <option value="vegetables">vegetables</option>',
      '        <option value="dairy">dairy</option>',
      '        <option value="cheese">cheese</option>',
      '        <option value="nuts">nuts</option>',
      '      </select>',
      '    </div>',
      '    <div style="flex:0 0 220px;">',
      '      <label for="market-analysis-category-value" style="display:block; margin-bottom:0.5rem;">Value</label>',
      '      <input type="text" id="market-analysis-category-value" class="aircraft-form-control" style="min-width:160px; width:100%;" />',
      '    </div>',
      '    <div style="flex:0 0 120px; align-self:flex-end;">',
      '      <button id="market-analysis-search-btn" class="primary-button" style="width:100%;">search</button>',
      '    </div>',
      '  </div>',
      '  <div id="market-analysis-summary" style="margin-bottom:1rem; font-size:0.9rem; color:#b0bec5;"></div>',
      '  <div id="market-analysis-content"></div>',
      '</div>'
    ].join('');

    tabContent.innerHTML = html;

    var countrySelect = document.getElementById('market-analysis-country-select');
    var supermarketDropdownContainer = document.getElementById('market-analysis-supermarket-dropdown-container');
    var supermarketSelect = document.getElementById('market-analysis-supermarket-select');
    var supermarketLabel = supermarketDropdownContainer ? supermarketDropdownContainer.querySelector('label') : null;
    var categorySelect = document.getElementById('market-analysis-category-select');
    var valueInput = document.getElementById('market-analysis-category-value');
    var searchButton = document.getElementById('market-analysis-search-btn');
    var resultsContainer = document.getElementById('market-analysis-content');
    var summaryContainer = document.getElementById('market-analysis-summary');
    var summaryData = null; // will hold mapping domain -> categories

    function updateValueInput() {
      if (!categorySelect || !valueInput) return;
      var val = categorySelect.value;
      if (val === 'search new') {
        valueInput.value = '';
        valueInput.readOnly = false;
        valueInput.placeholder = 'Enter search term...';
      } else {
        valueInput.value = val;
        valueInput.readOnly = true;
        valueInput.placeholder = '';
      }
    }

    if (categorySelect) {
      categorySelect.addEventListener('change', updateValueInput);
      updateValueInput();
    }

    // Load summary of existing raw CSV data and tie it to the selected scraper
    function renderSummaryForSelectedScraper() {
      if (!summaryContainer || !summaryData || !supermarketSelect) return;
      var selectedOption = supermarketSelect.options[supermarketSelect.selectedIndex];
      if (!selectedOption) {
        summaryContainer.textContent = '';
        return;
      }
      var text = selectedOption.textContent || '';
      var match = text.match(/\(([^)]+)\)\s*$/); // extract domain inside parentheses
      if (!match) {
        summaryContainer.textContent = '';
        return;
      }
      var domain = match[1];
      var cats = (summaryData[domain] || []).slice();
      if (!cats.length) {
        summaryContainer.textContent = '';
        return;
      }
      var niceCats;
      if (cats.length === 1) {
        niceCats = cats[0];
      } else if (cats.length === 2) {
        niceCats = cats[0] + ' and ' + cats[1];
      } else {
        niceCats = cats.slice(0, -1).join(', ') + ', and ' + cats[cats.length - 1];
      }
      summaryContainer.textContent = 'Raw data from ' + domain + ' for ' + niceCats + ' are available.';
    }

    if (summaryContainer) {
      fetch('/api/scrape-summary/')
        .then(function(response) { return response.json(); })
        .then(function(data) {
          summaryData = data.summary || {};
          renderSummaryForSelectedScraper();
        })
        .catch(function(err) {
          console.warn('Error loading scrape summary for Market Analysis:', err);
        });
    }

    // Fetch countries for dropdown from CountryInfo (unique countries)
    if (countrySelect) {
      fetch('/api/countries-in-countryinfo/')
        .then(function(response) { return response.json(); })
        .then(function(data) {
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

          function updateSupermarketDropdown() {
            if (!supermarketDropdownContainer || !supermarketSelect || !supermarketLabel) return;
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
                    var label = s.display_name;
                    if (s.url) {
                      label += ' (' + s.url.replace(/^https?:\/\//, '').replace(/\/$/, '') + ')';
                    }
                    opt.textContent = label;
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

            // After updating options, refresh the summary for the currently
            // selected scraper (if any and if summary data is loaded).
            renderSummaryForSelectedScraper();
          }

          countrySelect.addEventListener('change', updateSupermarketDropdown);
          supermarketSelect.addEventListener('change', renderSummaryForSelectedScraper);
          updateSupermarketDropdown();
        })
        .catch(function(err) {
          console.error('Error loading countries for Market Analysis:', err);
        });
    }

    if (searchButton) {
      searchButton.addEventListener('click', function() {
        if (!countrySelect || !supermarketSelect || !valueInput) return;
        var country = countrySelect.value;
        var supermarket = supermarketSelect.value;
        var query = (valueInput.value || '').trim();
        if (!country || !supermarket || !query) {
          if (resultsContainer) {
            resultsContainer.innerHTML = '<p style="color:#f44336;">Please select a country, supermarket, and enter a value.</p>';
          }
          return;
        }
        // Placeholder: backend integration for actual market analysis/search can be added here.
        if (resultsContainer) {
          resultsContainer.innerHTML = '<p style="color:#2196f3;">Search prepared for ' + query + ' at ' + supermarket + ' (' + country + ').</p>';
        }
      });
    }
  }

  return {
    renderMarketAnalysisTab: renderMarketAnalysisTab
  };
})();
