// Checkbox and button logic for aircraft, airport, and provider tables
// Extracted from home.html

// Handle aircraft, airport, and charter provider checkboxes and buttons
function initializeCheckboxHandlers() {
    // Aircraft checkboxes and buttons
    const aircraftCheckboxes = document.querySelectorAll('.aircraft-select-checkbox');
    const editAircraftBtn = document.getElementById('edit-aircraft-btn');
    const deleteAircraftBtn = document.getElementById('delete-aircraft-btn');
    
    function updateAircraftButtons() {
        const anyChecked = Array.from(aircraftCheckboxes).some(cb => cb.checked);
        if (editAircraftBtn) editAircraftBtn.disabled = !anyChecked;
        if (deleteAircraftBtn) deleteAircraftBtn.disabled = !anyChecked;
    }
    
    aircraftCheckboxes.forEach(checkbox => {
        checkbox.removeEventListener('change', checkbox._checkboxHandler);
        checkbox._checkboxHandler = function() {
            if (this.checked) {
                aircraftCheckboxes.forEach(cb => {
                    if (cb !== this) cb.checked = false;
                });
            }
            updateAircraftButtons();
        };
        checkbox.addEventListener('change', checkbox._checkboxHandler);
    });
    updateAircraftButtons();
    
    if (editAircraftBtn && !editAircraftBtn._hasListener) {
        editAircraftBtn._hasListener = true;
        editAircraftBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const selected = Array.from(document.querySelectorAll('.aircraft-select-checkbox')).find(cb => cb.checked);
            if (selected && window.currentWorkspace) {
                window._editAircraftId = selected.value;
                sessionStorage.setItem('editAircraftId', selected.value);
                window.createTab('Edit Aircraft', { nonClosable: false });
                window.setActiveTab('Edit Aircraft');
            }
        });
    }
    
    if (deleteAircraftBtn && !deleteAircraftBtn._hasListener) {
        deleteAircraftBtn._hasListener = true;
        deleteAircraftBtn.addEventListener('click', function() {
            const selected = Array.from(document.querySelectorAll('.aircraft-select-checkbox')).find(cb => cb.checked);
            if (selected) {
                if (confirm('Are you sure you want to delete this Aircraft? This action cannot be undone.')) {
                    fetch('/delete-aircraft/' + selected.value + '/', {
                        method: 'POST',
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            const checkbox = document.querySelector('.aircraft-select-checkbox[value="' + selected.value + '"]');
                            if (checkbox) {
                                const row = checkbox.closest('tr');
                                if (row) row.remove();
                            }
                            initializeCheckboxHandlers();
                        } else {
                            alert('Error deleting aircraft: ' + (data.error || 'Unknown error'));
                        }
                    })
                    .catch(() => alert('Error deleting aircraft.'));
                }
            }
        });
    }
    
    // Airport checkboxes and buttons
    const airportCheckboxes = document.querySelectorAll('.airport-select-checkbox');
    const editAirportBtn = document.getElementById('edit-airport-btn-airport');
    const deleteAirportBtn = document.getElementById('delete-airport-btn-airport');
    
    function updateAirportButtons() {
        const anyChecked = Array.from(airportCheckboxes).some(cb => cb.checked);
        if (editAirportBtn) editAirportBtn.disabled = !anyChecked;
        if (deleteAirportBtn) deleteAirportBtn.disabled = !anyChecked;
    }
    
    airportCheckboxes.forEach(checkbox => {
        checkbox.removeEventListener('change', checkbox._checkboxHandler);
        checkbox._checkboxHandler = function() {
            if (this.checked) {
                airportCheckboxes.forEach(cb => {
                    if (cb !== this) cb.checked = false;
                });
            }
            updateAirportButtons();
        };
        checkbox.addEventListener('change', checkbox._checkboxHandler);
    });
    updateAirportButtons();
    
    if (editAirportBtn && !editAirportBtn._hasListener) {
        editAirportBtn._hasListener = true;
        editAirportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const selected = Array.from(document.querySelectorAll('.airport-select-checkbox')).find(cb => cb.checked);
            if (selected && window.currentWorkspace) {
                window._editAirportId = selected.value;
                sessionStorage.setItem('editAirportId', selected.value);
                const row = selected.closest('tr');
                const code = row ? row.querySelectorAll('td')[4].textContent : 'Airport';
                window._editAirportTabName = 'Edit ' + code;
                window.createTab(window._editAirportTabName, { nonClosable: false });
                window.setActiveTab(window._editAirportTabName);
            }
        });
    }
    
    if (deleteAirportBtn && !deleteAirportBtn._hasListener) {
        deleteAirportBtn._hasListener = true;
        deleteAirportBtn.addEventListener('click', function() {
            const selected = Array.from(document.querySelectorAll('.airport-select-checkbox')).find(cb => cb.checked);
            if (selected) {
                if (confirm('Are you sure you want to delete this Airport? This action cannot be undone.')) {
                    fetch('/delete-airport/' + selected.value + '/', {
                        method: 'POST',
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            const checkbox = document.querySelector('.airport-select-checkbox[value="' + selected.value + '"]');
                            if (checkbox) {
                                const row = checkbox.closest('tr');
                                if (row) row.remove();
                            }
                            initializeCheckboxHandlers();
                        } else {
                            alert('Error deleting airport: ' + (data.error || 'Unknown error'));
                        }
                    })
                    .catch(() => alert('Error deleting airport.'));
                }
            }
        });
    }
    
    // Charter Provider checkboxes and buttons
    const providerCheckboxes = document.querySelectorAll('.charter-provider-select-checkbox');
    const editProviderBtn = document.getElementById('edit-charter-provider-btn');
    const deleteProviderBtn = document.getElementById('delete-charter-provider-btn');
    
    function updateProviderButtons() {
        const anyChecked = Array.from(providerCheckboxes).some(cb => cb.checked);
        if (editProviderBtn) editProviderBtn.disabled = !anyChecked;
        if (deleteProviderBtn) deleteProviderBtn.disabled = !anyChecked;
    }
    
    providerCheckboxes.forEach(checkbox => {
        checkbox.removeEventListener('change', checkbox._checkboxHandler);
        checkbox._checkboxHandler = function() {
            if (this.checked) {
                providerCheckboxes.forEach(cb => {
                    if (cb !== this) cb.checked = false;
                });
            }
            updateProviderButtons();
        };
        checkbox.addEventListener('change', checkbox._checkboxHandler);
    });
    updateProviderButtons();
    
    if (editProviderBtn && !editProviderBtn._hasListener) {
        editProviderBtn._hasListener = true;
        editProviderBtn.addEventListener('click', function() {
            const selected = Array.from(document.querySelectorAll('.charter-provider-select-checkbox')).find(cb => cb.checked);
            if (selected) {
                alert('Edit provider ID: ' + selected.value);
            }
        });
    }
    
    if (deleteProviderBtn && !deleteProviderBtn._hasListener) {
        deleteProviderBtn._hasListener = true;
        deleteProviderBtn.addEventListener('click', function() {
            const selected = Array.from(document.querySelectorAll('.charter-provider-select-checkbox')).find(cb => cb.checked);
            if (selected) {
                if (confirm('Are you sure you want to delete this Charter Provider? This action cannot be undone.')) {
                    fetch('/delete-charter-provider/' + selected.value + '/', {
                        method: 'POST',
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            const checkbox = document.querySelector('.charter-provider-select-checkbox[value="' + selected.value + '"]');
                            if (checkbox) {
                                const row = checkbox.closest('tr');
                                if (row) row.remove();
                            }
                            initializeCheckboxHandlers();
                        } else {
                            alert('Error deleting provider: ' + (data.error || 'Unknown error'));
                        }
                    })
                    .catch(() => alert('Error deleting provider.'));
                }
            }
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeCheckboxHandlers);

// Re-initialize when content changes (for AJAX loaded content like Mode tab)
if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function(mutations) {
        initializeCheckboxHandlers();
    });
    document.addEventListener('DOMContentLoaded', function() {
        observer.observe(document.body, { childList: true, subtree: true });
    });
}

// Also expose globally so it can be called after AJAX loads
window.initializeCheckboxHandlers = initializeCheckboxHandlers;
