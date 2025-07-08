// frontend/js/dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    const welcomeMessageDiv = document.getElementById('welcomeMessage');
    const usernamePlaceholder = document.getElementById('usernamePlaceholder'); // In welcome message
    const userTypePlaceholder = document.getElementById('userTypePlaceholder'); // In welcome message

    const clientDashboardDiv = document.getElementById('clientDashboard');
    const clientProjectsListDiv = document.getElementById('clientProjectsList');

    const freelancerDashboardDiv = document.getElementById('freelancerDashboard');
    const freelancerBidsListDiv = document.getElementById('freelancerBidsList');
    const freelancerAssignedProjectsListDiv = document.getElementById('freelancerAssignedProjectsList');

    const notificationsArea = document.getElementById('notificationsArea');


    // Check auth status using function from auth_ui.js or localStorage
    const currentUser = getCurrentUser(); // Assumes auth_ui.js is loaded or function is available

    if (!currentUser || !currentUser.user_id) {
        // Not logged in, redirect to login
        window.location.href = 'login.html?redirect=dashboard.html';
        return;
    }

    // Update welcome message placeholders (can also be done by auth_ui.js if elements are standard)
    if (usernamePlaceholder) usernamePlaceholder.textContent = currentUser.username || 'کاربر';
    if (userTypePlaceholder) userTypePlaceholder.textContent = currentUser.user_type === 'client' ? 'کارفرما' : (currentUser.user_type === 'freelancer' ? 'فریلنسر' : '');

    function showLoadingIndicator(areaElement, message = "در حال بارگذاری اطلاعات...") {
        if (areaElement) {
            areaElement.innerHTML = `<div class="flex justify-center items-center p-5"><div class="spinner"></div><span class="loading-text mr-2">${message}</span></div>`;
        }
    }

    function displayError(areaElement, message = "خطا در بارگذاری اطلاعات.") {
        if (areaElement) {
            areaElement.innerHTML = `<div class="alert alert-danger">${message}</div>`;
        }
    }

    async function fetchDashboardData() {
        // Show loading indicators for each section
        if (currentUser.user_type === 'client') {
            showLoadingIndicator(clientProjectsListDiv, "در حال بارگذاری پروژه های شما...");
        } else if (currentUser.user_type === 'freelancer') {
            showLoadingIndicator(freelancerBidsListDiv, "در حال بارگذاری پیشنهادات شما...");
            showLoadingIndicator(freelancerAssignedProjectsListDiv, "در حال بارگذاری پروژه های فعال شما...");
        }
        showLoadingIndicator(notificationsArea, "در حال بارگذاری اعلانات...");

        try {
            const response = await fetch('backend/php/get_dashboard_data.php');
            if (!response.ok) {
                if (response.status === 401) { // Unauthorized
                    window.location.href = 'login.html?redirect=dashboard.html';
                    return;
                }
                throw new Error(`خطای سرور: ${response.statusText}`);
            }
            const result = await response.json();

            if (result.success && result.data) {
                const data = result.data;
                if (data.user.user_type === 'client' && data.client_data) {
                    if (clientDashboardDiv) clientDashboardDiv.classList.remove('hidden');
                    displayClientProjects(data.client_data.projects_posted);
                } else if (data.user.user_type === 'freelancer' && data.freelancer_data) {
                    if (freelancerDashboardDiv) freelancerDashboardDiv.classList.remove('hidden');
                    displayFreelancerBids(data.freelancer_data.my_bids);
                    displayFreelancerAssignedProjects(data.freelancer_data.assigned_projects);
                }
                displayNotifications(data.notifications);
            } else {
                // Display error in a general area if specific sections aren't applicable
                displayError(welcomeMessageDiv.parentElement, result.message || 'خطای ناشناخته در بارگذاری اطلاعات داشبورد.');
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            displayError(welcomeMessageDiv.parentElement, 'خطا در ارتباط با سرور برای بارگذاری اطلاعات داشبورد.');
        }
    }

    function displayClientProjects(projects) {
        if (!clientProjectsListDiv) return;
        if (!projects || projects.length === 0) {
            clientProjectsListDiv.innerHTML = '<p class="text-gray-500 p-4 text-center">هنوز پروژه ای ثبت نکرده اید.</p>';
            return;
        }

        let html = '<ul class="space-y-3">';
        projects.forEach(project => {
            html += `
                <li class="dashboard-list-item">
                    <div class="flex justify-between items-center">
                        <a href="project_details.html?id=${project.project_id}" class="text-blue-600 hover:underline font-semibold">${project.title}</a>
                        <span class="text-sm font-medium px-2 py-0.5 rounded-full ${getProjectStatusClass(project.status)}">${project.status_translated}</span>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        <span>تاریخ ثبت: ${project.created_at_formatted}</span> |
                        <span>تعداد پیشنهادات: ${project.bid_count}</span>
                    </div>
                    ${project.status === 'open' || project.status === 'in_progress' ? `
                    <div class="mt-2 text-right">
                        <a href="project_details.html?id=${project.project_id}#bidsListArea" class="text-sm text-green-600 hover:text-green-800">مشاهده و مدیریت پیشنهادات</a>
                        ${project.status === 'open' ? `| <a href="#" class="text-sm text-yellow-600 hover:text-yellow-800 ml-2 edit-project-link" data-project-id="${project.project_id}">ویرایش</a>` : ''}
                    </div>
                    ` : ''}
                </li>
            `;
        });
        html += '</ul>';
        clientProjectsListDiv.innerHTML = html;
        // Add event listeners for edit links if any
    }

    function displayFreelancerBids(bids) {
        if (!freelancerBidsListDiv) return;
        if (!bids || bids.length === 0) {
            freelancerBidsListDiv.innerHTML = '<p class="text-gray-500 p-4 text-center">هنوز پیشنهادی ارسال نکرده اید.</p>';
            return;
        }

        let html = '<div class="space-y-3">';
        bids.forEach(bid => {
            html += `
                <div class="dashboard-list-item">
                    <p class="font-semibold">
                        پیشنهاد برای: <a href="project_details.html?id=${bid.project_id}" class="text-blue-600 hover:underline">${bid.project_title}</a>
                    </p>
                    <div class="text-sm text-gray-600 mt-1">
                        <span>مبلغ: ${formatCurrency(bid.bid_amount)} تومان</span> |
                        <span>وضعیت پیشنهاد: <span class="font-medium ${getBidStatusClass(bid.bid_status)}">${bid.bid_status_translated}</span></span> |
                        <span>وضعیت پروژه: <span class="font-medium ${getProjectStatusClass(bid.project_status)}">${bid.project_status_translated}</span></span>
                    </div>
                    <p class="text-xs text-gray-400 mt-1">تاریخ ارسال پیشنهاد: ${bid.bid_created_at_formatted}</p>
                    ${bid.bid_status === 'pending' && bid.project_status === 'open' ? `
                    <div class="mt-2 text-right">
                         <a href="project_details.html?id=${bid.project_id}#bidForm" class="text-sm text-yellow-600 hover:text-yellow-800">ویرایش پیشنهاد (لینک به فرم)</a>
                         | <button data-bid-id="${bid.bid_id}" class="text-sm text-red-600 hover:text-red-800 withdraw-bid-btn">لغو پیشنهاد</button>
                    </div>` : ''}
                </div>
            `;
        });
        html += '</div>';
        freelancerBidsListDiv.innerHTML = html;
        // Add event listeners for withdraw buttons
         document.querySelectorAll('.withdraw-bid-btn').forEach(button => {
            button.addEventListener('click', handleWithdrawBid);
        });
    }

    async function handleWithdrawBid(event) {
        const bidId = event.target.dataset.bidId;
        if (!confirm('آیا از لغو این پیشنهاد مطمئن هستید؟ این عمل قابل بازگشت نیست.')) return;

        try {
            const response = await fetch('backend/php/manage_bid.php', { // Assuming manage_bid.php handles withdrawals
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bid_id: bidId, action: 'withdraw' /*, csrf_token: '...'*/ })
            });
            const result = await response.json();
            if (result.success) {
                alert(result.message || 'پیشنهاد با موفقیت لغو شد.');
                fetchDashboardData(); // Refresh dashboard
            } else {
                alert('خطا در لغو پیشنهاد: ' + (result.message || 'خطای سرور'));
            }
        } catch (error) {
            console.error('Error withdrawing bid:', error);
            alert('خطا در ارتباط با سرور.');
        }
    }


    function displayFreelancerAssignedProjects(projects) {
        if (!freelancerAssignedProjectsListDiv) return;
        if (!projects || projects.length === 0) {
            freelancerAssignedProjectsListDiv.innerHTML = '<p class="text-gray-500 p-4 text-center">در حال حاضر پروژه فعالی برای شما ثبت نشده است.</p>';
            return;
        }
        let html = '<div class="space-y-3">';
        projects.forEach(project => {
            html += `
                <div class="dashboard-list-item bg-green-50 hover:bg-green-100">
                    <p class="font-semibold text-green-700">
                        <a href="project_details.html?id=${project.project_id}" class="hover:underline">${project.project_title}</a>
                    </p>
                    <div class="text-sm text-gray-600 mt-1">
                        <span>کارفرما: <a href="user_profile.html?id=${project.client_id /* Need client_id here */}" class="text-blue-500">${project.client_username}</a></span> |
                        <span>مبلغ توافقی: ${formatCurrency(project.agreed_price)} تومان</span>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">تاریخ شروع: ${project.start_date_formatted}</p>
                    <p class="text-sm mt-1">وضعیت تخصیص: <span class="font-semibold ${getAssignmentStatusClass(project.assignment_status)}">${project.assignment_status_translated}</span></p>
                     <div class="mt-2 text-right">
                        <a href="#" class="text-sm text-blue-600 hover:text-blue-800">مدیریت پروژه و ارتباط با کارفرما</a>
                        <!-- Link to messaging or project management page -->
                    </div>
                </div>
            `;
        });
        html += '</div>';
        freelancerAssignedProjectsListDiv.innerHTML = html;
    }

    function displayNotifications(notifications) {
        if (!notificationsArea) return;
        if (!notifications || notifications.length === 0) {
            notificationsArea.innerHTML = '<p class="text-gray-500 p-4 text-center">اعلان جدیدی وجود ندارد.</p>';
            return;
        }
        let html = '<ul class="space-y-2">';
        notifications.forEach(notif => {
            html += `
                <li class="p-3 border-r-4 ${notif.is_read ? 'border-gray-300' : 'border-blue-500'} bg-gray-50 hover:bg-gray-100 rounded transition-colors duration-150">
                    <a href="${notif.link || '#'}" class="block group">
                        <p class="text-sm text-gray-800 group-hover:text-blue-700">${notif.message}</p>
                        <p class="text-xs text-gray-400 group-hover:text-gray-500">${notif.created_at_formatted}</p>
                    </a>
                </li>`;
        });
        html += '</ul>';
        notificationsArea.innerHTML = html;
    }


    // Helper Functions (some might be duplicates from other files, consider a global utility file)
    function getCurrentUser() {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try { return JSON.parse(storedUser); } catch (e) { return null; }
        }
        return null;
    }

    function formatCurrency(amount) {
        if (amount === null || amount === undefined) return 'N/A';
        return Number(amount).toLocaleString('fa-IR'); // For Persian formatting if needed, or just 'en-US'
    }

    function getProjectStatusClass(status) {
        switch (status) {
            case 'open': return 'bg-green-100 text-green-700';
            case 'in_progress': return 'bg-blue-100 text-blue-700';
            case 'completed': return 'bg-purple-100 text-purple-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            case 'expired': return 'bg-gray-100 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }
    function getBidStatusClass(status) {
         switch (status) {
            case 'pending': return 'text-yellow-600';
            case 'accepted': return 'text-green-600';
            case 'rejected': return 'text-red-600';
            case 'withdrawn': return 'text-gray-600';
            default: return 'text-gray-700';
        }
    }
    function getAssignmentStatusClass(status) {
        switch (status) {
            case 'active': return 'text-green-600';
            case 'completed': return 'text-purple-600';
            case 'terminated': return 'text-red-600';
            default: return 'text-gray-700';
        }
    }

    // Initial fetch
    fetchDashboardData();

    // Logout button functionality is now primarily handled by auth_ui.js if the button ID is standard.
    // If this page had a specific logout button not covered by auth_ui.js, it would be handled here.
    // For now, assuming auth_ui.js covers the '#logoutButton'.
});
