
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
							'<div class="aircraft-form-row" style="margin-top:1.5rem;">' +
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
							'<div class="form-group" style="align-self: flex-end; margin-bottom: 0;">' +
							'<button id="edit-region-btn" class="primary-button" type="button">Edit Region</button>' +
							'</div>' +
							'</div></div>';
					})
					.catch(function() {
						tabContent.innerHTML = '<div class="tab-content-inner"><h2>Commercial Structure Management</h2><p>Could not load regions.</p></div>';
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
