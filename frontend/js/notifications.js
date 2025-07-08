// frontend/js/notifications.js
document.addEventListener('DOMContentLoaded', function() {
    const notificationsListContainer = document.getElementById('notificationsListContainer');
    const loadingMsgElement = document.getElementById('loadingNotificationsMsg');
    const paginationControlsDiv = document.getElementById('notificationsPaginationControls');
    const markAllReadButton = document.getElementById('markAllReadButton');

    const currentUser = getCurrentUser(); // From auth_ui.js

    if (!currentUser) {
        window.location.href = 'login.html?redirect=notifications.html';
        return;
    }

    let currentPage = 1;
    const notificationsPerPage = 15;

    function showLoadingState(isLoading) {
        if (isLoading) {
            if (loadingMsgElement) {
                loadingMsgElement.innerHTML = '<div class="flex justify-center items-center py-10"><div class="spinner"></div><span class="loading-text mr-2">در حال بارگذاری اعلانات...</span></div>';
                loadingMsgElement.style.display = 'block';
            }
            if (notificationsListContainer && notificationsListContainer !== loadingMsgElement) notificationsListContainer.innerHTML = ''; // Clear previous
            if (paginationControlsDiv) paginationControlsDiv.classList.add('hidden');
        } else {
            if (loadingMsgElement) loadingMsgElement.style.display = 'none';
        }
    }

    async function fetchNotifications(page = 1) {
        showLoadingState(true);
        try {
            const response = await fetch(`backend/php/get_all_notifications.php?page=${page}&limit=${notificationsPerPage}`);
            const result = await response.json();
            showLoadingState(false);

            if (result.success && result.notifications) {
                displayNotifications(result.notifications);
                setupPagination(result.pagination);
                if(result.notifications.length === 0 && result.pagination.totalNotifications === 0){
                     notificationsListContainer.innerHTML = '<p class="text-gray-500 text-center py-6">در حال حاضر هیچ اعلانی برای شما وجود ندارد.</p>';
                }
            } else {
                notificationsListContainer.innerHTML = `<div class="alert alert-danger">${result.message || 'خطا در بارگذاری اعلانات.'}</div>`;
            }
        } catch (error) {
            showLoadingState(false);
            console.error('Error fetching notifications:', error);
            notificationsListContainer.innerHTML = '<div class="alert alert-danger">خطا در ارتباط با سرور.</div>';
        }
    }

    function displayNotifications(notifications) {
        if (!notificationsListContainer) return;
        notificationsListContainer.innerHTML = ''; // Clear loading or previous

        if (notifications.length === 0 && currentPage === 1) { // Check for current page too, in case of empty subsequent pages
            notificationsListContainer.innerHTML = '<p class="text-gray-500 text-center py-6">در حال حاضر هیچ اعلانی برای شما وجود ندارد.</p>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'space-y-3';

        notifications.forEach(notif => {
            const li = document.createElement('li');
            li.className = `p-4 border-r-4 rounded-md transition-all duration-200 ease-in-out ${notif.is_read ? 'bg-gray-100 border-gray-300 opacity-75 hover:opacity-100' : 'bg-blue-50 border-blue-500 hover:shadow-md'}`;
            li.dataset.notificationId = notif.notification_id;

            const link = document.createElement('a');
            link.href = notif.link || '#';
            link.className = 'block group';
            if (notif.link && notif.link !== '#') {
                link.target = '_blank'; // Open actual links in new tab
                link.rel = 'noopener noreferrer';
            }

            const messageP = document.createElement('p');
            messageP.className = `text-sm ${notif.is_read ? 'text-gray-700' : 'text-gray-800 group-hover:text-blue-700 font-medium'}`;
            messageP.textContent = notif.message;

            const dateP = document.createElement('p');
            dateP.className = `text-xs mt-1 ${notif.is_read ? 'text-gray-400' : 'text-gray-500 group-hover:text-gray-600'}`;
            dateP.textContent = notif.created_at_formatted;

            link.appendChild(messageP);
            link.appendChild(dateP);
            li.appendChild(link);

            if (!notif.is_read) {
                li.addEventListener('click', (e) => {
                    // If the click is not on an actual link inside the notification text itself, mark as read.
                    if (e.target.tagName !== 'A' || !e.target.href || e.target.href === '#') {
                       // Allow default behavior for actual links, but mark as read if it's just a wrapper or no specific link.
                    }
                    markNotificationAsRead(notif.notification_id, li);
                });
            }
            ul.appendChild(li);
        });
        notificationsListContainer.appendChild(ul);
    }

    async function markNotificationAsRead(notificationId, listItemElement) {
        try {
            const response = await fetch('backend/php/mark_notification_read.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notification_id: notificationId })
            });
            const result = await response.json();
            if (result.success) {
                if (listItemElement) {
                    listItemElement.classList.remove('bg-blue-50', 'border-blue-500', 'hover:shadow-md');
                    listItemElement.classList.add('bg-gray-100', 'border-gray-300', 'opacity-75', 'hover:opacity-100');
                    listItemElement.querySelector('p:first-child').classList.remove('text-gray-800', 'group-hover:text-blue-700', 'font-medium');
                    listItemElement.querySelector('p:first-child').classList.add('text-gray-700');
                    listItemElement.querySelector('p:last-child').classList.remove('text-gray-500', 'group-hover:text-gray-600');
                    listItemElement.querySelector('p:last-child').classList.add('text-gray-400');
                    // Remove click listener to prevent re-marking
                    listItemElement.replaceWith(listItemElement.cloneNode(true));
                }
                // Potentially update unread count in UI if displayed elsewhere
            } else {
                console.warn("Failed to mark notification as read on server:", result.message);
            }
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    }

    if (markAllReadButton) {
        markAllReadButton.addEventListener('click', async () => {
            if (!confirm('آیا مطمئن هستید که می‌خواهید تمام اعلانات را به عنوان خوانده شده علامت بزنید؟')) return;
            try {
                const response = await fetch('backend/php/mark_notification_read.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mark_all: true })
                });
                const result = await response.json();
                if (result.success) {
                    alert('تمام اعلانات به عنوان خوانده شده علامت زده شدند.');
                    fetchNotifications(currentPage); // Refresh the list
                } else {
                    alert('خطا: ' + result.message);
                }
            } catch (error) {
                console.error("Error marking all notifications as read:", error);
                alert('خطا در ارتباط با سرور.');
            }
        });
    }

    function setupPagination(paginationData) {
        if (!paginationControlsDiv || !paginationData || paginationData.totalPages <= 1) {
            if(paginationControlsDiv) paginationControlsDiv.innerHTML = ''; // Clear if no pagination needed
            return;
        }
        paginationControlsDiv.innerHTML = ''; // Clear existing controls
        paginationControlsDiv.classList.remove('hidden');

        const { currentPage, totalPages } = paginationData;

        if (totalPages > 1) {
            const prevButton = document.createElement('button');
            prevButton.innerHTML = '&rarr; بعدی'; // RTL: Next page is to the right
            prevButton.className = 'btn btn-secondary py-1 px-3 text-sm mx-1';
            if (currentPage >= totalPages) prevButton.disabled = true; // RTL: Next is actually previous page number
            prevButton.addEventListener('click', () => fetchNotifications(currentPage + 1));
            paginationControlsDiv.appendChild(prevButton);
        }

        // Page numbers (simplified) - show a few pages around current
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            const firstButton = document.createElement('button');
            firstButton.textContent = '1';
            firstButton.className = 'btn btn-secondary py-1 px-3 text-sm mx-1';
            firstButton.addEventListener('click', () => fetchNotifications(1));
            paginationControlsDiv.appendChild(firstButton);
            if (startPage > 2) {
                 const dots = document.createElement('span');
                 dots.textContent = '...';
                 dots.className = 'px-2 py-1';
                 paginationControlsDiv.appendChild(dots);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = `btn ${i === currentPage ? 'btn-primary' : 'btn-secondary'} py-1 px-3 text-sm mx-1`;
            if (i === currentPage) pageButton.disabled = true;
            pageButton.addEventListener('click', () => fetchNotifications(i));
            paginationControlsDiv.appendChild(pageButton);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                 const dots = document.createElement('span');
                 dots.textContent = '...';
                 dots.className = 'px-2 py-1';
                 paginationControlsDiv.appendChild(dots);
            }
            const lastButton = document.createElement('button');
            lastButton.textContent = totalPages;
            lastButton.className = 'btn btn-secondary py-1 px-3 text-sm mx-1';
            lastButton.addEventListener('click', () => fetchNotifications(totalPages));
            paginationControlsDiv.appendChild(lastButton);
        }


        if (totalPages > 1) {
             const nextButton = document.createElement('button');
            nextButton.innerHTML = 'قبلی &larr;'; // RTL: Previous page is to the left
            nextButton.className = 'btn btn-secondary py-1 px-3 text-sm mx-1';
            if (currentPage <= 1) nextButton.disabled = true; // RTL: Prev is actually next page number
            nextButton.addEventListener('click', () => fetchNotifications(currentPage - 1));
            paginationControlsDiv.appendChild(nextButton);
        }
    }

    // Helper: Get current user from localStorage
    function getCurrentUser() {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try { return JSON.parse(storedUser); } catch (e) { return null; }
        }
        return null;
    }

    // Initial fetch
    fetchNotifications(currentPage);
    // Update nav based on auth status (auth_ui.js should handle this if included before this script)
    // The general `DOMContentLoaded` listener in auth_ui.js will manage common nav elements like #logoutButton.
});
