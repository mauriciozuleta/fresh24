// Populate airports dropdown based on selected country
function setupCountryAirports() {
	var countrySelect = document.getElementById('country-select');
	var airportSelect = document.getElementById('airport-select');
	var airportsGroup = document.getElementById('airports-group');
	if (!countrySelect || !airportSelect) return;
	function resetAirportDropdown() {
		airportSelect.innerHTML = '<option value="">Select a country first</option>';
		airportSelect.disabled = true;
		if (airportsGroup) {
			airportsGroup.style.display = 'block';
		}
	}
	resetAirportDropdown();
	countrySelect.addEventListener('change', function() {
		var country = countrySelect.value;
		if (!country) {
			resetAirportDropdown();
			return;
		}
		fetch('/api/airports-by-country/?country=' + encodeURIComponent(country))
			.then(function(response) { return response.json(); })
			.then(function(data) {
				var airports = data.airports || [];
				if (airports.length > 0) {
					airportSelect.innerHTML = airports.map(function(airport) {
						return '<option value="' + airport.iata_code + '">' + airport.iata_code + ' - ' + airport.city + '</option>';
					}).join('');
					airportSelect.disabled = false;
					if (airportsGroup) {
						airportsGroup.style.display = 'block';
					}
				} else {
					resetAirportDropdown();
				}
			});
	});
}

