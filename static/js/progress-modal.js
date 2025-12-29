// Progress modal helpers extracted from home.html
// Handles showing and hiding the progress modal

window.showProgressModal = function(title, message) {
  document.getElementById('progress-modal-title').textContent = title || 'Saving...';
  document.getElementById('progress-modal-message').textContent = message || 'Please wait while the system updates.';
  document.getElementById('progress-modal').style.display = 'flex';
};
window.hideProgressModal = function() {
  document.getElementById('progress-modal').style.display = 'none';
};
