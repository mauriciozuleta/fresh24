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
      '    <div id="market-analysis-subcategory-container" style="flex:0 0 180px; display:none;">',
      '      <label for="market-analysis-subcategory-select" style="display:block; margin-bottom:0.5rem;">Subcategory</label>',
      '      <select id="market-analysis-subcategory-select" class="aircraft-form-control" style="min-width:160px; width:100%;"></select>',
      '    </div>',
      '    <div style="flex:0 0 220px;">',
      '      <label for="market-analysis-category-value" style="display:block; margin-bottom:0.5rem;">Value</label>',
      '      <input type="text" id="market-analysis-category-value" class="aircraft-form-control" style="min-width:160px; width:100%;" />',
      '    </div>',
      '    <div style="flex:0 0 120px; align-self:flex-end;">',
      '      <button id="market-analysis-search-btn" class="primary-button" style="width:100%;">search</button>',
      '    </div>',
      '  </div>',
      '  <div id="market-analysis-summary" style="margin-bottom:0.25rem; font-size:0.9rem; color:#b0bec5;"></div>',
      '  <div id="market-analysis-summary-details" style="margin-bottom:0.75rem; font-size:0.85rem; color:#e0f7fa;"></div>',
      '  <div id="market-analysis-table-wrapper" style="max-height:480px; overflow-y:auto; border-radius:4px; border:1px solid #27496d;">',
      '    <table id="market-analysis-results-table" class="market-analysis-table" style="width:100%; border-collapse:collapse; background:#142850;color:#fff;">',
      '      <thead>',
      '        <tr style="background:#27496d;">',
      '          <th style="padding:6px 8px; border-bottom:1px solid #27496d; font-weight:normal; color:#fff; text-align:left; position:sticky; top:0; z-index:2; background:#27496d;">Name</th>',
      '          <th style="padding:6px 8px; border-bottom:1px solid #27496d; font-weight:normal; color:#fff; text-align:left; position:sticky; top:0; z-index:2; background:#27496d;">Price</th>',
      '          <th style="padding:6px 8px; border-bottom:1px solid #27496d; font-weight:normal; color:#fff; text-align:left; position:sticky; top:0; z-index:2; background:#27496d;">Description</th>',
      '          <th style="padding:6px 8px; border-bottom:1px solid #27496d; font-weight:normal; color:#fff; text-align:left; position:sticky; top:0; z-index:2; background:#27496d;">URL</th>',
      '        </tr>',
      '      </thead>',
      '      <tbody></tbody>',
      '    </table>',
      '  </div>',
      '  <div id="market-analysis-content"></div>',
      '</div>'
    ].join('');

    tabContent.innerHTML = html;

    var countrySelect = document.getElementById('market-analysis-country-select');
    var supermarketDropdownContainer = document.getElementById('market-analysis-supermarket-dropdown-container');
    var supermarketSelect = document.getElementById('market-analysis-supermarket-select');
    var supermarketLabel = supermarketDropdownContainer ? supermarketDropdownContainer.querySelector('label') : null;
    var categorySelect = document.getElementById('market-analysis-category-select');
    var subcategoryContainer = document.getElementById('market-analysis-subcategory-container');
    var subcategorySelect = document.getElementById('market-analysis-subcategory-select');
    var valueInput = document.getElementById('market-analysis-category-value');
    var searchButton = document.getElementById('market-analysis-search-btn');
    var resultsContainer = document.getElementById('market-analysis-content');
    var summaryContainer = document.getElementById('market-analysis-summary');
    var summaryDetailsContainer = document.getElementById('market-analysis-summary-details');
    var resultsTable = document.getElementById('market-analysis-results-table');
    var resultsTbody = resultsTable ? resultsTable.querySelector('tbody') : null;
    var summaryData = null; // will hold mapping domain -> categories

    // Navbar-based categories for ShopNDrop (sxm_shopndrop), loaded
    // dynamically from the backend once and then cached.
    // Structure: { "Fruits & Vegetables": ["Apple", "Banana", ...], ... }
    var shopnDropCategoryMap = null;

    var defaultCategoryOptionsHtml = categorySelect ? categorySelect.innerHTML : '';

    function isShopnDropSelected() {
      return !!(supermarketSelect && supermarketSelect.value === 'sxm_shopndrop');
    }

    function ensureShopnDropCategoriesLoaded(callback) {
      if (shopnDropCategoryMap) {
        if (typeof callback === 'function') callback();
        return;
      }
      fetch('/api/shopndrop-categories/')
        .then(function(resp) { return resp.json(); })
        .then(function(data) {
          shopnDropCategoryMap = {};
          var cats = (data && data.categories) || [];
          cats.forEach(function(entry) {
            var top = entry.top || entry.Top;
            var subs = entry.subcategories || entry.Subcategories || [];
            if (!top) return;
            shopnDropCategoryMap[top] = subs.slice();
          });
          if (typeof callback === 'function') callback();
        })
        .catch(function(err) {
          console.error('Error loading ShopNDrop navbar categories:', err);
          shopnDropCategoryMap = {};
          if (typeof callback === 'function') callback();
        });
    }

    function populateShopnDropCategories() {
      if (!categorySelect || !subcategorySelect) return;
      if (!shopnDropCategoryMap) return;
      var tops = Object.keys(shopnDropCategoryMap).sort(function(a, b) {
        return a.toLowerCase() < b.toLowerCase() ? -1 : (a.toLowerCase() > b.toLowerCase() ? 1 : 0);
      });
      categorySelect.innerHTML = tops.map(function(label) {
        return '<option value="' + label + '">' + label + '</option>';
      }).join('');
      populateShopnDropSubcategories();
    }

    function populateShopnDropSubcategories() {
      if (!categorySelect || !subcategorySelect || !shopnDropCategoryMap) return;
      var top = categorySelect.value || '';
      var subs = shopnDropCategoryMap[top] || [];
      subcategorySelect.innerHTML = subs.map(function(label) {
        return '<option value="' + label + '">' + label + '</option>';
      }).join('');
    }

    function updateValueInput() {
      if (!categorySelect || !valueInput) return;

      if (isShopnDropSelected()) {
        var top = categorySelect.value || '';
        var sub = (subcategorySelect && subcategorySelect.value) ? subcategorySelect.value : '';
        // For ShopNDrop, query must be "Top / Sub" to match the
        // navbar category map used by the scraper.
        if (top && sub) {
          valueInput.value = top + ' / ' + sub;
        } else {
          valueInput.value = '';
        }
        valueInput.readOnly = true;
        valueInput.placeholder = 'Select category and subcategory';
        return;
      }

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
      categorySelect.addEventListener('change', function() {
        if (isShopnDropSelected()) {
          populateShopnDropSubcategories();
        }
        updateValueInput();
      });
      updateValueInput();
    }

    if (subcategorySelect) {
      subcategorySelect.addEventListener('change', updateValueInput);
    }

    function renderRecords(records) {
      if (!resultsTbody) return;
      resultsTbody.innerHTML = '';
      records.forEach(function(row) {
        var tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.12)';

        var tdName = document.createElement('td');
        tdName.style.padding = '6px 8px';
        tdName.textContent = row.name || row.Name || '';
        tr.appendChild(tdName);

        var tdPrice = document.createElement('td');
        tdPrice.style.padding = '6px 8px';
        tdPrice.textContent = row.price || row.Price || '';
        tr.appendChild(tdPrice);

        var tdDesc = document.createElement('td');
        tdDesc.style.padding = '6px 8px';
        tdDesc.textContent = row.description || row.Description || '';
        tr.appendChild(tdDesc);

        var tdUrl = document.createElement('td');
        tdUrl.style.padding = '6px 8px';
        var url = row.url || row.URL || '';
        if (url) {
          var a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = 'Check in website';
          a.style.color = '#81d4fa';
          a.style.textDecoration = 'underline';
          tdUrl.appendChild(a);
        } else {
          tdUrl.textContent = '';
        }
        tr.appendChild(tdUrl);

        resultsTbody.appendChild(tr);
      });
    }

    function loadCsvResults(moduleName, domain, category) {
      if (!summaryDetailsContainer) return;
      // Clear previous table rows and messages
      if (resultsTbody) resultsTbody.innerHTML = '';
      if (resultsContainer) resultsContainer.innerHTML = '';
      summaryDetailsContainer.textContent = '';

      fetch('/api/scrape-results/?module_name=' + encodeURIComponent(moduleName) + '&category=' + encodeURIComponent(category))
        .then(function(response) { return response.json(); })
        .then(function(data) {
          if (!data || data.error) {
            if (resultsContainer) {
              resultsContainer.innerHTML = '<p style="color:#f44336;">No raw data found for this category.</p>';
            }
            return;
          }
          var records = data.records || data.results || [];
          var total = typeof data.total === 'number' ? data.total : (records.length || 0);
          var dateStr = data.date || '';
          var scrDomain = data.domain || domain || '';
          var niceCategory = category.charAt(0).toUpperCase() + category.slice(1);

          var metaText = total + ' ' + niceCategory + ' products from ' + scrDomain;
          if (dateStr) {
            metaText += ' updated on ' + dateStr;
          }
          summaryDetailsContainer.textContent = metaText;

          if (!records.length) {
            if (resultsContainer) {
              resultsContainer.innerHTML = '<p style="color:#f44336;">No records to display.</p>';
            }
            return;
          }

          renderRecords(records);
        })
        .catch(function(err) {
          console.error('Error loading CSV results for Market Analysis:', err);
          if (resultsContainer) {
            resultsContainer.innerHTML = '<p style="color:#f44336;">Error loading raw data.</p>';
          }
        });
    }

    // Poll for CSV results for a given module/category until data is
    // available or a maximum number of attempts is reached. This allows
    // the scraper to run in the background while the UI waits.
    function pollCsvResults(moduleName, domain, category, attemptsLeft) {
      if (!resultsTbody || !resultsContainer || !summaryDetailsContainer) return;

      fetch('/api/scrape-results/?module_name=' + encodeURIComponent(moduleName) + '&category=' + encodeURIComponent(category))
        .then(function(response) { return response.json(); })
        .then(function(data) {
          if (!data) {
            throw new Error('Empty response');
          }

          if (data.error) {
            // Hard error: stop polling and surface message
            console.warn('Scrape results error:', data.error);
            resultsContainer.innerHTML = '<p style="color:#f44336;">' + data.error + '</p>';
            return;
          }

          var records = data.records || data.results || [];
          if (records.length === 0) {
            if (attemptsLeft > 0) {
              // Keep waiting silently, just update status text
              resultsContainer.innerHTML = '<p style="color:#2196f3;">Waiting for scrape to finish (' + attemptsLeft + ')...</p>';
              setTimeout(function() {
                pollCsvResults(moduleName, domain, category, attemptsLeft - 1);
              }, 3000);
              return;
            }

            resultsContainer.innerHTML = '<p style="color:#f44336;">No results available yet. Please try again later.</p>';
            return;
          }

          // We have data: render table and meta line.
          if (resultsTbody) resultsTbody.innerHTML = '';
          renderRecords(records);

          var total = typeof data.total === 'number' ? data.total : records.length;
          var dateStr = data.date || '';
          var scrDomain = data.domain || domain || '';
          var niceCategory = category.charAt(0).toUpperCase() + category.slice(1);
          var metaText = total + ' ' + niceCategory + ' products from ' + scrDomain;
          if (dateStr) {
            metaText += ' updated on ' + dateStr;
          }
          summaryDetailsContainer.textContent = metaText;

          // Refresh summary once data is available so the new category
          // appears in the "Raw data" list.
          if (typeof loadSummary === 'function') {
            loadSummary();
          }

          resultsContainer.innerHTML = '<p style="color:#4caf50;">Search completed.</p>';
        })
        .catch(function(err) {
          console.error('Error polling CSV results for Market Analysis:', err);
          resultsContainer.innerHTML = '<p style="color:#f44336;">Error loading scrape results.</p>';
        });
    }

    // Load summary of existing raw CSV data and tie it to the selected scraper
    function renderSummaryForSelectedScraper() {
      if (!summaryContainer || !summaryData || !supermarketSelect) return;
      var selectedOption = supermarketSelect.options[supermarketSelect.selectedIndex];
      if (!selectedOption) {
        summaryContainer.textContent = '';
        if (summaryDetailsContainer) {
          summaryDetailsContainer.textContent = '';
        }
        return;
      }
      var text = selectedOption.textContent || '';
      var match = text.match(/\(([^)]+)\)\s*$/); // extract domain inside parentheses
      if (!match) {
        summaryContainer.textContent = '';
        if (summaryDetailsContainer) {
          summaryDetailsContainer.textContent = '';
        }
        return;
      }
      var domain = match[1];
      var cats = (summaryData[domain] || []).slice();
      if (!cats.length) {
        summaryContainer.textContent = '';
        if (summaryDetailsContainer) {
          summaryDetailsContainer.textContent = '';
        }
        return;
      }

      // Store current context for click handler
      summaryContainer.dataset.domain = domain;
      summaryContainer.dataset.moduleName = supermarketSelect.value || '';

      // Build clickable category links
      var linksHtml = cats.map(function(cat) {
        return '<a href="#" data-category="' + cat + '" style="color:#64b5f6; text-decoration:underline; margin-right:0.5rem;">' + cat + '</a>';
      }).join(' ');

      summaryContainer.innerHTML = 'Raw data from ' + domain + ' for: ' + linksHtml;
    }

    function loadSummary() {
      if (!summaryContainer) return;
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

    if (summaryContainer) {
      loadSummary();
    }

    if (summaryContainer) {
      summaryContainer.addEventListener('click', function(evt) {
        var target = evt.target;
        if (!target || !target.getAttribute) return;
        var cat = target.getAttribute('data-category');
        if (!cat) return;
        evt.preventDefault();
        var moduleName = summaryContainer.dataset.moduleName || (supermarketSelect ? supermarketSelect.value : '');
        var domain = summaryContainer.dataset.domain || '';
        if (!moduleName) return;
        loadCsvResults(moduleName, domain, cat);
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
                supermarketSelect.innerHTML = '';
                var defaultOpt = document.createElement('option');
                defaultOpt.value = '';
                defaultOpt.textContent = 'Select Supermarket';
                supermarketSelect.appendChild(defaultOpt);
                if (supermarkets.length > 0) {
                  supermarketSelect.disabled = false;
                  supermarketLabel.textContent = 'Supermarket';
                  supermarketLabel.style.color = '#4caf50';
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

            // Reset category options when country changes; default
            // (non-ShopNDrop) categories are restored here.
            if (categorySelect && defaultCategoryOptionsHtml) {
              categorySelect.innerHTML = defaultCategoryOptionsHtml;
              updateValueInput();
            }

            if (subcategoryContainer && subcategorySelect) {
              subcategoryContainer.style.display = 'none';
              subcategorySelect.innerHTML = '';
            }

            // After updating options, refresh the summary for the currently
            // selected scraper (if any and if summary data is loaded).
            renderSummaryForSelectedScraper();
          }

          countrySelect.addEventListener('change', updateSupermarketDropdown);
          supermarketSelect.addEventListener('change', function() {
            // When ShopNDrop is selected, override the category
            // dropdown with the navbar-based top-level categories
            // and show the secondary subcategory dropdown.
            if (categorySelect) {
              if (isShopnDropSelected()) {
                ensureShopnDropCategoriesLoaded(function() {
                  populateShopnDropCategories();
                  if (subcategoryContainer) {
                    subcategoryContainer.style.display = 'block';
                  }
                  updateValueInput();
                });
              } else if (defaultCategoryOptionsHtml) {
                categorySelect.innerHTML = defaultCategoryOptionsHtml;
                if (subcategoryContainer && subcategorySelect) {
                  subcategoryContainer.style.display = 'none';
                  subcategorySelect.innerHTML = '';
                }
                updateValueInput();
              }
            } else {
              updateValueInput();
            }
            // Force reload summary from backend to update available files
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
            } else {
              renderSummaryForSelectedScraper();
            }
          });
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

        // Check if the query matches a raw data category for this supermarket
        var selectedOption = supermarketSelect.options[supermarketSelect.selectedIndex];
        var text = selectedOption ? selectedOption.textContent : '';
        var match = text.match(/\(([^)]+)\)\s*$/);
        var domain = match ? match[1] : '';
        var rawCats = (summaryData && domain && summaryData[domain]) ? summaryData[domain] : [];
        var alreadyExists = rawCats.map(function(c){return (c||'').toLowerCase();}).indexOf(query.toLowerCase()) !== -1;
        if (alreadyExists) {
          if (window.confirm('Warning: Raw data for category "' + query + '" already exists for this supermarket. If you continue, all values will be replaced with the new search.\n\nDo you want to continue?') === false) {
            if (resultsContainer) {
              resultsContainer.innerHTML = '<p style="color:#f44336;">Search cancelled.</p>';
            }
            return;
          }
        }

        // Clear previous results before running a new scrape
        if (resultsTbody) resultsTbody.innerHTML = '';
        if (resultsContainer) resultsContainer.innerHTML = '<p style="color:#2196f3;">Starting scrape...</p>';
        if (summaryDetailsContainer) summaryDetailsContainer.textContent = '';

        // Call scraper API
        fetch('/api/scrape-supermarket/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            country_code: country,
            module_name: supermarket,
            query: query
          })
        })
          .then(function(resp) { return resp.json(); })
          .then(function(data) {
            if (!data || data.error) {
              if (resultsContainer) {
                resultsContainer.innerHTML = '<p style="color:#f44336;">' + (data && data.error ? data.error : 'Search failed.') + '</p>';
              }
              return;
            }
            // Scrape successfully scheduled in the background. Start
            // polling the CSV results until data is available.

            var moduleName = supermarketSelect.value;
            var selectedOption = supermarketSelect.options[supermarketSelect.selectedIndex];
            var txt = selectedOption ? selectedOption.textContent : '';
            var m = txt.match(/\(([^)]+)\)\s*$/);
            var domain = m ? m[1] : '';

            var categorySlug = data.category || (query || '').trim().toLowerCase().replace(/\s+/g, '-');

            if (resultsContainer) {
              resultsContainer.innerHTML = '<p style="color:#2196f3;">Scrape running in background, waiting for results...</p>';
            }

            // Up to ~2 minutes: 40 attempts * 3s.
            pollCsvResults(moduleName, domain, categorySlug, 40);
          })
          .catch(function(err) {
            console.error('Error running scraper:', err);
            if (resultsContainer) {
              resultsContainer.innerHTML = '<p style="color:#f44336;">Error running scraper.</p>';
            }
          });
      });
    }
  }

  return {
    renderMarketAnalysisTab: renderMarketAnalysisTab
  };
})();
