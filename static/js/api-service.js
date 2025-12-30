// API Service Module
// Centralized API calls with consistent error handling

var ApiService = {
	/**
	 * Fetch regions from API
	 * @returns {Promise<Array>} Array of region names
	 */
	fetchRegions: function() {
		return fetch('/api/regions/')
			.then(function(response) { return response.json(); })
			.then(function(data) { return data.regions || []; })
			.catch(function(err) {
				console.error('Error fetching regions:', err);
				return [];
			});
	},

	/**
	 * Fetch countries by region
	 * @param {string} region - Region name
	 * @returns {Promise<Array>} Array of countries
	 */
	fetchCountriesByRegion: function(region) {
		return fetch('/api/countries-by-region/?region=' + encodeURIComponent(region))
			.then(function(response) { return response.json(); })
			.then(function(data) { return data.countries || []; })
			.catch(function(err) {
				console.error('Error fetching countries:', err);
				return [];
			});
	},

	/**
	 * Fetch airports by country
	 * @param {string} country - Country code
	 * @returns {Promise<Array>} Array of airports
	 */
	fetchAirportsByCountry: function(country) {
		return fetch('/api/airports-by-country/?country=' + encodeURIComponent(country))
			.then(function(response) { return response.json(); })
			.then(function(data) { return data.airports || []; })
			.catch(function(err) {
				console.error('Error fetching airports:', err);
				return [];
			});
	},

	/**
	 * Check if region info exists
	 * @param {string} region - Region name
	 * @returns {Promise<Object>} Region info data
	 */
	checkRegionInfo: function(region) {
		return fetch('/api/check-region-info/?region=' + encodeURIComponent(region))
			.then(function(response) { return response.json(); })
			.catch(function(err) {
				console.error('Error checking region info:', err);
				return { exists: false };
			});
	},

	/**
	 * Save region information
	 * @param {Object} data - Region data to save
	 * @returns {Promise<Object>} Response data
	 */
	saveRegionInfo: function(data) {
		return fetch('/api/save-region-info/', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		})
		.then(function(response) { return response.json(); })
		.catch(function(err) {
			console.error('Error saving region info:', err);
			return { success: false, error: err.message };
		});
	},

	/**
	 * Check if branch info exists
	 * @param {string} airport - Airport code
	 * @returns {Promise<Object>} Branch info data
	 */
	checkBranchInfo: function(airport) {
		return fetch('/api/check-branch-info/?airport=' + encodeURIComponent(airport))
			.then(function(response) { return response.json(); })
			.catch(function(err) {
				console.error('Error checking branch info:', err);
				return { exists: false };
			});
	},

	/**
	 * Save branch information
	 * @param {Object} data - Branch data to save
	 * @returns {Promise<Object>} Response data
	 */
	saveBranchInfo: function(data) {
		return fetch('/api/save-branch-info/', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		})
		.then(function(response) { return response.json(); })
		.catch(function(err) {
			console.error('Error saving branch info:', err);
			return { success: false, error: err.message };
		});
	},

	/**
	 * Fetch management table data
	 * @returns {Promise<Array>} Table data
	 */
	fetchManagementTableData: function() {
		return fetch('/api/get-management-table-data/')
			.then(function(response) { return response.json(); })
			.then(function(response) { return response.data || []; })
			.catch(function(err) {
				console.error('Error fetching table data:', err);
				return [];
			});
	}
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
	module.exports = ApiService;
}