// Setup management UI logic for dynamic button labels and dropdown states
function setupManagementUI() {
	var regionSelect = document.getElementById('region-select');
	var countrySelect = document.getElementById('country-select');
	var airportSelect = document.getElementById('airport-select');
	var editRegionBtn = document.getElementById('edit-region-btn');
	var addCountryBtn = document.getElementById('add-country-btn');
	var addBranchBtn = document.getElementById('add-branch-btn');
	var regionalManager = document.getElementById('regional-manager');
	var regionUser = document.getElementById('region-user');
	var countryManager = document.getElementById('country-manager');
	var countryUser = document.getElementById('country-user');
	var branchManager = document.getElementById('branch-manager');
	var branchUser = document.getElementById('branch-user');

	// Region selection handler
	if (regionSelect && editRegionBtn) {
		regionSelect.addEventListener('change', function() {
			var region = regionSelect.value;
			if (!region) {
				editRegionBtn.textContent = 'Edit Region';
				regionalManager.value = '';
				regionUser.value = '';
				countrySelect.disabled = true;
				return;
			}
			
			// Check if region info exists
			fetch('/api/check-region-info/?region=' + encodeURIComponent(region))
				.then(function(response) { return response.json(); })
				.then(function(data) {
					if (data.exists) {
						editRegionBtn.textContent = 'Edit Region';
						regionalManager.value = data.regional_manager || '';
						regionUser.value = data.region_user || '';
						countrySelect.disabled = false;
					} else {
						editRegionBtn.textContent = 'Save Region Info';
						regionalManager.value = '';
						regionUser.value = '';
						countrySelect.disabled = true;
					}
				});
		});
	}

	// Region save/edit button handler
	if (editRegionBtn) {
		editRegionBtn.addEventListener('click', function() {
			var region = regionSelect.value;
			var manager = regionalManager.value.trim();
			var user = regionUser.value.trim();
			
			if (!region || !manager || !user) {
				alert('Please fill in all regional fields');
				return;
			}
			
			fetch('/api/save-region-info/', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					region: region,
					regional_manager: manager,
					region_user: user
				})
			})
			.then(function(response) { return response.json(); })
			.then(function(data) {
				if (data.success) {
					alert('Region info saved successfully');
					editRegionBtn.textContent = 'Edit Region';
					countrySelect.disabled = false;
					loadManagementTable();
				} else {
					alert('Error: ' + (data.error || 'Unknown error'));
				}
			})
			.catch(function(err) {
				alert('Error saving region info');
				console.error(err);
			});
		});
	}

	// Country selection handler
	if (countrySelect && addCountryBtn) {
		countrySelect.addEventListener('change', function() {
			var country = countrySelect.value;
			var region = regionSelect.value;
			if (!country) {
				addCountryBtn.textContent = 'Add Country';
				countryManager.value = '';
				countryUser.value = '';
				airportSelect.disabled = true;
				return;
			}
			
			// Check if country info exists
			fetch('/api/check-country-info/?country=' + encodeURIComponent(country))
				.then(function(response) { return response.json(); })
				.then(function(data) {
					if (data.exists) {
						addCountryBtn.textContent = 'Edit Country';
						countryManager.value = data.country_manager || '';
						countryUser.value = data.country_user || '';
						airportSelect.disabled = false;
					} else {
						addCountryBtn.textContent = 'Save Country Info';
						countryManager.value = '';
						countryUser.value = '';
						airportSelect.disabled = true;
					}
				});
		});
	}

	// Country save button handler
	if (addCountryBtn) {
		addCountryBtn.addEventListener('click', function() {
			var country = countrySelect.value;
			var region = regionSelect.value;
			var manager = countryManager.value.trim();
			var user = countryUser.value.trim();
			
			if (!country || !region || !manager || !user) {
				alert('Please fill in all country fields');
				return;
			}
			
			fetch('/api/save-country-info/', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					country: country,
					region: region,
					country_manager: manager,
					country_user: user
				})
			})
			.then(function(response) { return response.json(); })
			.then(function(data) {
				if (data.success) {
					alert('Country info saved successfully');
					addCountryBtn.textContent = 'Edit Country';
					airportSelect.disabled = false;
					loadManagementTable();
				} else {
					alert('Error: ' + (data.error || 'Unknown error'));
				}
			})
			.catch(function(err) {
				alert('Error saving country info');
				console.error(err);
			});
		});
	}

	// Airport selection handler
	if (airportSelect && addBranchBtn) {
		airportSelect.addEventListener('change', function() {
			var airport = airportSelect.value;
			if (!airport) {
				addBranchBtn.textContent = 'Region Core Data';
				branchManager.value = '';
				branchUser.value = '';
				return;
			}
			
			// Check if branch info exists
			fetch('/api/check-branch-info/?airport=' + encodeURIComponent(airport))
				.then(function(response) { return response.json(); })
				.then(function(data) {
					if (data.exists) {
						addBranchBtn.textContent = 'Branch Information';
						branchManager.value = data.branch_manager || '';
						branchUser.value = data.branch_user || '';
					} else {
						addBranchBtn.textContent = 'Save Branch Info';
						branchManager.value = '';
						branchUser.value = '';
					}
				});
		});
	}

	// Branch save button handler
	if (addBranchBtn) {
		addBranchBtn.addEventListener('click', function() {
			var airport = airportSelect.value;
			var country = countrySelect.value;
			var manager = branchManager.value.trim();
			var user = branchUser.value.trim();
			
			if (!airport || !country || !manager || !user) {
				alert('Please fill in all branch fields');
				return;
			}
			
			fetch('/api/save-branch-info/', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					airport: airport,
					country: country,
					branch_manager: manager,
					branch_user: user
				})
			})
			.then(function(response) { return response.json(); })
			.then(function(data) {
					if (data.success) {
					alert('Branch info saved successfully');
					addBranchBtn.textContent = 'Branch Information';
					loadManagementTable();
				} else {
					alert('Error: ' + (data.error || 'Unknown error'));
				}
			})
			.catch(function(err) {
				alert('Error saving branch info');
				console.error(err);
			});
		});
	}
}

