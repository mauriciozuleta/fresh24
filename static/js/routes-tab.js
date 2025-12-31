// Routes tab logic extracted from home.html
// Handles dropdowns, table population, and state for the Routes tab

// Initialize Routes tab dropdowns and button
window.initializeRoutesTab = function() {
    var departureSelect = document.getElementById('departure-select');
    var arrivalSelect = document.getElementById('arrival-select');
    var recordsContainer = document.getElementById('route-records-container');
    if (!departureSelect || !arrivalSelect || !recordsContainer) return;

    function populateDropdown(select, airports, excludeCode, selectedValue) {
        var which = select.id.indexOf('departure') !== -1 ? 'departure' : 'arrival';
        select.innerHTML = '<option value="">Select ' + which + ' airport</option>';
        airports.forEach(function(airport) {
            if (!excludeCode || airport.code !== excludeCode) {
                var opt = document.createElement('option');
                opt.value = airport.code;
                opt.textContent = airport.code + ' - ' + airport.name;
                if (selectedValue && airport.code === selectedValue) opt.selected = true;
                select.appendChild(opt);
            }
        });
    }

    // Restore last state if available
    var lastState = null;
    try {
        lastState = JSON.parse(localStorage.getItem('routes_tab_state') || '{}');
    } catch (e) { lastState = {}; }

    var airports = [];

    fetch('/api/airports/')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            airports = data.airports || [];
            var lastDep = lastState.departure || '';
            var lastArr = lastState.arrival || '';
            populateDropdown(departureSelect, airports, null, lastDep);
            if (lastDep) {
                arrivalSelect.disabled = false;
                populateDropdown(arrivalSelect, airports, lastDep, lastArr);
            } else {
                arrivalSelect.disabled = true;
                populateDropdown(arrivalSelect, airports, null, '');
            }
            
            departureSelect.addEventListener('change', function() {
                var selectedDeparture = departureSelect.value;
                if (selectedDeparture) {
                    arrivalSelect.disabled = false;
                    populateDropdown(arrivalSelect, airports, selectedDeparture);
                } else {
                    arrivalSelect.disabled = true;
                    populateDropdown(arrivalSelect, airports);
                }
                arrivalSelect.value = '';
                recordsContainer.innerHTML = '';
                saveState();
                loadRouteInfo();
            });
            
            arrivalSelect.addEventListener('change', function() {
                saveState();
                loadRouteInfo();
            });
            
            // Restore table if present
            if (lastState.tableHtml && lastDep && lastArr) {
                recordsContainer.innerHTML = lastState.tableHtml;
            }
        })
        .catch(function(err) {
            console.error('Failed to load airports for Routes tab', err);
        });

    function saveState(tableHtml) {
        var state = {
            departure: departureSelect.value,
            arrival: arrivalSelect.value,
            tableHtml: tableHtml !== undefined ? tableHtml : (recordsContainer ? recordsContainer.innerHTML : '')
        };
        localStorage.setItem('routes_tab_state', JSON.stringify(state));
    }

    function loadRouteInfo() {
        var dep = departureSelect.value;
        var arr = arrivalSelect.value;
        recordsContainer.innerHTML = '';
        if (!dep || !arr) {
            recordsContainer.innerHTML = '<div style="color:#f44336;">Please select both departure and arrival airports.</div>';
            saveState();
            return;
        }
        recordsContainer.innerHTML = '<div>Loading route records...</div>';
        fetch('/api/route-records/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({departure: dep, arrival: arr})
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.routes && data.routes.length > 0) {
                // Filter out routes where distance > max_range_with_max_fuel
                var filteredRoutes = data.routes.filter(function(route) {
                    // If max_range_with_max_fuel is not present, allow the route
                    if (route.max_range_with_max_fuel === undefined || route.max_range_with_max_fuel === null) return true;
                    // If distance is not present, allow the route
                    if (route.distance === undefined || route.distance === null) return true;
                    return Number(route.distance) <= Number(route.max_range_with_max_fuel);
                });
                if (filteredRoutes.length > 0) {
                    var table = document.createElement('table');
                    table.style.width = '100%';
                    table.style.borderCollapse = 'collapse';
                    table.style.background = '#23272e';
                    table.style.color = '#fff';
                    table.style.marginTop = '1.5rem';
                    var thead = document.createElement('thead');
                    var hideFields = ['route_fuel_gls','fuel_cost','overflight_fee','overflight_cost','airport_fees_cost'];
                    var fields = Object.keys(filteredRoutes[0]).filter(function(f){ return hideFields.indexOf(f) === -1; });
                    var tr = document.createElement('tr');
                    tr.style.background = '#26304a';
                    fields.forEach(function(f) {
                        var th = document.createElement('th');
                        th.textContent = f.replace(/_/g, ' ').toUpperCase();
                        th.style.padding = '0.75rem';
                        th.style.textAlign = 'left';
                        th.style.borderBottom = '2px solid #4fc3f7';
                        tr.appendChild(th);
                    });
                    thead.appendChild(tr);
                    table.appendChild(thead);
                    var tbody = document.createElement('tbody');
                    filteredRoutes.forEach(function(route) {
                        var tr = document.createElement('tr');
                        tr.style.borderBottom = '1px solid #333';
                        fields.forEach(function(f) {
                            var td = document.createElement('td');
                            var value = route[f];
                            // If value is a number, format to 2 decimals
                            if (typeof value === 'number') {
                                td.textContent = value.toFixed(2);
                            } else if (!isNaN(value) && value !== null && value !== undefined && value !== '') {
                                // If value is a string that can be converted to a number
                                var num = Number(value);
                                if (!isNaN(num)) {
                                    td.textContent = num.toFixed(2);
                                } else {
                                    td.textContent = value;
                                }
                            } else {
                                td.textContent = value !== null && value !== undefined ? value : '';
                            }
                            td.style.padding = '0.75rem';
                            tr.appendChild(td);
                        });
                        tbody.appendChild(tr);
                    });
                    table.appendChild(tbody);
                    recordsContainer.innerHTML = '';
                    recordsContainer.appendChild(table);
                    saveState(recordsContainer.innerHTML);
                } else {
                    recordsContainer.innerHTML = '<div>No route records found for this pair (all routes exceed aircraft max range with max fuel).</div>';
                    saveState();
                }
            } else {
                recordsContainer.innerHTML = '<div>No route records found for this pair.</div>';
                saveState();
            }
        })
        .catch(function(err) {
            recordsContainer.innerHTML = '<div style="color:#f44336;">Failed to load route records.</div>';
            saveState();
            console.error('Failed to load route records', err);
        });
    }
};
