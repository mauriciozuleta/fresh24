// User Management Module
// Handles region, country, and branch management UI and logic

var UserManagement = {
	/**
	 * Setup airports dropdown based on selected country
	 */
	setupCountryAirports: function() {
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
			ApiService.fetchAirportsByCountry(country).then(function(airports) {
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
	},

	/**
	 * Setup region countries dropdown
	 */
	setupRegionCountries: function() {
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
			ApiService.fetchCountriesByRegion(region).then(function(countries) {
				if (countries.length > 0) {
					countrySelect.innerHTML = countries.map(function(country) {
						return '<option value="' + (country.code || country.country_code) + '">' + country.name + '</option>';
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
	},

	/**
	 * Setup management UI logic for dynamic button labels and dropdown states
	 */
	setupManagementUI: function() {
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
				
				ApiService.checkRegionInfo(region).then(function(data) {
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
				
				ApiService.saveRegionInfo({
					region: region,
					regional_manager: manager,
					region_user: user
				}).then(function(data) {
					if (data.success) {
						alert('Region info saved successfully');
						editRegionBtn.textContent = 'Edit Region';
						countrySelect.disabled = false;
						UserManagement.loadManagementTable();
					} else {
						alert('Error: ' + (data.error || 'Unknown error'));
					}
				});
			});
		}

		// Country selection handler
		if (countrySelect && addCountryBtn) {
			countrySelect.addEventListener('change', function() {
				var country = countrySelect.value;
				if (!country) {
					addCountryBtn.textContent = 'Add Country';
					countryManager.value = '';
					countryUser.value = '';
					airportSelect.disabled = true;
					return;
				}
				
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
						UserManagement.loadManagementTable();
					} else {
						alert('Error: ' + (data.error || 'Unknown error'));
					}
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
				
				ApiService.checkBranchInfo(airport).then(function(data) {
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
				
				ApiService.saveBranchInfo({
					airport: airport,
					country: country,
					branch_manager: manager,
					branch_user: user
				}).then(function(data) {
					if (data.success) {
						alert('Branch info saved successfully');
						addBranchBtn.textContent = 'Branch Information';
						UserManagement.loadManagementTable();
					} else {
						alert('Error: ' + (data.error || 'Unknown error'));
					}
				});
			});
		}
	},

	/**
	 * Load and render management table data
	 */
	loadManagementTable: function() {
		ApiService.fetchManagementTableData().then(function(data) {
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
		});
	}
};

// Expose legacy function names for backward compatibility
function setupCountryAirports() { UserManagement.setupCountryAirports(); }
function setupManagementUI() { UserManagement.setupManagementUI(); }
function loadManagementTable() { UserManagement.loadManagementTable(); }
function setupRegionCountries() { UserManagement.setupRegionCountries(); }

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
	module.exports = UserManagement;
}