// Load and render management table data
function loadManagementTable() {
	fetch('/api/get-management-table-data/')
		.then(function(response) { return response.json(); })
		.then(function(response) {
			var data = response.data || [];
			var placeholder = document.getElementById('table-placeholder');
			if (!placeholder) return;
			
			if (data.length === 0) {
				placeholder.innerHTML = '<span>No management data yet. Start by selecting a region and saving info.</span>';
				return;
			}
			
		// Build single unified table
		var html = '<div style="width:100%; background:#1e2227; border:2px solid #0078d4; border-radius:8px; padding:1.5rem;">';
		html += '<h3 style="margin-top:0; margin-bottom:1.5rem; color:#0078d4;">Commercial Structure Overview</h3>';
		html += '<table style="width:100%; border-collapse:collapse; font-size:0.95rem;">';
		html += '<thead><tr style="background:#363d48;">';
		html += '<th style="padding:10px; text-align:left; border:1px solid #444;">Region</th>';
		html += '<th style="padding:10px; text-align:left; border:1px solid #444;">Regional Manager</th>';
		html += '<th style="padding:10px; text-align:left; border:1px solid #444;">Region User</th>';
		html += '<th style="padding:10px; text-align:left; border:1px solid #444;">Country</th>';
		html += '<th style="padding:10px; text-align:left; border:1px solid #444;">Country Manager</th>';
		html += '<th style="padding:10px; text-align:left; border:1px solid #444;">Country User</th>';
		html += '<th style="padding:10px; text-align:left; border:1px solid #444;">Airport</th>';
		html += '<th style="padding:10px; text-align:left; border:1px solid #444;">Branch Manager</th>';
		html += '<th style="padding:10px; text-align:left; border:1px solid #444;">Branch User</th>';
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
							html += '<td style="padding:10px; border:1px solid #444; background:#26304a; font-weight:bold; color:#0078d4;" rowspan="' + regionRowspan + '">' + region.region + '</td>';
							html += '<td style="padding:10px; border:1px solid #444; background:#26304a;" rowspan="' + regionRowspan + '">' + region.regional_manager + '</td>';
							html += '<td style="padding:10px; border:1px solid #444; background:#26304a;" rowspan="' + regionRowspan + '">' + region.region_user + '</td>';
							firstRegionRow = false;
						}
						html += '<td style="padding:10px; border:1px solid #444; background:#23272e; color:#4a9eff;" rowspan="1">' + country.country_name + '</td>';
						html += '<td style="padding:10px; border:1px solid #444; background:#23272e;" rowspan="1">' + country.country_manager + '</td>';
						html += '<td style="padding:10px; border:1px solid #444; background:#23272e;" rowspan="1">' + country.country_user + '</td>';
						html += '<td style="padding:10px; border:1px solid #444; color:#888; font-style:italic;" colspan="3">No branches added yet</td>';
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
								html += '<td style="padding:10px; border:1px solid #444; background:#23272e; color:#4a9eff;" rowspan="' + countryRowspan + '">' + country.country_name + '</td>';
								html += '<td style="padding:10px; border:1px solid #444; background:#23272e;" rowspan="' + countryRowspan + '">' + country.country_manager + '</td>';
								html += '<td style="padding:10px; border:1px solid #444; background:#23272e;" rowspan="' + countryRowspan + '">' + country.country_user + '</td>';
								firstCountryRow = false;
							}
							html += '<td style="padding:10px; border:1px solid #444; background:#2d3139;">' + branch.airport_code + ' - ' + branch.airport_city + '</td>';
							html += '<td style="padding:10px; border:1px solid #444; background:#2d3139;">' + branch.branch_manager + '</td>';
							html += '<td style="padding:10px; border:1px solid #444; background:#2d3139;">' + branch.branch_user + '</td>';
							html += '</tr>';
						});
					}
				});
			}
		});
		
		html += '</tbody></table></div>';
		placeholder.innerHTML = html;
	})
	.catch(function(err) {
		console.error('Error loading table data:', err);
	});
}

