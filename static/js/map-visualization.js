// Map Visualization Module
// Handles rendering of interactive maps with region markers

/**
 * Initialize region map with colored airport markers by region
 * @param {Array} regions - Array of region names to display on map
 */
function initializeRegionMap(regions) {
	setTimeout(function() {
		var mapEl = document.getElementById('region-map');
		if (!mapEl) {
			console.error('Map element not found');
			return;
		}
		
		if (!window.L) {
			console.error('Leaflet library not found');
			return;
		}
		
		// Create map
		var map = L.map('region-map').setView([20, 0], 2);
		
		// Add tile layer
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors'
		}).addTo(map);
		
		console.log('Map initialized, fetching data...');
		
		// Define colors for each region with high contrast
		var regionColors = {
			'North America': '#FF0000',        // Bright Red
			'South America': '#00CC00',        // Bright Green
			'Europe': '#0000FF',               // Bright Blue
			'Western Europe': '#FF00FF',       // Magenta
			'Eastern Europe': '#FFA500',       // Orange
			'Africa': '#8B4513',               // Brown
			'Asia': '#FFD700',                 // Gold
			'Asia-Pacific': '#00CED1',         // Dark Turquoise
			'Middle East': '#9370DB',          // Medium Purple
			'Oceania': '#FF1493',              // Deep Pink
			'Central America': '#00FF00',      // Lime Green
			'South-Central America': '#32CD32', // Lime Green / Bright Green
			'Caribbean': '#4169E1',            // Royal Blue
			'Antarctica': '#00FFFF'            // Cyan
		};
		
		// Fetch all airports, countries, and branch/region info
		Promise.all([
			fetch('/api/airports/').then(function(r) { return r.json(); }),
			fetch('/api/regions/').then(function(r) { return r.json(); })
		])
		.then(function(results) {
			var airportsData = results[0].airports || [];
			var regionsData = results[1].regions || [];
			
			console.log('Fetched', airportsData.length, 'airports');
			
			// Fetch countries for all regions to build country-to-region mapping
			var countryRegionMap = {};
			var regionManagerMap = {};
			var countryManagerMap = {};
			var branchManagerMap = {};
			
			var regionPromises = regionsData.map(function(region) {
				return fetch('/api/countries-by-region/?region=' + encodeURIComponent(region))
					.then(function(response) { return response.json(); })
					.then(function(data) {
						var countries = data.countries || [];
						countries.forEach(function(country) {
							countryRegionMap[country.country_code] = region;
							countryRegionMap[country.name] = region;
							countryManagerMap[country.country_code] = country.country_manager || 'Not Assigned';
							countryManagerMap[country.name] = country.country_manager || 'Not Assigned';
							
							// Store region manager (assume it's the same for all countries in a region)
							if (!regionManagerMap[region]) {
								regionManagerMap[region] = country.region_manager || 'Not Assigned';
							}
						});
					});
			});
			
			Promise.all(regionPromises).then(function() {
				console.log('Country-region mapping built:', countryRegionMap);
				
				// Fetch branch info for all airports to get branch managers
				var branchPromises = airportsData.map(function(airport) {
					return fetch('/api/get-branch-info/?airport_code=' + encodeURIComponent(airport.iata_code))
						.then(function(response) { return response.json(); })
						.then(function(result) {
							if (result && result.success && result.data && result.data.branch_manager) {
								branchManagerMap[airport.iata_code] = result.data.branch_manager;
							} else {
								branchManagerMap[airport.iata_code] = 'Not Assigned';
							}
						})
						.catch(function() {
							// If no branch info, just skip
							branchManagerMap[airport.iata_code] = 'Not Assigned';
						});
				});
				
				Promise.all(branchPromises).then(function() {
					// Draw airports with colors based on their country's region
					airportsData.forEach(function(airport) {
						if (airport.latitude && airport.longitude) {
							var region = countryRegionMap[airport.country] || 'Unknown';
							var color = regionColors[region] || '#999999';
							var regionManager = regionManagerMap[region] || 'Not Assigned';
							var countryManager = countryManagerMap[airport.country] || 'Not Assigned';
							var branchManager = branchManagerMap[airport.iata_code] || 'Not Assigned';
							
							L.circleMarker([airport.latitude, airport.longitude], {
								radius: 6,
								color: color,
								fillColor: color,
								fillOpacity: 0.8,
								weight: 2
							})
							.bindTooltip(
								'<strong>' + airport.iata_code + '</strong><br>' + 
								airport.name + '<br>' + 
								'City: ' + airport.city + '<br>' +
								'Country: ' + (airport.country || 'N/A') + '<br>' +
								'Region: ' + region + '<br>' +
								'Region Manager: ' + regionManager + '<br>' +
								'Country Manager: ' + countryManager + '<br>' +
								'Branch Manager: ' + branchManager,
								{
									permanent: false,
									direction: 'top'
								}
							)
							.addTo(map);
						}
					});
					
					// Add legend
					var legend = L.control({position: 'bottomright'});
					legend.onAdd = function(map) {
						var div = L.DomUtil.create('div', 'info legend');
						div.style.background = 'white';
						div.style.padding = '10px';
						div.style.border = '2px solid #ccc';
						div.style.borderRadius = '5px';
						div.innerHTML = '<h4 style="margin:0 0 10px 0;">Regions</h4>';
						
						regionsData.forEach(function(region) {
							var color = regionColors[region] || '#999999';
							div.innerHTML += '<div style="margin:5px 0;"><span style="display:inline-block; width:20px; height:20px; background:' + color + '; border:1px solid #666; margin-right:5px; vertical-align:middle; opacity:0.8;"></span> ' + region + '</div>';
						});
						
						return div;
					};
					legend.addTo(map);
				});
			});
		})
		.catch(function(err) {
			console.error('Error fetching data:', err);
		});
	}, 200);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { initializeRegionMap };
}

