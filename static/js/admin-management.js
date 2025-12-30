// Admin Management Module
// Handles Aircraft, Airports, Routes, and Region Core Data tabs

var AdminManagement = {
	/**
	 * Render Aircraft list tab
	 */
	renderAircraftTab: function(tabContent, createTab, setActiveTab, currentWorkspace) {
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
		// Re-apply single-selection logic after tab content is loaded
		setTimeout(function() {
			// Aircraft checkbox and edit button logic would go here if needed
		}, 50);
	},

	/**
	 * Render Add Aircraft form tab
	 */
	renderAddAircraftTab: function(tabContent) {
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
	},

	/**
	 * Render Edit Aircraft form tab
	 */
	renderEditAircraftTab: function(tabContent) {
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
	},

	/**
	 * Render Edit Airport form tab
	 */
	renderEditAirportTab: function(tabContent) {
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
	},

	/**
	 * Render Airports list tab
	 */
	renderAirportsTab: function(tabContent, createTab, setActiveTab, currentWorkspace) {
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
										// Script execution handled elsewhere
									});
								}
							});
					}
				});
			}
		}, 50);
	},

	/**
	 * Render Add Airport form tab
	 */
	renderAddAirportTab: function(tabContent) {
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
	},

	/**
	 * Render Routes tab
	 */
	renderRoutesTab: function(tabContent) {
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
	},

	/**
	 * Render Mode tab
	 */
	renderModeTab: function(tabContent) {
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
	}
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
	module.exports = AdminManagement;
}