// Populate airports dropdown based on selected country
function setupCountryAirports() {
	var countrySelect = document.getElementById('country-select');
	var airportSelect = document.getElementById('airport-select');
	var airportsGroup = document.getElementById('airports-group');
	if (!countrySelect || !airportSelect) return;
	function resetAirportDropdown() {
		airportSelect.innerHTML = '<option value="">Select a country first</option>';
		airportSelect.disabled = true;
		if (airportsGroup) {
			airportsGroup.style.display = 'block';
		}
	}
	resetAirportDropdown();
	countrySelect.addEventListener('change', function() {
		var country = countrySelect.value;
		if (!country) {
			resetAirportDropdown();
			return;
		}
		fetch('/api/airports-by-country/?country=' + encodeURIComponent(country))
			.then(function(response) { return response.json(); })
			.then(function(data) {
				var airports = data.airports || [];
				if (airports.length > 0) {
					airportSelect.innerHTML = airports.map(function(airport) {
						return '<option value="' + airport.iata_code + '">' + airport.iata_code + ' - ' + airport.city + '</option>';
					}).join('');
					airportSelect.disabled = false;
					if (airportsGroup) {
						airportsGroup.style.display = 'block';
					}
				} else {
					resetAirportDropdown();
				}
			});
	});
}

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

	function setupRegionCountries() {
		var regionSelect = document.getElementById('region-select');
		var countrySelect = document.getElementById('country-select');
		var countriesGroup = document.getElementById('countries-group');
		if (!regionSelect || !countrySelect) return;
		function resetCountryDropdown() {
			countrySelect.innerHTML = '<option value="">Select a region first</option>';
			countrySelect.disabled = true;
			if (countriesGroup) {
				countriesGroup.style.display = 'block';
			}
		}
		resetCountryDropdown();
		regionSelect.addEventListener('change', function() {
			var region = regionSelect.value;
			if (!region) {
				resetCountryDropdown();
				return;
			}
			fetch('/api/countries-by-region/?region=' + encodeURIComponent(region))
				.then(function(response) { return response.json(); })
				.then(function(data) {
					var countries = data.countries || [];
					if (countries.length > 0) {
						countrySelect.innerHTML = countries.map(function(country) {
							return '<option value="' + country.code + '">' + country.name + '</option>';
						}).join('');
						countrySelect.disabled = false;
						if (countriesGroup) {
							countriesGroup.style.display = 'block';
						}
					} else {
						resetCountryDropdown();
					}
				});
		});
	}

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
				var container = document.getElementById('aircraft-list-container');
				tabContent.innerHTML = container.innerHTML;
				var addBtn = document.getElementById('add-aircraft-btn');
				if (addBtn) {
					addBtn.addEventListener('click', function() {
						if (!currentWorkspace) return;
						createTab('Add Aircraft', { nonClosable: false });
						setActiveTab('Add Aircraft');
					});
				}
				// ...existing code for Aircraft tab...
				setTimeout(function() {
					// ...existing code for single-selection and edit...
				}, 50);
			} else if (tabName === 'Mode') {
				fetch('/mode-tab/')
					.then(function(response) { return response.text(); })
					.then(function(html) {
						var parser = new DOMParser();
						var doc = parser.parseFromString(html, 'text/html');
						var content = doc.querySelector('.tab-content-inner');
						if (content) {
							tabContent.innerHTML = content.outerHTML;
							// Execute inline scripts manually
							var scripts = doc.querySelectorAll('script');
							scripts.forEach(function(oldScript) {
								if (oldScript.src || (oldScript.textContent && oldScript.textContent.trim().length > 0)) {
									var newScript = document.createElement('script');
									if (oldScript.src) {
										newScript.src = oldScript.src;
									} else {
										newScript.textContent = oldScript.textContent;
									}
									document.body.appendChild(newScript);
								}
							});
							// Initialize checkbox handlers after Mode content is loaded
							if (window.initializeCheckboxHandlers) {
								setTimeout(window.initializeCheckboxHandlers, 100);
							}
						} else {
							tabContent.innerHTML = html;
							// Initialize checkbox handlers
							if (window.initializeCheckboxHandlers) {
								setTimeout(window.initializeCheckboxHandlers, 100);
							}
						}
					});
			} else if (tabName === 'Add Aircraft') {
				// Fetch the rendered form from the backend
				fetch('/add-aircraft/')
					.then(function(response) { return response.text(); })
					.then(function(html) {
						var parser = new DOMParser();
						var doc = parser.parseFromString(html, 'text/html');
						var form = doc.querySelector('.tab-content-inner');
						if (form) {
							var tabContentInner = document.getElementById('tab-content-inner');
							if (tabContentInner) {
								tabContentInner.className = form.className;
								tabContentInner.innerHTML = form.innerHTML;
							} else {
								tabContent.innerHTML = form.outerHTML;
							}
							// Execute inline scripts manually (innerHTML doesn't execute them)
							var scripts = doc.querySelectorAll('script');
							scripts.forEach(function(oldScript) {
								if (oldScript.src || (oldScript.textContent && oldScript.textContent.trim().length > 0)) {
									var newScript = document.createElement('script');
									if (oldScript.src) {
										newScript.src = oldScript.src;
									} else {
										newScript.textContent = oldScript.textContent;
									}
									document.body.appendChild(newScript);
								}
							});
							// Restore form data from localStorage after script execution
							// Wait a tick to ensure DOM is ready and script is loaded
							setTimeout(function() {
								if (typeof restoreAircraftForm === 'function') {
									restoreAircraftForm();
								} else if (window.restoreAircraftForm) {
									window.restoreAircraftForm();
								}
							}, 50);
						} else {
							// Fallback: show the full HTML response so errors are visible
							var tabContentInner = document.getElementById('tab-content-inner');
							if (tabContentInner) {
								tabContentInner.className = 'tab-content-inner aircraft-form-page';
								tabContentInner.innerHTML = html;
							} else {
								tabContent.innerHTML = html;
							}
						}
					})
					.catch(function() {
						tabContent.innerHTML = '<div class="tab-content-inner"><h2>Add Aircraft</h2><p>Form could not be loaded.</p></div>';
					});
			} else if (tabName === 'Edit Aircraft') {
				// Handle edit aircraft tab - get aircraft ID from global or storage
				var aircraftId = window._editAircraftId || sessionStorage.getItem('editAircraftId');
				if (aircraftId) {
					fetch('/edit-aircraft/' + aircraftId + '/')
						.then(function(response) { return response.text(); })
						.then(function(html) {
							var parser = new DOMParser();
							var doc = parser.parseFromString(html, 'text/html');
							var form = doc.querySelector('.tab-content-inner');
							if (form) {
								var tabContentInner = document.getElementById('tab-content-inner');
								if (tabContentInner) {
									tabContentInner.className = 'tab-content-inner aircraft-form-page';
									tabContentInner.innerHTML = form.innerHTML;
								} else {
									tabContent.innerHTML = form.outerHTML;
								}
								// Execute inline scripts manually
								var scripts = doc.querySelectorAll('script');
								scripts.forEach(function(oldScript) {
									if (oldScript.src || (oldScript.textContent && oldScript.textContent.trim().length > 0)) {
										var newScript = document.createElement('script');
										if (oldScript.src) {
											newScript.src = oldScript.src;
										} else {
											newScript.textContent = oldScript.textContent;
										}
										document.body.appendChild(newScript);
									}
								});
							} else {
								var tabContentInner = document.getElementById('tab-content-inner');
								if (tabContentInner) {
									tabContentInner.className = 'tab-content-inner aircraft-form-page';
									tabContentInner.innerHTML = html;
								} else {
									tabContent.innerHTML = html;
								}
							}
						})
						.catch(function() {
							var tabContentInner = document.getElementById('tab-content-inner');
							if (tabContentInner) {
								tabContentInner.innerHTML = '<h2>Edit Aircraft</h2><p>Form could not be loaded.</p>';
							} else {
								tabContent.innerHTML = '<div class="tab-content-inner"><h2>Edit Aircraft</h2><p>Form could not be loaded.</p></div>';
							}
						});
				}
			} else if (tabName.startsWith('Edit ') && tabName !== 'Edit Aircraft') {
				// Handle edit airport tabs - get airport ID from global or storage
				var airportId = window._editAirportId || sessionStorage.getItem('editAirportId');
				if (airportId) {
					fetch('/edit-airport/' + airportId + '/')
						.then(function(response) { return response.text(); })
						.then(function(html) {
							var parser = new DOMParser();
							var doc = parser.parseFromString(html, 'text/html');
							var form = doc.querySelector('.tab-content-inner');
							if (form) {
								var tabContentInner = document.getElementById('tab-content-inner');
								if (tabContentInner) {
									tabContentInner.className = form.className;
									tabContentInner.innerHTML = form.innerHTML;
								} else {
									tabContent.innerHTML = form.outerHTML;
								}
								// Execute inline scripts manually
								var scripts = doc.querySelectorAll('script');
								scripts.forEach(function(oldScript) {
									if (oldScript.src || (oldScript.textContent && oldScript.textContent.trim().length > 0)) {
										var newScript = document.createElement('script');
										if (oldScript.src) {
											newScript.src = oldScript.src;
										} else {
											newScript.textContent = oldScript.textContent;
										}
										document.body.appendChild(newScript);
									}
								});
							} else {
								var tabContentInner = document.getElementById('tab-content-inner');
								if (tabContentInner) {
									tabContentInner.className = 'tab-content-inner';
									tabContentInner.innerHTML = html;
								} else {
									tabContent.innerHTML = html;
								}
							}
						})
						.catch(function() {
							var tabContentInner = document.getElementById('tab-content-inner');
							if (tabContentInner) {
								tabContentInner.innerHTML = '<h2>Edit Airport</h2><p>Form could not be loaded.</p>';
							} else {
								tabContent.innerHTML = '<div class="tab-content-inner"><h2>Edit Airport</h2><p>Form could not be loaded.</p></div>';
							}
						});
				}
			} else if (tabName === 'Airports') {
				var container = document.getElementById('airport-list-container');
				tabContent.innerHTML = container.innerHTML;
				var addBtn = tabContent.querySelector('#add-airport-btn');
				if (addBtn) {
					addBtn.addEventListener('click', function() {
						if (!currentWorkspace) return;
						createTab('Add Airport', { nonClosable: false });
						setActiveTab('Add Airport');
					});
				}
				// Re-apply single-selection logic after tab content is loaded
				setTimeout(function() {
					var checkboxes = tabContent.querySelectorAll('.airport-select-checkbox');
					var editBtn = tabContent.querySelector('#edit-airport-btn-airport');
					function updateEditBtn() {
						if (editBtn) {
							editBtn.disabled = !Array.from(checkboxes).some(cb => cb.checked);
						}
					}
					checkboxes.forEach(function(checkbox) {
						checkbox.addEventListener('change', function() {
							if (this.checked) {
								checkboxes.forEach(function(cb) {
									if (cb !== this) cb.checked = false;
								}.bind(this));
							}
							updateEditBtn();
						});
					});
					updateEditBtn();
					if (editBtn) {
						editBtn.addEventListener('click', function() {
							var selected = Array.from(checkboxes).find(cb => cb.checked);
							if (selected) {
								// Get airport code for tab label
								var row = selected.closest('tr');
								var code = row ? row.querySelectorAll('td')[4].textContent : 'Airport';
								var tabLabel = 'Edit ' + code;
								createTab(tabLabel, { nonClosable: false });
								setActiveTab(tabLabel);
								fetch('/edit-airport/' + selected.value + '/')
									.then(function(response) { return response.text(); })
									.then(function(html) {
										var parser = new DOMParser();
										var doc = parser.parseFromString(html, 'text/html');
										var form = doc.querySelector('.tab-content-inner');
										if (form) {
											tabContent.innerHTML = form.outerHTML;
											var scripts = doc.querySelectorAll('script');
											scripts.forEach(function(oldScript) {
											});
										} else {/* omitted */}
									});
							}
						});
					}
				}, 50);
			} else if (tabName === 'Add Airport') {
				// Fetch the rendered form from the backend
				fetch('/add-airport/')
					.then(function(response) { return response.text(); })
					.then(function(html) {
						var parser = new DOMParser();
						var doc = parser.parseFromString(html, 'text/html');
						var form = doc.querySelector('.tab-content-inner');
						if (form) {
							tabContent.innerHTML = form.outerHTML;
							// Execute inline scripts manually (innerHTML doesn't execute them)
							var scripts = doc.querySelectorAll('script');
							scripts.forEach(function(oldScript) {
								if (oldScript.src || (oldScript.textContent && oldScript.textContent.trim().length > 0)) {
									var newScript = document.createElement('script');
									if (oldScript.src) {
										newScript.src = oldScript.src;
									} else {
										newScript.textContent = oldScript.textContent;
									}
									document.body.appendChild(newScript);
								}
							});
						} else {
							// Fallback: show the full HTML response so errors are visible
							tabContent.innerHTML = html;
						}
					})
					.catch(function() {
						tabContent.innerHTML = '<div class="tab-content-inner"><h2>Add Airport</h2><p>Form could not be loaded.</p></div>';
					});
			} else if (tabName === 'Routes') {
				fetch('/static/Routes.html')
					.then(function(response) { return response.text(); })
					.then(function(html) {
						tabContent.innerHTML = html;
						if (window.initializeRoutesTab) {
							window.initializeRoutesTab();
						}
					})
					.catch(function() {
						tabContent.innerHTML = '<div class="tab-content-inner"><h2>Routes</h2><p>Routes content could not be loaded.</p></div>';
					});
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
									'<div class="form-group">' +
									'<label for="other-tax">Other Tax</label>' +
									'<input type="number" id="other-tax" class="aircraft-form-control" placeholder="Enter other tax">' +
									'</div>' +
									'<div class="form-group">' +
									'<label for="country-import-profit">Country Import Profit</label>' +
									'<input type="number" id="country-import-profit" class="aircraft-form-control" placeholder="Enter country import profit">' +
									'</div>' +
									'</div>' +
									'</div>' +
									'</div></div>';
								// Wire up change handler
								setTimeout(function() {
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
													countrySel.innerHTML = countries.map(function(c) { return '<option value="' + c.country_code + '">' + c.name + '</option>'; }).join('');
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
					} else {
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
