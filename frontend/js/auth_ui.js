// frontend/js/auth_ui.js

// This script is intended to be included on pages that need to dynamically update UI elements
// based on the user's authentication status. For example, showing/hiding login/logout links.

document.addEventListener('DOMContentLoaded', function() {
    const authLinksContainer = document.getElementById('authLinks'); // Span containing login/register
    const logoutButton = document.getElementById('logoutButton');
    const dashboardLink = document.getElementById('dashboardLink'); // General dashboard link
    const postProjectLink = document.getElementById('postProjectLink'); // Link for clients to post projects
    const usernamePlaceholder = document.getElementById('usernamePlaceholder'); // For welcome messages
    const userTypePlaceholder = document.getElementById('userTypePlaceholder'); // For user type display

    // Attempt to get user data from localStorage (set by login.js)
    const storedUser = localStorage.getItem('currentUser');
    let currentUser = null;

    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
        } catch (e) {
            console.error("Error parsing stored user data:", e);
            localStorage.removeItem('currentUser'); // Clear corrupted data
        }
    }

    if (currentUser && currentUser.user_id) {
        // User is logged in
        if (authLinksContainer) {
            authLinksContainer.classList.add('hidden');
        }
        if (logoutButton) {
            logoutButton.classList.remove('hidden');
            logoutButton.addEventListener('click', handleLogout);
        }
        if (dashboardLink) {
            dashboardLink.classList.remove('hidden');
        }
        if (postProjectLink) {
            if (currentUser.user_type === 'client') {
                postProjectLink.classList.remove('hidden');
            } else {
                postProjectLink.classList.add('hidden');
            }
        }
        if (usernamePlaceholder) {
            usernamePlaceholder.textContent = currentUser.username || 'کاربر';
        }
        if (userTypePlaceholder) {
            userTypePlaceholder.textContent = currentUser.user_type === 'client' ? 'کارفرما' : (currentUser.user_type === 'freelancer' ? 'فریلنسر' : 'نامشخص');
        }

    } else {
        // User is not logged in
        if (authLinksContainer) {
            authLinksContainer.classList.remove('hidden');
        }
        if (logoutButton) {
            logoutButton.classList.add('hidden');
        }
        // Hide dashboard link if it should only be visible to logged-in users,
        // or change its text/behavior (e.g., redirect to login).
        // For now, assume dashboardLink might be visible but will redirect if accessed without auth.
        // Or, if it strictly requires auth:
        if (dashboardLink) { // Hide dashboard link if not logged in
            dashboardLink.classList.add('hidden');
        }
        if (postProjectLink) { // Hide post project link if not logged in
            postProjectLink.classList.add('hidden');
        }
    }
});

// Made handleLogout globally accessible for other scripts if needed, or specific logout buttons.
async function handleLogout() {
    // Added confirmation for logout
    if (!confirm('آیا مطمئن هستید که می‌خواهید خارج شوید؟')) {
        return;
    }
    try {
        // Assuming logout.php is set up to handle POST and clear session
        const response = await fetch('backend/php/logout.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();

        if (result.success) {
            clearCurrentUser(); // Use helper to clear localStorage
            window.location.href = 'index.html'; // Redirect to home after logout
        } else {
            // Use a more styled alert if available, for now, standard alert
            alert('خروج ناموفق بود: ' + (result.message || 'خطای سرور ناشناخته'));
        }
    } catch (error) {
        console.error('Error during logout:', error);
        alert('خطا در ارتباط با سرور هنگام خروج.');
    }
}

// Helper functions for managing user session in localStorage
// These are globally accessible if this script is loaded first.
function getCurrentUser() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        try {
            return JSON.parse(storedUser);
        } catch (e) {
            return null;
        }
    }
    return null;
}
function storeCurrentUser(userData) {
    localStorage.setItem('currentUser', JSON.stringify(userData));
}

function clearCurrentUser() {
    localStorage.removeItem('currentUser');
}
