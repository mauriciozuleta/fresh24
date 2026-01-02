// ===================================================================
// USER MANAGEMENT MODULE - Now in user-management.js
// Functions: setupCountryAirports, setupManagementUI, loadManagementTable, setupRegionCountries
// ===================================================================

// Main tab/workspace logic extracted from home.html
document.addEventListener('DOMContentLoaded', function() {
	var icons = document.querySelectorAll('.sidebar-icon');
	var optionsSidebarContent = document.getElementById('options-sidebar-content');
	var userMenu = document.getElementById('user-menu');
	var tabBar = document.getElementById('tab-bar');
	var tabContent = document.getElementById('tab-content');
	// Workspaces: each icon label gets its own workspace (tabs and activeTab)
	var workspaces = {};
	var currentWorkspace = null;

	// Expose globally for button handlers
	window.currentWorkspace = currentWorkspace;
	window.getWorkspace = function() { return currentWorkspace; };

	// VS Code-style tree toggles (used by all menus with .vscode-tree)
	var treeToggleItems = document.querySelectorAll('.vscode-tree-item[data-toggle]');
	treeToggleItems.forEach(function(item) {
		item.addEventListener('click', function(e) {
			e.stopPropagation();
			var key = item.getAttribute('data-toggle');
			var children = document.querySelector('.vscode-tree-children[data-parent="' + key + '"]');
			if (children) {
				var isOpen = children.style.display !== 'none';
				children.style.display = isOpen ? 'none' : 'block';
				item.classList.toggle('open', !isOpen);
			}
		});
	});

	icons.forEach(function(icon) {
		icon.addEventListener('click', function(e) {
			e.preventDefault();
			var label = icon.getAttribute('data-label');
			optionsSidebarContent.textContent = label + ' Options';
			userMenu.style.display = 'none';
			document.getElementById('admin-menu').style.display = 'none';
			if (label === 'User') {
				userMenu.style.display = 'block';
			} else if (label === 'Administrator') {
				document.getElementById('admin-menu').style.display = 'block';
			}
			// Switch workspace
			switchWorkspace(label);
		});
	});
	// Hide user menu by default
	userMenu.style.display = 'none';

	// Listen for openTab event to open Add Airport tab
	window.addEventListener('openTab', function(e) {
		if (e.detail && e.detail.tab === 'add_airport') {
			if (!currentWorkspace) return;
			createTab('Add Airport', { nonClosable: false });
			setActiveTab('Add Airport');
		}
	});

	// Function to refresh airport list from server
	window.refreshAirportList = function() {
		fetch('/')
			.then(function(response) { return response.text(); })
			.then(function(html) {
				var parser = new DOMParser();
				var doc = parser.parseFromString(html, 'text/html');
				var freshList = doc.querySelector('#airport-list-container');
				if (freshList) {
					document.getElementById('airport-list-container').innerHTML = freshList.innerHTML;
					// If Airports tab is currently active, refresh it
					if (currentWorkspace && workspaces[currentWorkspace].activeTab === 'Airports') {
						setActiveTab('Airports');
					}
				}
			});
	};

	// Helper to create a tab in the current workspace
	function createTab(tabName, options) {
		if (!currentWorkspace) return null;
		var ws = workspaces[currentWorkspace];
		if (ws.openTabs[tabName]) {
			return ws.openTabs[tabName];
		}

		var tab = document.createElement('div');
		tab.className = 'tab';
		tab.dataset.tab = tabName;

		// Tab label
		var labelSpan = document.createElement('span');
		labelSpan.textContent = tabName;
		labelSpan.style.marginRight = '8px';
		labelSpan.addEventListener('click', function(e) {
			e.stopPropagation();
			setActiveTab(tabName);
		});
		tab.appendChild(labelSpan);

		var nonClosable = options && options.nonClosable;
		if (!nonClosable) {
			// Close button for regular tabs
			var closeBtn = document.createElement('button');
			closeBtn.className = 'tab-close-btn';
			closeBtn.textContent = '×';
			closeBtn.title = 'Close tab';
			closeBtn.style.background = 'transparent';
			closeBtn.style.border = 'none';
			closeBtn.style.color = '#d4d4d4';
			closeBtn.style.cursor = 'pointer';
			closeBtn.style.fontSize = '1rem';
			closeBtn.style.marginLeft = '2px';
			closeBtn.addEventListener('click', function(e) {
				e.stopPropagation();
				// Remove tab from DOM and openTabs
				tabBar.removeChild(tab);
				delete ws.openTabs[tabName];
				// If closed tab was active, activate another tab
				if (ws.activeTab === tabName) {
					var tabKeys = Object.keys(ws.openTabs);
					if (tabKeys.length > 0) {
						setActiveTab(tabKeys[tabKeys.length - 1]);
					} else {
						ws.activeTab = null;
						tabContent.innerHTML = '<h1>Welcome to the Financial Simulator</h1><p>This is your home page. The UI uses a dark, cold color palette inspired by VS Code.</p>';
					}
				}
			});
			tab.appendChild(closeBtn);
		}

		tab.addEventListener('click', function() {
			setActiveTab(tabName);
		});

		tabBar.appendChild(tab);
		ws.openTabs[tabName] = tab;
		return tab;
	}

	// Expose createTab globally
	window.createTab = createTab;

	// Tab logic (per workspace) for all menu options
	document.querySelectorAll('.menu-option').forEach(function(option) {
		option.addEventListener('click', function(e) {
			e.preventDefault();
			var tabName = option.textContent.trim();
			if (!currentWorkspace) return;
			createTab(tabName, { nonClosable: false });
			setActiveTab(tabName);
		});
	});

	function setActiveTab(tabName) {
		if (!currentWorkspace) return;
		var ws = workspaces[currentWorkspace];
		// Remove active from all tabs
		Object.values(ws.openTabs).forEach(function(tab) {
			tab.classList.remove('active');
		});
		// Set active
		if (ws.openTabs[tabName]) {
			ws.openTabs[tabName].classList.add('active');
			ws.activeTab = tabName;
			// Show content for the tab
			if (tabName === 'Aircraft') {
				AdminManagement.renderAircraftTab(tabContent, createTab, setActiveTab, currentWorkspace);
			} else if (tabName === 'Mode') {
				AdminManagement.renderModeTab(tabContent);
			} else if (tabName === 'Add Aircraft') {
				AdminManagement.renderAddAircraftTab(tabContent);
			} else if (tabName === 'Edit Aircraft') {
				AdminManagement.renderEditAircraftTab(tabContent);
			} else if (tabName.startsWith('Edit ') && tabName !== 'Edit Aircraft') {
				AdminManagement.renderEditAirportTab(tabContent);
			} else if (tabName === 'Airports') {
				AdminManagement.renderAirportsTab(tabContent, createTab, setActiveTab, currentWorkspace);
			} else if (tabName === 'Add Airport') {
				AdminManagement.renderAddAirportTab(tabContent);
			} else if (tabName === 'Routes') {
				AdminManagement.renderRoutesTab(tabContent);
			} else if (tabName === 'Export') {
				tabContent.innerHTML = '<div class="tab-content-inner"><h2>Export User Market Data</h2><p>Export functionality coming soon.</p></div>';
			} else if (tabName === 'Import') {
				tabContent.innerHTML = '<div class="tab-content-inner"><h2>Import User Market Data</h2><p>Import functionality coming soon.</p></div>';
			} else if (tabName === 'User Management') {
				// Fetch regions from API
				fetch('/api/regions/')
					.then(function(response) { return response.json(); })
					.then(function(data) {
						var regions = data.regions || [];
						var options = regions.map(function(region) {
							return '<option value="' + region + '">' + region + '</option>';
						}).join('');
						tabContent.innerHTML = '<div class="tab-content-inner"><h1>Commercial Structure Management</h1>' +
							'<div class="aircraft-form-row" style="margin-top:1.5rem; gap:2rem;">' +
							'<div class="form-group">' +
							'<label for="region-select">Select Region</label>' +
							'<select id="region-select" class="aircraft-form-control"><option value="">-- Select --</option>' + options + '</select>' +
							'</div>' +
							'<div class="form-group">' +
							'<label for="regional-manager">Regional Manager</label>' +
							'<input type="text" id="regional-manager" class="aircraft-form-control" placeholder="Enter manager name">' +
							'</div>' +
							'<div class="form-group">' +
							'<label for="region-user">Region User</label>' +
							'<input type="text" id="region-user" class="aircraft-form-control" placeholder="Enter user name">' +
							'</div>' +
							'<div style="display: flex; align-items: flex-end; margin-left: 3rem;">' +
							'<button id="edit-region-btn" class="primary-button" type="button" style="white-space: nowrap;">Edit Region</button>' +
							'</div>' +
							'</div>' +
							'<div class="aircraft-form-row" style="margin-top:1.5rem; gap:2rem;">' +
							'<div class="form-group" id="countries-group">' +
							'<label for="country-select">Countries</label>' +
							'<select id="country-select" class="aircraft-form-control" disabled>' +
							'<option value="">Select a region first</option>' +
							'</select>' +
							'</div>' +
							'<div class="form-group">' +
							'<label for="country-manager">Country Manager</label>' +
							'<input type="text" id="country-manager" class="aircraft-form-control" placeholder="Enter country manager name">' +
							'</div>' +
							'<div class="form-group">' +
							'<label for="country-user">Country User</label>' +
							'<input type="text" id="country-user" class="aircraft-form-control" placeholder="Enter country user name">' +
							'</div>' +
							'<div style="display: flex; align-items: flex-end; margin-left: 3rem;">' +
							'<button id="add-country-btn" class="primary-button" type="button" style="white-space: nowrap;">Add Country</button>' +
							'</div>' +
							'</div>' +
							'<div class="aircraft-form-row" style="margin-top:1.5rem; gap:2rem;">' +
							'<div class="form-group" id="airports-group">' +
							'<label for="airport-select">Airports</label>' +
							'<select id="airport-select" class="aircraft-form-control" disabled>' +
							'<option value="">Select a country first</option>' +
							'</select>' +
							'</div>' +
							'<div class="form-group">' +
							'<label for="branch-manager">Branch Manager</label>' +
							'<input type="text" id="branch-manager" class="aircraft-form-control" placeholder="Enter branch manager name">' +
							'</div>' +
							'<div class="form-group">' +
							'<label for="branch-user">Branch User</label>' +
							'<input type="text" id="branch-user" class="aircraft-form-control" placeholder="Enter branch user name">' +
							'</div>' +
							'<div style="display: flex; align-items: flex-end; margin-left: 3rem;">' +
							'<button id="add-branch-btn" class="primary-button" type="button" style="white-space: nowrap;">Region Core Data</button>' +
							'</div>' +
											'</div></div>' +
											'<div id="table-container" style="width:100%; display:flex; justify-content:center; align-items:center; margin:2rem 0;">' +
							'<div id="table-placeholder" style="width:90%; min-height:60px; background:#222; color:#fff; border:2px dashed #0078d4; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; margin:2rem auto; text-align:center;">' +
							'<span>TABLE PLACEHOLDER — Table will be built here. If you see this, the divider is working. (Bug tracking)</span>' +
							'</div></div>';
							setupRegionCountries();
							setupCountryAirports();
							setupManagementUI();
							loadManagementTable();
						})
						.catch(function() {
							 tabContent.innerHTML = '<div class="tab-content-inner"><h2>Commercial Structure Management</h2><p>Could not load regions.</p></div>';
						});
					} else if (tabName === 'Region Core Data') {
						// Render a focused Region Core Data form (regions dropdown + manager + countries)
						fetch('/api/regions/')
							.then(function(response) { return response.json(); })
							.then(function(data) {
								var regions = data.regions || [];
								var options = regions.map(function(r) { return '<option value="' + r + '">' + r + '</option>'; }).join('');
								tabContent.innerHTML = '<div class="tab-content-inner aircraft-form-page">' +
									'<div class="aircraft-header"><h1 class="aircraft-title">Region Core Data</h1></div>' +
									'<div class="aircraft-form-container">' +
									'<div class="aircraft-form-section">' +
									'<div class="aircraft-section-title">Region & Country</div>' +
									'<div class="aircraft-form-row three-col">' +
									'<div class="form-group">' +
									'<label for="region-core-select">Region</label>' +
									'<select id="region-core-select" class="aircraft-form-control"><option value="">-- Select Region --</option>' + options + '</select>' +
									'</div>' +
									'<div class="form-group">' +
									'<label for="region-core-manager">Regional Manager</label>' +
									'<input type="text" id="region-core-manager" class="aircraft-form-control" readonly>' +
									'</div>' +
									'<div class="form-group">' +
									'<label for="region-core-country">Country</label>' +
									'<select id="region-core-country" class="aircraft-form-control" disabled><option value="">Select a region first</option></select>' +
									'</div>' +
									'</div>' +
									'</div>' +
									'<div class="aircraft-form-section">' +
									'<div class="aircraft-section-title">Country Tax & Profit Information</div>' +
									'<div class="aircraft-form-row three-col">' +
									'<div class="form-group">' +
									'<label for="export-sales-tax">Export Sales Tax</label>' +
									'<input type="number" id="export-sales-tax" class="aircraft-form-control" placeholder="Enter export sales tax">' +
									'</div>' +
									'<div class="form-group">' +
									'<label for="export-other-tax">Export Other Tax</label>' +
									'<input type="number" id="export-other-tax" class="aircraft-form-control" placeholder="Enter export other tax">' +
									'</div>' +
									'<div class="form-group">' +
									'<label for="country-profit">Country Profit</label>' +
									'<input type="number" id="country-profit" class="aircraft-form-control" placeholder="Enter country profit">' +
									'</div>' +
									'<div class="form-group">' +
									'<label for="country-revenue-tax">Country Revenue Tax</label>' +
									'<input type="number" id="country-revenue-tax" class="aircraft-form-control" placeholder="Enter country revenue tax">' +
									'</div>' +
									'<div class="form-group">' +
									'<label for="import-tax">Import Tax</label>' +
									'<input type="number" id="import-tax" class="aircraft-form-control" placeholder="Enter import tax">' +
									'</div>' +
									'<div class="aircraft-form-row" style="margin-top:1rem; gap:1rem;">' +
									'<div class="form-group" style="flex:1; max-width:180px;">' +
									'<label for="other-tax">Other Tax</label>' +
									'<input type="number" id="other-tax" class="aircraft-form-control" placeholder="Enter other tax">' +
									'</div>' +
									'<div class="form-group" style="flex:1; max-width:180px;">' +
									'<label for="country-import-profit">Country Import Profit</label>' +
									'<input type="number" id="country-import-profit" class="aircraft-form-control" placeholder="Enter country import profit" style="max-width:180px;">' +
									'</div>' +
									'<div style="display:flex; align-items:flex-end;">' +
									'<button id="update-country-info-btn" class="primary-button" type="button" style="white-space:nowrap; padding:0.5rem 1.5rem;">Update Country Information</button>' +
									'</div>' +
									'</div>' +
									'<div class="aircraft-form-section">' +
									'<div class="aircraft-section-title">Branches Information</div>' +
									'<div class="aircraft-form-row" style="gap:1rem;">' +
									'<div class="form-group" style="flex:1; max-width:260px;">' +
									'<label for="branch-airport-select">Airport</label>' +
									'<select id="branch-airport-select" class="aircraft-form-control" disabled><option value="">Select a country first</option></select>' +
									'</div>' +
									'<div class="form-group" style="flex:1; max-width:260px;">' +
									'<label for="branch-manager-name">Branch Manager</label>' +
									'<input type="text" id="branch-manager-name" class="aircraft-form-control" readonly>' +
									'</div>' +
									'</div>' +
									'<div class="aircraft-form-row three-col" style="margin-top:1rem;">' +
									'<div class="form-group">' +
									'<label for="marketing-expenses">Marketing Expenses</label>' +
									'<input type="number" id="marketing-expenses" class="aircraft-form-control" placeholder="Enter marketing expenses">' +
									'</div>' +
									'<div class="form-group">' +
									'<label for="payroll">Payroll</label>' +
									'<input type="number" id="payroll" class="aircraft-form-control" placeholder="Enter payroll">' +
									'</div>' +
									'<div class="form-group">' +
									'<label for="rent-expenses">Rent Expenses</label>' +
									'<input type="number" id="rent-expenses" class="aircraft-form-control" placeholder="Enter rent expenses">' +
									'</div>' +
									'<div class="form-group">' +
									'<label for="utilities-expenses">Utilities Expenses</label>' +
									'<input type="number" id="utilities-expenses" class="aircraft-form-control" placeholder="Enter utilities expenses">' +
									'</div>' +
									'<div class="form-group">' +
									'<label for="office-supplies">Office Supplies</label>' +
									'<input type="number" id="office-supplies" class="aircraft-form-control" placeholder="Enter office supplies">' +
									'</div>' +
									'<div class="form-group">' +
									'<label for="other-expenses">Other Expenses</label>' +
									'<input type="number" id="other-expenses" class="aircraft-form-control" placeholder="Enter other expenses">' +
									'</div>' +
									'</div>' +
									'<div style="width:100%; display:flex; justify-content:center; margin-top:1.5rem;">' +
									'<button id="save-branch-costs-btn" class="primary-button" style="width:100%; max-width:700px; font-size:1.1rem; padding:0.75rem 0;">Save Branch Costs Information</button>' +
									'</div>' +
									'</div>' +
									'</div></div>';
								// Wire up change handler
								setTimeout(function() {
									var branchAirportSelect = document.getElementById('branch-airport-select');
									var branchManagerInput = document.getElementById('branch-manager-name');
									var countrySel = document.getElementById('region-core-country');
									
									function updateBranchManager() {
										var selected = branchAirportSelect.options[branchAirportSelect.selectedIndex];
										if (selected && selected.value) {
											branchManagerInput.value = selected.getAttribute('data-manager') || '';
											console.log('Updated manager:', branchManagerInput.value, 'from:', selected.getAttribute('data-manager'));
											
											// Fetch and populate all branch info fields
											fetch('/api/get-branch-info/?airport_code=' + encodeURIComponent(selected.value))
												.then(function(response) { return response.json(); })
												.then(function(result) {
													if (result.success && result.data) {
														document.getElementById('marketing-expenses').value = result.data.marketing_expenses || '';
														document.getElementById('payroll').value = result.data.payroll || '';
														document.getElementById('rent-expenses').value = result.data.rent_expenses || '';
														document.getElementById('utilities-expenses').value = result.data.utilities_expenses || '';
														document.getElementById('office-supplies').value = result.data.office_supplies || '';
														document.getElementById('other-expenses').value = result.data.other_expenses || '';
													}
												})
												.catch(function(err) {
													console.error('Error fetching branch info:', err);
												});
										}
									}
									
									function updateBranchAirportsAndManager() {
										var country = countrySel.value;
										if (!country) {
											branchAirportSelect.innerHTML = '<option value="">Select a country first</option>';
											branchAirportSelect.disabled = true;
											branchManagerInput.value = '';
											return;
										}
										console.log('Fetching airports for country:', country);
										fetch('/api/airports-by-country/?country=' + encodeURIComponent(country))
											.then(function(response) { return response.json(); })
											.then(function(data) {
												console.log('Airports received:', data);
												console.log('First airport detail:', data.airports && data.airports[0]);
												var airports = data.airports || [];
												if (airports.length > 0) {
													branchAirportSelect.innerHTML = airports.map(function(airport) {
														return '<option value="' + airport.iata_code + '" data-manager="' + (airport.manager || '') + '">' + airport.iata_code + ' - ' + airport.city + '</option>';
													}).join('');
													branchAirportSelect.disabled = false;
													// Set manager for first airport
													updateBranchManager();
												} else {
													branchAirportSelect.innerHTML = '<option value="">No airports found</option>';
													branchAirportSelect.disabled = true;
													branchManagerInput.value = '';
												}
											})
											.catch(function(err) {
												console.error('Error fetching airports:', err);
											});
									}
									
									if (countrySel && branchAirportSelect) {
										branchAirportSelect.addEventListener('change', updateBranchManager);
										countrySel.addEventListener('change', updateBranchAirportsAndManager);
										updateBranchAirportsAndManager(); // Call once on load
									}
									var updateBtn = document.getElementById('update-country-info-btn');
									if (updateBtn) {
										updateBtn.addEventListener('click', function() {
											var regionValue = document.getElementById('region-core-select').value;
											var countryValue = document.getElementById('region-core-country').value;
											if (!regionValue || !countryValue) {
												alert('Please select a region and country first');
												return;
											}
											var data = {
												country_code: countryValue,
												region: regionValue,
												export_sales_tax: document.getElementById('export-sales-tax').value,
												export_other_tax: document.getElementById('export-other-tax').value,
												country_profit: document.getElementById('country-profit').value,
												country_revenue_tax: document.getElementById('country-revenue-tax').value,
												import_tax: document.getElementById('import-tax').value,
												other_tax: document.getElementById('other-tax').value,
												country_import_profit: document.getElementById('country-import-profit').value
											};
											fetch('/api/update-country-information/', {
												method: 'POST',
												headers: {'Content-Type': 'application/json'},
												body: JSON.stringify(data)
											})
												.then(function(r) { return r.json(); })
												.then(function(result) {
													if (result.success) {
														alert('Country information updated successfully!');
													} else {
														alert('Error: ' + result.error);
													}
												})
												.catch(function(err) {
													alert('Error updating country information: ' + err);
												});
										});
									}
									
									var saveBranchBtn = document.getElementById('save-branch-costs-btn');
									if (saveBranchBtn) {
										saveBranchBtn.addEventListener('click', function() {
											var airportValue = document.getElementById('branch-airport-select').value;
											if (!airportValue) {
												alert('Please select an airport first');
												return;
											}
											var data = {
												airport_code: airportValue,
												marketing_expenses: document.getElementById('marketing-expenses').value,
												payroll: document.getElementById('payroll').value,
												rent_expenses: document.getElementById('rent-expenses').value,
												utilities_expenses: document.getElementById('utilities-expenses').value,
												office_supplies: document.getElementById('office-supplies').value,
												other_expenses: document.getElementById('other-expenses').value
											};
											fetch('/api/save-branch-costs/', {
												method: 'POST',
												headers: {'Content-Type': 'application/json'},
												body: JSON.stringify(data)
											})
												.then(function(r) { return r.json(); })
												.then(function(result) {
													if (result.success) {
														alert('Branch costs saved successfully!');
													} else {
														alert('Error: ' + result.error);
													}
												})
												.catch(function(err) {
													alert('Error saving branch costs: ' + err);
												});
										});
									}
									var regionSel = document.getElementById('region-core-select');
									var managerInput = document.getElementById('region-core-manager');
									var countrySel = document.getElementById('region-core-country');
									if (!regionSel) return;
									regionSel.addEventListener('change', function() {
										var region = regionSel.value;
										if (!region) {
											managerInput.value = '';
											countrySel.innerHTML = '<option value="">Select a region first</option>';
											countrySel.disabled = true;
											return;
										}
										// fetch manager
										fetch('/api/check-region-info/?region=' + encodeURIComponent(region))
											.then(function(r) { return r.json(); })
											.then(function(d) { managerInput.value = d.regional_manager || ''; })
											.catch(function() { managerInput.value = ''; });
										// fetch countries
										fetch('/api/countries-by-region/?region=' + encodeURIComponent(region))
											.then(function(r) { return r.json(); })
											.then(function(d) {
												var countries = d.countries || [];
												if (countries.length > 0) {
													 countrySel.innerHTML = countries.map(function(c) { return '<option value="' + (c.code || c.country_code) + '">' + c.name + '</option>'; }).join('');
													countrySel.disabled = false;
												} else {
													countrySel.innerHTML = '<option value="">No countries found</option>';
													countrySel.disabled = true;
												}
											})
											.catch(function() {
												countrySel.innerHTML = '<option value="">Error loading</option>';
												countrySel.disabled = true;
											});
									});
									
									// Country selection handler - load existing CountryInfo data
									countrySel.addEventListener('change', function() {
										var region = regionSel.value;
										var country = countrySel.value;
										if (!region || !country) {
											// Clear all tax/profit fields
											document.getElementById('export-sales-tax').value = '';
											document.getElementById('export-other-tax').value = '';
											document.getElementById('country-profit').value = '';
											document.getElementById('country-revenue-tax').value = '';
											document.getElementById('import-tax').value = '';
											document.getElementById('other-tax').value = '';
											document.getElementById('country-import-profit').value = '';
											branchAirportSelect.innerHTML = '<option value="">Select a country first</option>';
											branchAirportSelect.disabled = true;
											return;
										}
										
										// Load existing CountryInfo data
										fetch('/api/check-country-info/?country=' + encodeURIComponent(country))
											.then(function(r) { return r.json(); })
											.then(function(d) {
												if (d.exists) {
													// Populate tax/profit fields if they exist in the response
													document.getElementById('export-sales-tax').value = d.export_sales_tax || '';
													document.getElementById('export-other-tax').value = d.export_other_tax || '';
													document.getElementById('country-profit').value = d.country_profit || '';
													document.getElementById('country-revenue-tax').value = d.country_revenue_tax || '';
													document.getElementById('import-tax').value = d.import_tax || '';
													document.getElementById('other-tax').value = d.other_tax || '';
													document.getElementById('country-import-profit').value = d.country_import_profit || '';
												}
											})
											.catch(function(err) {
												console.error('Error loading country info:', err);
											});
										
										// Load airports for this country
										updateBranchAirportsAndManager();
									});
								}, 30);
							})
							.catch(function() {
								tabContent.innerHTML = '<div class="tab-content-inner"><h2>Region Core Data</h2><p>Could not load regions.</p></div>';
							});
				} else if (tabName === 'Branch Information') {
					// Fetch regions and render Branch Information tab with map
					fetch('/api/regions/')
						.then(function(response) { return response.json(); })
						.then(function(data) {
							var regions = data.regions || [];
							tabContent.innerHTML = '<div class="tab-content-inner"><h1>Branch Information Management</h1>' +
								'<div id="map-container" style="width:100%; height:500px; margin:2rem 0; border:2px solid #0078d4; border-radius:8px;">' +
								'<div id="region-map" style="width:100%; height:100%;"></div>' +
								'</div>' +
								'<div id="branch-info-content" style="margin-top:2rem;">' +
								'<p>Select a region on the map to view branch information.</p>' +
								'</div></div>';
							setTimeout(function() { initializeRegionMap(regions); }, 100);
						})
						.catch(function() {
							tabContent.innerHTML = '<div class="tab-content-inner"><h2>Branch Information</h2><p>Could not load regions.</p></div>';
						});			} else if (tabName === 'Add Products') {
				renderAddProductTab(tabContent);			} else {
				console.log('Unknown tab:', tabName);
				tabContent.innerHTML = '<div class="tab-content-inner"><h2>' + tabName + '</h2><p>Content for ' + tabName + '.</p></div>';
			}
		}
	}

	// Expose setActiveTab globally
	window.setActiveTab = setActiveTab;

	// Global function to close only the current tab
	window.closeCurrentTab = function() {
		if (!currentWorkspace) return;
		var ws = workspaces[currentWorkspace];
		var tabName = ws.activeTab;
		if (tabName && ws.openTabs[tabName]) {
			var tab = ws.openTabs[tabName];
		tabBar.removeChild(tab);
		delete ws.openTabs[tabName];
		var tabKeys = Object.keys(ws.openTabs);
		if (tabKeys.length > 0) {
		  setActiveTab(tabKeys[tabKeys.length - 1]);
		} else {
		  ws.activeTab = null;
		  tabContent.innerHTML = '<h1>Welcome to the Financial Simulator</h1><p>This is your home page. The UI uses a dark, cold color palette inspired by VS Code.</p>';
		}
	  }
	};

	function switchWorkspace(label) {
		// If workspace doesn't exist, create it
		if (!workspaces[label]) {
			workspaces[label] = { openTabs: {}, activeTab: null };
		}
		currentWorkspace = label;
		window.currentWorkspace = currentWorkspace; // Update global reference

		// Ensure each icon/workspace has a non-closable "Home" tab
		var ws = workspaces[label];
		if (!ws.openTabs[label]) {
			createTab(label, { nonClosable: true });
			ws.activeTab = label;
		}

		// Clear tab bar and re-attach this workspace's tabs
		while (tabBar.firstChild) tabBar.removeChild(tabBar.firstChild);
		Object.entries(ws.openTabs).forEach(function([tabName, tab]) {
			tabBar.appendChild(tab);
		});

		// Set active tab
		if (ws.activeTab && ws.openTabs[ws.activeTab]) {
			setActiveTab(ws.activeTab);
		} else {
			setActiveTab(label);
		}
	}
});

