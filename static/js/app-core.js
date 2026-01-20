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
	window.workspaces = workspaces;
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
			} else if (window._editAirportTabName && tabName === window._editAirportTabName) {
				// Edit Airport tabs use a dynamic label stored in window._editAirportTabName
				AdminManagement.renderEditAirportTab(tabContent);
			} else if (tabName === 'Airports') {
				AdminManagement.renderAirportsTab(tabContent, createTab, setActiveTab, currentWorkspace);
			} else if (tabName === 'Add Airport') {
				AdminManagement.renderAddAirportTab(tabContent);
			} else if (tabName === 'Routes') {
				AdminManagement.renderRoutesTab(tabContent);
						} else if (tabName === 'Export') {
								if (window.UserMarketData && typeof UserMarketData.renderExportTab === 'function') {
										UserMarketData.renderExportTab(tabContent);
								} else {
										tabContent.innerHTML = '<div class="tab-content-inner"><h2>Export User Market Data</h2><p>Export functionality coming soon.</p></div>';
								}
			} else if (tabName === 'Import') {
				if (window.UserMarketData && typeof UserMarketData.renderImportTab === 'function') {
					UserMarketData.renderImportTab(tabContent);
				} else {
					tabContent.innerHTML = '<div class="tab-content-inner"><h2>Import User Market Data</h2><p>Import functionality coming soon.</p></div>';
				}
			} else if (tabName === 'Market Analysis') {
				if (window.AdminMarketAnalysis && typeof AdminMarketAnalysis.renderMarketAnalysisTab === 'function') {
					AdminMarketAnalysis.renderMarketAnalysisTab(tabContent);
				} else {
					tabContent.innerHTML = '<div class="tab-content-inner"><h2>Market Analysis</h2><p>Market Analysis module not available.</p></div>';
				}
			} else if (tabName === 'User Management') {
				// Load User Management tab content from backend template and execute its scripts
				fetch('/user-management-tab/')
					.then(function(response) { return response.text(); })
					.then(function(html) {
						var parser = new DOMParser();
						var doc = parser.parseFromString(html, 'text/html');
						var content = doc.querySelector('.tab-content-inner');
						if (content) {
							var tabContentInner = document.getElementById('tab-content-inner');
							if (tabContentInner) {
								tabContentInner.className = content.className;
								tabContentInner.innerHTML = content.innerHTML;
							} else {
								tabContent.innerHTML = content.outerHTML;
							}
							// Execute inline/external scripts from the template
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
							// Fallback: inject full HTML
							tabContent.innerHTML = html;
						}
					})
					.catch(function(err) {
						console.error('Error loading User Management tab:', err);
						tabContent.innerHTML = '<div class="tab-content-inner"><h2>Commercial Structure Management</h2><p>Could not load content.</p></div>';
					});
					} else if (tabName === 'Region Core Data') {
						// Load Region Core Data tab from backend template and execute its scripts
						fetch('/region-core-data-tab/')
							.then(function(response) { return response.text(); })
							.then(function(html) {
								var parser = new DOMParser();
								var doc = parser.parseFromString(html, 'text/html');
								var content = doc.querySelector('.tab-content-inner');
								if (content) {
									var tabContentInner = document.getElementById('tab-content-inner');
									if (tabContentInner) {
										tabContentInner.className = content.className;
										tabContentInner.innerHTML = content.innerHTML;
									} else {
										tabContent.innerHTML = content.outerHTML;
									}
									// Execute inline/external scripts from the template
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
									// Fallback: inject full HTML
									tabContent.innerHTML = html;
								}
							})
							.catch(function(err) {
								console.error('Error loading Region Core Data tab:', err);
								tabContent.innerHTML = '<div class="tab-content-inner"><h2>Region Core Data</h2><p>Could not load content.</p></div>';
							});
					} else if (tabName === 'Branch Information') {
						// Load Branch Information tab content from backend template and execute its scripts
						fetch('/branch-information-tab/')
							.then(function(response) { return response.text(); })
							.then(function(html) {
								var parser = new DOMParser();
								var doc = parser.parseFromString(html, 'text/html');
								var content = doc.querySelector('.tab-content-inner');
								if (content) {
									var tabContentInner = document.getElementById('tab-content-inner');
									if (tabContentInner) {
										tabContentInner.className = content.className;
										tabContentInner.innerHTML = content.innerHTML;
									} else {
										tabContent.innerHTML = content.outerHTML;
									}
									// Execute inline/external scripts from the template
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
									// Fallback: inject full HTML
									tabContent.innerHTML = html;
								}
							})
							.catch(function(err) {
								console.error('Error loading Branch Information tab:', err);
								tabContent.innerHTML = '<div class="tab-content-inner"><h2>Branch Information</h2><p>Could not load content.</p></div>';
							});
		} else if (tabName === 'Add Products') {
			// Load Add Product form from backend and execute its scripts
			fetch('/add-product-form/')
				.then(function(response) { return response.text(); })
				.then(function(html) {
					var parser = new DOMParser();
					var doc = parser.parseFromString(html, 'text/html');
					var content = doc.querySelector('.tab-content-inner');
					if (content) {
						var tabContentInner = document.getElementById('tab-content-inner');
						if (tabContentInner) {
							tabContentInner.className = content.className;
							tabContentInner.innerHTML = content.innerHTML;
						} else {
							tabContent.innerHTML = content.outerHTML;
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
						// Fallback: inject full HTML
						tabContent.innerHTML = html;
					}
				})
				.catch(function(err) {
					console.error('Error loading Add Product form:', err);
					tabContent.innerHTML = '<div class="tab-content-inner"><h2>Add Products</h2><p>Error loading form.</p></div>';
				});
		} else if (tabName.startsWith('Edit ')) {
			// Generic handler for Edit tabs that belong to products.
			// We distinguish product tabs by the presence of dataset.productCode on the tab element.
			var ws = workspaces[currentWorkspace];
			var tab = ws.openTabs[tabName];
			console.log('Edit tab detected:', tabName, 'Tab element:', tab, 'Dataset:', tab ? tab.dataset : null);
			if (tab && tab.dataset && tab.dataset.productCode) {
				var productCode = tab.dataset.productCode;
				console.log('Loading edit form for product code:', productCode);
				fetch('/edit-product-form/' + encodeURIComponent(productCode) + '/')
					.then(function(response) { return response.text(); })
					.then(function(html) {
						var parser = new DOMParser();
						var doc = parser.parseFromString(html, 'text/html');
						var content = doc.querySelector('.tab-content-inner');
						if (content) {
							var tabContentInner = document.getElementById('tab-content-inner');
							if (tabContentInner) {
								tabContentInner.className = content.className;
								tabContentInner.innerHTML = content.innerHTML;
							} else {
								tabContent.innerHTML = content.outerHTML;
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
							// Fallback: inject full HTML
							tabContent.innerHTML = html;
						}
					})
					.catch(function(err) {
						console.error('Error loading Edit Product form:', err);
						tabContent.innerHTML = '<div class="tab-content-inner"><h2>' + tabName + '</h2><p>Could not load product form.</p></div>';
					});
			} else {
				// Edit tab without productCode belongs to another feature (e.g. airports); let its own handler manage it.
				console.log('Edit tab without productCode; skipping product handler');
			}
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

// Render Add Product form
// renderAddProductTab function removed - now using backend template from /add-product-form/

