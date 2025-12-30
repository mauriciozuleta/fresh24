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
											'<div id="map-container" style="width:100%; height:400px; margin:2rem 0; border:2px solid #0078d4; border-radius:8px;">' +
											'<div id="region-map" style="width:100%; height:100%;"></div>' +
											'</div>' +
											'<div id="table-container" style="width:100%; display:flex; justify-content:center; align-items:center; margin:2rem 0;">' +
							'<div id="table-placeholder" style="width:90%; min-height:60px; background:#222; color:#fff; border:2px dashed #0078d4; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; margin:2rem auto; text-align:center;">' +
							'<span>TABLE PLACEHOLDER — Table will be built here. If you see this, the divider is working. (Bug tracking)</span>' +
							'</div></div>';
							setupRegionCountries();
							setupCountryAirports();
							setupManagementUI();
							loadManagementTable();
							initializeRegionMap(regions);
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
						});
			} else {
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

