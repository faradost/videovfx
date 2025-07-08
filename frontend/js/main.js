// frontend/js/main.js

document.addEventListener('DOMContentLoaded', function() {
    // console.log('DOM fully loaded and parsed for main.js');

    // Mobile menu toggle
    const menuButton = document.getElementById('mobileMenuButton');
    const navLinksContainer = document.getElementById('navLinksContainer');

    if (menuButton && navLinksContainer) {
        menuButton.addEventListener('click', function() {
            const isExpanded = menuButton.getAttribute('aria-expanded') === 'true' || false;
            menuButton.setAttribute('aria-expanded', !isExpanded);
            navLinksContainer.classList.toggle('hidden');
            // Optional: Change icon on toggle
            if (!isExpanded) {
                // Change to close icon (X)
                menuButton.innerHTML = `
                    <span class="sr-only">بستن منوی اصلی</span>
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                `;
            } else {
                // Change back to menu icon (hamburger)
                menuButton.innerHTML = `
                    <span class="sr-only">باز کردن منوی اصلی</span>
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                `;
            }
        });
    }

    // Small script to update main page buttons based on auth status
    // This is also present inline in index.html, but can be centralized here if preferred.
    // For this example, let's assume the inline script in index.html handles its specific buttons.
    // If this script (main.js) is meant to be global, ensure it doesn't conflict.
    // The `auth_ui.js` script already handles the common header links like #authLinks, #dashboardLink, #logoutButton.

    // Example for a smooth scroll to sections (if you have anchor links)
    // document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    //     anchor.addEventListener('click', function (e) {
    //         e.preventDefault();
    //         document.querySelector(this.getAttribute('href')).scrollIntoView({
    //             behavior: 'smooth'
    //         });
    //     });
    // });

});
