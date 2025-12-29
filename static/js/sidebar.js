// Sidebar and user menu logic extracted from home.html
// Handles sidebar icon clicks and user menu visibility

document.addEventListener('DOMContentLoaded', function() {
    var icons = document.querySelectorAll('.sidebar-icon');
    var optionsSidebarContent = document.getElementById('options-sidebar-content');
    var userMenu = document.getElementById('user-menu');
    icons.forEach(function(icon) {
        icon.addEventListener('click', function(e) {
            e.preventDefault();
            var label = icon.getAttribute('data-label');
            optionsSidebarContent.textContent = label + ' Options';
            if (label === 'User') {
                userMenu.style.display = 'block';
            } else {
                userMenu.style.display = 'none';
            }
        });
    });
    // Hide user menu by default
    userMenu.style.display = 'none';
});

// Local storage clearing logic for aircraft form
if (window.performance && performance.navigation && performance.navigation.type === 1) {
    // Hard reload (type 1)
    localStorage.removeItem('add_aircraft_form');
    localStorage.removeItem('add_aircraft_last_edited');
} else if (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]?.type === 'reload') {
    // Newer Navigation Timing API
    localStorage.removeItem('add_aircraft_form');
    localStorage.removeItem('add_aircraft_last_edited');
}
