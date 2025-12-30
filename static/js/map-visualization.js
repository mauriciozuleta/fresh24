// Map Visualization Module
// Handles rendering of interactive maps with region markers

/**
 * Initialize region map with tooltips
 * @param {Array} regions - Array of region names to display on map
 */
function initializeRegionMap(regions) {
	setTimeout(function() {
		var mapEl = document.getElementById('region-map');
		if (!mapEl || !window.L) {
			console.error('Map element or Leaflet library not found');
			return;
		}
		
		// Create map
		var map = L.map('region-map').setView([20, 0], 2);
		
		// Add tile layer
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors'
		}).addTo(map);
		
		// Create markers for each region
		regions.forEach(function(region, idx) {
			var lat = 20 + (idx * 15);
			var lng = -80 + (idx * 40);
			
			// Create a circle marker for each region
			var marker = L.circle([lat, lng], {
				color: '#0078d4',
				fillColor: '#0078d4',
				fillOpacity: 0.3,
				radius: 500000
			}).addTo(map);
			
			// Bind tooltip with region info
			marker.bindTooltip('<strong>' + region + '</strong><br>Click for details', {
				permanent: false,
				direction: 'top'
			});
			
			// Optional: add click handler
			marker.on('click', function() {
				alert('Region: ' + region);
			});
		});
	}, 100);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { initializeRegionMap };
}
