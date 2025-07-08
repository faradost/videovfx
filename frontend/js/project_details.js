// frontend/js/project_details.js

document.addEventListener('DOMContentLoaded', function() {
    const projectInfoDiv = document.getElementById('projectInfo'); // Container for actual project content once loaded
    const loadingMessage = document.getElementById('loadingMessage'); // The <p> tag for "در حال بارگذاری..."
    const projectDetailsArea = document.getElementById('projectDetailsArea'); // Main container for loading message or content

    // Project Detail Elements
    const projectTitleElem = document.getElementById('projectTitle');
    const clientUsernameElem = document.getElementById('clientUsername');
    const clientProfileLinkElem = document.getElementById('clientProfileLink');
    const projectPostedDateElem = document.getElementById('projectPostedDate');
    const projectDeadlineSpan = document.getElementById('projectDeadlineSpan');
    const projectDeadlineElem = document.getElementById('projectDeadline');
    const projectDescriptionElem = document.getElementById('projectDescription');
    const projectTagsDiv = document.getElementById('projectTags');
    const projectBudgetElem = document.getElementById('projectBudget');
    const projectStatusElem = document.getElementById('projectStatus');
    const bidsCountElem = document.getElementById('bidsCount'); // For non-owners or summary

    // Actions & Forms
    const clientActionsDiv = document.getElementById('clientActions');
    const bidSubmissionFormArea = document.getElementById('bidSubmissionFormArea');
    const loginToBidMessage = document.getElementById('loginToBidMessage');
    const alreadyBidMessage = document.getElementById('alreadyBidMessage');
    const bidForm = document.getElementById('bidForm');
    const bidMessageArea = document.getElementById('bidMessageArea');
    const bidsListArea = document.getElementById('bidsListArea');
    const bidsContainer = document.getElementById('bidsContainer');
    const noBidsMessage = document.getElementById('noBidsMessage');

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    const currentUser = getCurrentUser(); // From auth_ui.js or defined locally

    if (!projectId) {
        if (loadingMessage) {
            loadingMessage.innerHTML = '<strong class="text-red-600">شناسه پروژه نامعتبر است.</strong>';
            loadingMessage.classList.remove('text-gray-600', 'py-10'); // Remove default loading styles
            loadingMessage.classList.add('text-red-500', 'p-4', 'bg-red-100', 'rounded-md');
        }
        return;
    }

    function showLoadingState(isLoading) {
        if (isLoading) {
            if (loadingMessage) {
                loadingMessage.innerHTML = '<div class="flex justify-center items-center py-10"><div class="spinner"></div><span class="loading-text mr-2">در حال بارگذاری جزئیات پروژه...</span></div>';
                loadingMessage.style.display = 'block';
            }
            if (projectInfoDiv) projectInfoDiv.classList.add('hidden'); // Hide content area
        } else {
            if (loadingMessage) loadingMessage.style.display = 'none';
            if (projectInfoDiv) projectInfoDiv.classList.remove('hidden'); // Show content area
        }
    }

    async function fetchProjectDetails() {
        showLoadingState(true);
        try {
            const response = await fetch(`backend/php/get_project_details.php?id=${projectId}`);
            const result = await response.json();

            showLoadingState(false);

            if (result.success && result.project) {
                displayProjectDetails(result.project);

                if (result.project.is_owner) {
                    if (clientActionsDiv) clientActionsDiv.classList.remove('hidden');
                    if (bidsListArea) bidsListArea.classList.remove('hidden');
                    displayBids(result.bids || []);
                } else {
                    // Handle bid display/form for freelancers or guests
                    if (currentUser && currentUser.user_type === 'freelancer' && result.project.status === 'open') {
                        if (result.project.current_user_has_bid) {
                            if (alreadyBidMessage) alreadyBidMessage.classList.remove('hidden');
                        } else {
                            if (bidSubmissionFormArea) bidSubmissionFormArea.classList.remove('hidden');
                            document.getElementById('project_id_for_bid').value = projectId;
                        }
                    } else if (!currentUser && result.project.status === 'open') {
                        if (loginToBidMessage) loginToBidMessage.classList.remove('hidden');
                    }
                    // Show bid summary if available and not owner
                    if (result.project.bid_summary && bidsCountElem) {
                        bidsCountElem.innerHTML = `<strong>تعداد پیشنهادات:</strong> ${result.project.bid_summary.count} <br> <strong>میانگین پیشنهاد:</strong> ${result.project.bid_summary.avg_amount_formatted}`;
                    } else if (result.bids && result.bids.length > 0 && (result.project.status === 'completed' || result.project.status === 'cancelled')) {
                        // Show bids if project is completed/cancelled for transparency, even for non-owners
                        if (bidsListArea) bidsListArea.classList.remove('hidden');
                        displayBids(result.bids);
                    } else if (result.bids && result.bids.length === 0 && (result.project.status === 'completed' || result.project.status === 'cancelled')) {
                         if (bidsListArea) bidsListArea.classList.remove('hidden');
                         if (noBidsMessage) noBidsMessage.textContent = "هیچ پیشنهادی برای این پروژه ثبت نشده بود.";
                    }
                }


            } else {
                projectDetailsArea.innerHTML = `<div class="alert alert-danger">${result.message || 'خطا در بارگذاری جزئیات پروژه.'}</div>`;
            }
        } catch (error) {
            console.error('Error fetching project details:', error);
            showLoadingState(false); // Ensure loading state is hidden on error
            projectDetailsArea.innerHTML = '<div class="alert alert-danger">خطا در ارتباط با سرور.</div>';
        }
    }

    function displayProjectDetails(project) {
        if (projectTitleElem) projectTitleElem.textContent = project.title;
        if (clientUsernameElem) clientUsernameElem.textContent = project.client_username;
        if (clientProfileLinkElem) clientProfileLinkElem.href = `user_profile.html?id=${project.client_id}`;
        if (projectPostedDateElem) projectPostedDateElem.textContent = project.created_at_formatted;

        if (project.deadline) {
            if (projectDeadlineElem) projectDeadlineElem.textContent = project.deadline_formatted;
            if (projectDeadlineSpan) projectDeadlineSpan.classList.remove('hidden');
        } else {
            if (projectDeadlineSpan) projectDeadlineSpan.classList.add('hidden');
        }

        if (projectDescriptionElem) projectDescriptionElem.innerHTML = nl2br(project.description); // Use innerHTML carefully, ensure description is sanitized server-side

        if (projectTagsDiv && project.tags_array && project.tags_array.length > 0) {
            projectTagsDiv.innerHTML = project.tags_array.map(tag =>
                `<span class="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">${tag}</span>`
            ).join(' ');
        } else if (projectTagsDiv) {
            projectTagsDiv.innerHTML = '<span class="text-gray-500 text-sm">مهارتی مشخص نشده است.</span>';
        }

        if (projectBudgetElem) projectBudgetElem.textContent = project.budget_formatted;
        if (projectStatusElem) {
            projectStatusElem.textContent = getStatusText(project.status);
            projectStatusElem.className = `font-semibold ${getStatusColor(project.status)}`;
        }
    }

    function displayBids(bids) {
        if (!bidsContainer) return;
        if (bids.length === 0) {
            if (noBidsMessage) noBidsMessage.classList.remove('hidden');
            return;
        }
        if (noBidsMessage) noBidsMessage.classList.add('hidden');
        bidsContainer.innerHTML = ''; // Clear previous

        bids.forEach(bid => {
            const bidCard = `
                <div class="border rounded-lg p-4 mb-4 shadow-sm bg-gray-50">
                    <div class="flex items-start justify-between">
                        <div>
                            <div class="flex items-center mb-2">
                                <img src="${bid.freelancer_avatar_url || 'frontend/images/default_avatar.png'}" alt="${bid.freelancer_username}" class="w-10 h-10 rounded-full mr-3 ml-2 object-cover">
                                <div>
                                    <a href="user_profile.html?id=${bid.freelancer_id}" class="text-blue-600 font-semibold hover:underline">${bid.freelancer_username}</a>
                                    <p class="text-xs text-gray-500">امتیاز: ${bid.freelancer_avg_rating} (${bid.freelancer_completed_projects} پروژه موفق)</p>
                                </div>
                            </div>
                            <p class="text-sm text-gray-700 whitespace-pre-wrap mb-2"><strong>متن پیشنهاد:</strong> ${nl2br(bid.proposal_text)}</p>
                        </div>
                        <div class="text-left flex-shrink-0 ml-4">
                            <p class="text-lg font-semibold text-green-600">${bid.bid_amount_formatted}</p>
                            <p class="text-xs text-gray-500">زمان تحویل: ${bid.estimated_delivery_days} روز</p>
                            <p class="text-xs text-gray-500">تاریخ ثبت: ${bid.bid_created_at_formatted}</p>
                            <p class="text-sm mt-1">وضعیت: <span class="font-semibold ${getBidStatusColor(bid.bid_status)}">${getBidStatusText(bid.bid_status)}</span></p>
                        </div>
                    </div>
                    ${currentUser && projectInfoDiv.dataset.isOwner === 'true' && projectInfoDiv.dataset.projectStatus === 'open' && bid.bid_status === 'pending' ? `
                    <div class="mt-3 pt-3 border-t text-right">
                        <button data-bid-id="${bid.bid_id}" class="accept-bid-btn bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-3 rounded mr-2">پذیرش پیشنهاد</button>
                        <button data-bid-id="${bid.bid_id}" class="reject-bid-btn bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded">رد پیشنهاد</button>
                    </div>` : ''}
                     ${projectInfoDiv.dataset.isOwner === 'true' && bid.bid_status === 'accepted' ? `
                     <div class="mt-3 pt-3 border-t text-right">
                        <span class="text-green-600 font-semibold">این پیشنهاد پذیرفته شده است.</span>
                        <!-- Add link to chat/manage project -->
                     </div>
                     ` : ''}
                </div>
            `;
            bidsContainer.insertAdjacentHTML('beforeend', bidCard);
        });
        // Add event listeners for accept/reject buttons after they are created
        addBidActionListeners();
    }

    function addBidActionListeners() {
        document.querySelectorAll('.accept-bid-btn').forEach(button => {
            button.addEventListener('click', () => handleBidAction(button.dataset.bidId, 'accept'));
        });
        document.querySelectorAll('.reject-bid-btn').forEach(button => {
            button.addEventListener('click', () => handleBidAction(button.dataset.bidId, 'reject'));
        });
    }

    async function handleBidAction(bidId, action) {
        // This function will be implemented fully in a later step (Manage Bids)
        // For now, it's a placeholder.
        if (!confirm(`آیا از ${action === 'accept' ? 'پذیرش' : 'رد'} این پیشنهاد مطمئن هستید؟`)) return;

        try {
            const response = await fetch('backend/php/manage_bid.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bid_id: bidId, action: action, project_id: projectId /*, csrf_token: '...'*/ })
            });
            const result = await response.json();
            if (result.success) {
                // Use a more styled alert if available, or just the default alert
                displayBidMessage(result.message, true, bidMessageArea); // Assuming bidMessageArea is for the main bid form
                fetchProjectDetails(); // Refresh details and bids
            } else {
                displayBidMessage('خطا: ' + result.message, false, bidMessageArea);
            }
        } catch (error) {
            console.error('Error managing bid:', error);
            displayBidMessage('خطا در ارتباط با سرور.', false, bidMessageArea);
        }
    }


    if (bidForm) {
        const submitButton = bidForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.innerHTML : 'ارسال پیشنهاد';

        bidForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (bidMessageArea) bidMessageArea.innerHTML = '';
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<div class="spinner inline-block mr-2 ml-2"></div> در حال ارسال...';
            }

            const formData = new FormData(bidForm);
            // formData.append('project_id', projectId); // Already set in hidden input
            // formData.append('csrf_token', 'your_csrf_token_value');

            try {
                const response = await fetch('backend/php/place_bid.php', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                displayBidMessage(result.message, result.success, bidMessageArea);


                if (result.success) {
                    bidForm.reset();
                    if (bidSubmissionFormArea) bidSubmissionFormArea.classList.add('hidden');
                    if (alreadyBidMessage) alreadyBidMessage.classList.remove('hidden');
                    // Optionally refresh parts of the page or show bid count update
                    fetchProjectDetails(); // Refresh to show updated state
                } else {
                    // Display specific errors if available
                    if (result.errors) {
                        // TODO: Display field-specific errors if backend provides them and you have placeholders in HTML
                        Object.keys(result.errors).forEach(key => {
                            const errorP = document.getElementById(`${key}_error_bid`); // e.g. bid_amount_error_bid
                            if (errorP) errorP.textContent = result.errors[key];
                        });
                    }
                }
            } catch (error) {
                console.error('Error submitting bid:', error);
                displayBidMessage('خطا در ارتباط با سرور هنگام ارسال پیشنهاد.', false, bidMessageArea);
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonText;
                }
            }
        });
    }

    function displayBidMessage(message, isSuccess, areaElement) {
        if (!areaElement) return;
        areaElement.innerHTML = '';
        const alertType = isSuccess ? 'alert-success' : 'alert-danger';
        areaElement.innerHTML = `<div class="alert ${alertType}">${message}</div>`;
        areaElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Helper functions
    function getCurrentUser() {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try { return JSON.parse(storedUser); } catch (e) { return null; }
        }
        return null;
    }

    function nl2br(str) {
        if (typeof str === 'undefined' || str === null) return '';
        return str.replace(/\r\n|\r|\n/g, '<br>');
    }

    function getStatusText(status) {
        const statuses = {
            'open': 'باز',
            'in_progress': 'در حال انجام',
            'completed': 'تکمیل شده',
            'cancelled': 'لغو شده',
            'expired': 'منقضی شده'
        };
        return statuses[status] || status;
    }

    function getStatusColor(status) {
        switch (status) {
            case 'open': return 'text-green-600';
            case 'in_progress': return 'text-blue-600';
            case 'completed': return 'text-purple-600';
            case 'cancelled': return 'text-red-600';
            case 'expired': return 'text-gray-600';
            default: return 'text-gray-700';
        }
    }
     function getBidStatusText(status) {
        const statuses = {
            'pending': 'در انتظار بررسی',
            'accepted': 'پذیرفته شده',
            'rejected': 'رد شده',
            'withdrawn': 'لغو شده توسط فریلنسر'
        };
        return statuses[status] || status;
    }

    function getBidStatusColor(status) {
        switch (status) {
            case 'pending': return 'text-yellow-600';
            case 'accepted': return 'text-green-600';
            case 'rejected': return 'text-red-600';
            case 'withdrawn': return 'text-gray-600';
            default: return 'text-gray-700';
        }
    }


    // Initial fetch
    fetchProjectDetails();
    // Update nav based on auth status (auth_ui.js handles this)

    // Store project data on the projectInfoDiv for other functions to access easily
    // This logic needs to be inside fetchProjectDetails's success block to access 'result.project'
    // Moved this logic into the success block of fetchProjectDetails.

    // Initial fetch
    fetchProjectDetails();
});


/** Helper to set dataset attributes after project data is confirmed
 * This was previously at the end of the script, but needs access to the 'project' object.
 * It's now implicitly handled within fetchProjectDetails where 'result.project' is available.
 * If explicitly setting on projectInfoDiv is still desired for some global access pattern not yet clear,
 * it should be done within the success callback of fetchProjectDetails.
 * For example:
 *
 * if (result.success && result.project) {
 *      displayProjectDetails(result.project);
 *      if (projectInfoDiv) { // Ensure projectInfoDiv exists
 *          projectInfoDiv.dataset.isOwner = result.project.is_owner.toString();
 *          projectInfoDiv.dataset.projectStatus = result.project.status;
 *      }
 *      // ... rest of the logic for displaying bids, forms etc. ...
 * }
 */