// Map initialization is now handled by map-visualization.js

// Render Add Product form
function renderAddProductTab(tabContent) {
	// Inject CSS styles
	var styleId = 'product-form-styles';
	if (!document.getElementById(styleId)) {
		var style = document.createElement('style');
		style.id = styleId;
		style.textContent = `
			.product-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-bottom: 2rem;
				flex-wrap: wrap;
				gap: 1rem;
			}
			.product-title {
				color: #FF5C00;
				font-weight: bold;
				letter-spacing: 1px;
				margin: 0;
			}
			.product-form-container {
				background-color: #181c22;
				border-radius: 8px;
				padding: 2rem;
				box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
				max-width: 1200px;
				margin: 0 auto;
			}
			.product-form-section {
				margin-bottom: 2rem;
			}
			.product-form-section:last-child {
				margin-bottom: 0;
			}
			.product-section-title {
				color: #FF5C00;
				font-size: 1.1rem;
				font-weight: bold;
				margin-bottom: 1rem;
				padding-bottom: 0.5rem;
				border-bottom: 1px solid #2196f3;
			}
			.product-form-row {
				display: flex;
				flex-wrap: wrap;
				gap: 1.5rem;
				margin-bottom: 1rem;
			}
			.product-form-row.five-col {
				display: flex;
				flex-wrap: nowrap;
				gap: 1.5rem;
			}
			.product-form-row .form-group {
				flex: 1 1 140px;
				min-width: 140px;
				max-width: 200px;
				margin-right: 18px;
				margin-bottom: 0;
				display: flex;
				flex-direction: column;
				align-items: stretch;
			}
			.product-form-row .form-group:last-child {
				margin-right: 0;
			}
			.product-form-row .product-form-group {
				margin-bottom: 0;
			}
			.product-form-group {
				margin-bottom: 1rem;
			}
			.product-form-group label {
				display: block;
				color: #fff;
				font-weight: bold;
				margin-bottom: 0.5rem;
				font-size: 0.9rem;
			}
			.product-form-control {
				width: 100%;
				padding: 0.75rem;
				background-color: #23272e;
				border: 1px solid #2196f3;
				border-radius: 4px;
				color: #fff;
				font-size: 0.9rem;
				transition: all 0.3s ease;
			}
			.product-form-control:focus {
				outline: none;
				border-color: #FF5C00;
				box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.2);
			}
			.product-radio-group {
				display: flex;
				gap: 1.5rem;
				align-items: center;
				margin-top: 0.5rem;
			}
			.product-radio-item {
				display: flex;
				align-items: center;
				gap: 0.5rem;
			}
			.product-radio-item input[type="radio"] {
				width: 16px;
				height: 16px;
				accent-color: #FF5C00;
			}
			.product-radio-item label {
				color: #fff;
				font-weight: normal;
				margin: 0;
				cursor: pointer;
				font-size: 0.9rem;
			}
			.product-textarea {
				min-height: 100px;
				resize: vertical;
			}
			.product-btn {
				background-color: #2196f3;
				color: #fff;
				border: none;
				padding: 0.75rem 2rem;
				border-radius: 4px;
				font-weight: bold;
				cursor: pointer;
				transition: all 0.3s ease;
				font-size: 0.9rem;
				width: 100%;
				margin-top: 1rem;
			}
			.product-btn:hover {
				background-color: #1976d2;
				transform: translateY(-1px);
			}
			.product-btn:active {
				transform: translateY(0);
			}
		`;
		document.head.appendChild(style);
	}

	// Render form HTML
	tabContent.innerHTML = `
		<div class="tab-content-inner">
			<div class="product-header">
				<h1 class="product-title">Add New Product</h1>
			</div>
			<div class="product-form-container">
				<form id="productForm">
					<div class="product-form-section">
						<div class="product-section-title">Basic Information</div>
						<div class="product-form-row five-col">
							<div class="form-group">
								<div class="product-form-group">
									<label for="productType">Type of Product</label>
									<select class="product-form-control" id="productType" required>
										<option value="Produce">Produce</option>
										<option value="Meats">Meats</option>
										<option value="Other Perishable">Other Perishable</option>
										<option value="Dry Goods">Dry Goods</option>
										<option value="Technology">Technology</option>
										<option value="Other">Other</option>
									</select>
								</div>
							</div>
							<div class="form-group">
								<div class="product-form-group">
									<label for="productCode">Product Code</label>
									<input type="text" class="product-form-control" id="productCode" readonly placeholder="Auto-generated">
								</div>
							</div>
							<div class="form-group">
								<div class="product-form-group">
									<label for="productName">Product Name</label>
									<input type="text" class="product-form-control" id="productName" required placeholder="Enter product name">
								</div>
							</div>
							<div class="form-group">
								<div class="product-form-group">
									<label for="productCountry">Country</label>
									<select class="product-form-control" id="productCountry" required>
										<option value="">Select Country</option>
									</select>
								</div>
							</div>
							<div class="form-group">
								<div class="product-form-group">
									<label for="tradeUnit">Trade Unit</label>
									<select class="product-form-control" id="tradeUnit" required>
										<option value="UN">Unit (Un)</option>
										<option value="BU">Bunch (BU)</option>
										<option value="KG">Kilogram (Kg.)</option>
										<option value="LBS">Pound (Lbs.)</option>
									</select>
								</div>
							</div>
						</div>
					</div>
					<div class="product-form-section">
						<div class="product-section-title">Cost Information</div>
						<div class="product-form-row">
							<div class="form-group">
								<div class="product-form-group">
									<label for="fcaCost">FCA Cost per WU</label>
									<input type="number" step="0.01" class="product-form-control" id="fcaCost" required placeholder="0.00">
								</div>
							</div>
							<div class="form-group">
								<div class="product-form-group">
									<label>Currency</label>
									<div class="product-radio-group">
										<div class="product-radio-item">
											<input type="radio" name="currency_option" id="currencyLocal" value="local" checked>
											<label for="currencyLocal">Local</label>
										</div>
										<div class="product-radio-item">
											<input type="radio" name="currency_option" id="currencyUSD" value="USD">
											<label for="currencyUSD">USD</label>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div class="product-form-section">
						<div class="product-section-title">Packaging Information</div>
						<div class="product-form-row">
							<div class="form-group">
								<div class="product-form-group">
									<label for="productPackaging">Packaging Type</label>
									<input type="text" class="product-form-control" id="productPackaging" required placeholder="e.g., Box, Bag, Container">
								</div>
							</div>
							<div class="form-group">
								<div class="product-form-group">
									<label for="packagingWeight">Packaging Weight (kg)</label>
									<input type="number" step="0.01" class="product-form-control" id="packagingWeight" required placeholder="0.00">
								</div>
							</div>
							<div class="form-group">
								<div class="product-form-group">
									<label for="packagingCost">Packaging Cost</label>
									<input type="number" step="0.01" class="product-form-control" id="packagingCost" required placeholder="0.00">
								</div>
							</div>
							<div class="form-group">
								<div class="product-form-group">
									<label for="unitsPerPack">Units per Pack</label>
									<input type="number" class="product-form-control" id="unitsPerPack" required placeholder="1">
								</div>
							</div>
						</div>
					</div>
					<div class="product-form-section">
						<div class="product-section-title">Additional Information</div>
						<div class="product-form-group">
							<label for="otherInfo">Other Information</label>
							<textarea class="product-form-control product-textarea" id="otherInfo" placeholder="Additional notes or specifications"></textarea>
						</div>
					</div>
					<button type="submit" class="product-btn">Add Product</button>
				</form>
			</div>
		</div>
	`;

	// Setup form logic
	setTimeout(function() {
		var form = document.getElementById('productForm');
		var productCountry = document.getElementById('productCountry');
		var currencyLocal = document.getElementById('currencyLocal');
		var currencyUSD = document.getElementById('currencyUSD');

		// Load countries from API
		fetch('/api/regions/')
			.then(function(response) { return response.json(); })
			.then(function(data) {
				var regions = data.regions || [];
				var countryPromises = regions.map(function(region) {
					return fetch('/api/countries-by-region/?region=' + encodeURIComponent(region))
						.then(function(r) { return r.json(); })
						.then(function(d) { return d.countries || []; });
				});
				return Promise.all(countryPromises);
			})
			.then(function(countryArrays) {
				var allCountries = [];
				countryArrays.forEach(function(countries) {
					allCountries = allCountries.concat(countries);
				});
				// Remove duplicates
				var uniqueCountries = [];
				var seen = {};
				allCountries.forEach(function(country) {
					if (!seen[country.code || country.country_code]) {
						seen[country.code || country.country_code] = true;
						uniqueCountries.push(country);
					}
				});
				productCountry.innerHTML = '<option value="">Select Country</option>' + 
					uniqueCountries.map(function(c) {
						return '<option value="' + (c.code || c.country_code) + '" data-currency="' + (c.currency_code || '') + '">' + c.name + '</option>';
					}).join('');
			})
			.catch(function(err) {
				console.error('Error loading countries:', err);
			});

		// Form submission
		if (form) {
			form.addEventListener('submit', function(e) {
				e.preventDefault();
				
				var formData = {
					product_type: document.getElementById('productType').value,
					name: document.getElementById('productName').value,
					country_id: document.getElementById('productCountry').value,
					trade_unit: document.getElementById('tradeUnit').value,
					fca_cost_per_wu: document.getElementById('fcaCost').value,
					currency: currencyUSD.checked ? 'USD' : (productCountry.selectedOptions[0]?.getAttribute('data-currency') || ''),
					packaging: document.getElementById('productPackaging').value,
					packaging_weight: document.getElementById('packagingWeight').value,
					packaging_cost: document.getElementById('packagingCost').value,
					units_per_pack: document.getElementById('unitsPerPack').value,
					other_info: document.getElementById('otherInfo').value
				};

				console.log('Product form data:', formData);
				alert('Product form submitted! (Backend API integration pending)');
				// TODO: Send to backend API
			});
		}
	}, 100);
}

