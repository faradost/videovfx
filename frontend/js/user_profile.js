// frontend/js/user_profile.js

document.addEventListener('DOMContentLoaded', function() {
    const profileArea = document.getElementById('profileArea');
    const loadingMessage = document.getElementById('loadingMessage');

    // Profile View Elements
    const profileViewDiv = document.getElementById('profileView');
    const avatarImg = document.getElementById('avatar');
    const fullNameElem = document.getElementById('fullName');
    const usernameElem = document.getElementById('username');
    const userTypeElem = document.getElementById('userType');
    const bioElem = document.getElementById('bio');
    const skillsListDiv = document.getElementById('skillsList');
    const portfolioLinksDiv = document.getElementById('portfolioLinks');
    const averageRatingElem = document.getElementById('averageRating');
    const completedProjectsElem = document.getElementById('completedProjects');
    const activeProjectsElem = document.getElementById('activeProjects'); // For client/freelancer specific stats
    const completedProjectsLabel = document.getElementById('completedProjectsLabel');
    const activeProjectsLabel = document.getElementById('activeProjectsLabel');
    const reviewsListDiv = document.getElementById('reviewsList');


    // Edit Elements
    const editProfileButton = document.getElementById('editProfileButton');
    const changeAvatarButton = document.getElementById('changeAvatarButton');
    const avatarUploadInput = document.getElementById('avatarUpload');
    const profileEditFormDiv = document.getElementById('profileEditForm');
    const editForm = document.getElementById('editForm');
    const cancelEditButton = document.getElementById('cancelEditButton');
    const editMessageArea = document.getElementById('editMessageArea');

    // Edit Form Fields
    const editFullNameInput = document.getElementById('editFullName');
    const editBioTextarea = document.getElementById('editBio');
    const editSkillsInput = document.getElementById('editSkills');
    const editPortfolioLinksTextarea = document.getElementById('editPortfolioLinks');
    const editCountryInput = document.getElementById('editCountry');


    const urlParams = new URLSearchParams(window.location.search);
    let profileUserId = urlParams.get('id'); // ID of profile to view

    const currentUser = getCurrentUser(); // Logged-in user from auth_ui.js or localStorage

    if (!profileUserId && currentUser && currentUser.user_id) {
        profileUserId = currentUser.user_id; // Default to own profile if no ID in URL
    } else if (!profileUserId && !currentUser) {
        window.location.href = 'login.html?redirect=user_profile.html';
        return;
    } else if (profileUserId && !/^\d+$/.test(profileUserId)) {
        if(loadingMessage) {
            loadingMessage.innerHTML = '<div class="alert alert-danger">شناسه پروفایل نامعتبر است.</div>';
            loadingMessage.style.display = 'block'; // Ensure it's visible
        }
        if(profileViewDiv) profileViewDiv.classList.add('hidden');
        if(profileEditFormDiv) profileEditFormDiv.classList.add('hidden');
        return;
    }

    function showLoadingState(isLoading) {
        if (isLoading) {
            if (loadingMessage) {
                loadingMessage.innerHTML = '<div class="flex justify-center items-center py-10"><div class="spinner"></div><span class="loading-text mr-2">در حال بارگذاری اطلاعات پروفایل...</span></div>';
                loadingMessage.style.display = 'block';
            }
            if (profileViewDiv) profileViewDiv.classList.add('hidden');
            if (profileEditFormDiv) profileEditFormDiv.classList.add('hidden');
        } else {
            if (loadingMessage) loadingMessage.style.display = 'none';
            // profileViewDiv will be shown by displayProfileData if successful
        }
    }

    async function fetchProfileData() {
        if (!profileUserId) {
             if(loadingMessage) {
                loadingMessage.innerHTML = '<div class="alert alert-warning">شناسه پروفایل برای بارگذاری مشخص نشده است.</div>';
                loadingMessage.style.display = 'block';
             }
            return;
        }
        showLoadingState(true);
        try {
            const response = await fetch(`backend/php/get_profile.php?user_id=${profileUserId}`);
            const result = await response.json();
            showLoadingState(false);

            if (result.success && result.profile) {
                if(profileViewDiv) profileViewDiv.classList.remove('hidden');
                displayProfileData(result.profile);
                if (result.profile.is_own_profile) {
                    if(editProfileButton) editProfileButton.classList.remove('hidden');
                    if(changeAvatarButton) changeAvatarButton.classList.remove('hidden');
                    populateEditForm(result.profile);
                }
            } else {
                if(profileArea) profileArea.innerHTML = `<div class="alert alert-danger">${result.message || 'خطا در بارگذاری اطلاعات پروفایل.'}</div>`;
            }
        } catch (error) {
            console.error('Error fetching profile data:', error);
            showLoadingState(false);
            if(profileArea) profileArea.innerHTML = '<div class="alert alert-danger">خطا در ارتباط با سرور.</div>';
        }
    }

    function displayProfileData(profile) {
        if (avatarImg) {
            avatarImg.src = profile.avatar_url || 'frontend/images/default_avatar.png';
            avatarImg.alt = profile.full_name || profile.username;
        }
        if (fullNameElem) fullNameElem.textContent = profile.full_name || profile.username; // Fallback to username
        if (usernameElem) usernameElem.textContent = `@${profile.username}`;
        if (userTypeElem) userTypeElem.textContent = profile.user_type === 'client' ? 'کارفرما' : 'فریلنسر';

        if (bioElem) {
            bioElem.innerHTML = profile.bio ? nl2br(profile.bio) : '<span class="text-gray-500">اطلاعات «درباره من» هنوز تکمیل نشده است.</span>';
        }

        if (skillsListDiv) {
            if (profile.skills_array && profile.skills_array.length > 0) {
                skillsListDiv.innerHTML = profile.skills_array.map(skill =>
                    `<span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">${skill}</span>`
                ).join(' ');
            } else {
                skillsListDiv.innerHTML = '<span class="text-gray-500">هنوز مهارتی ثبت نشده است.</span>';
            }
        }

        if (portfolioLinksDiv) {
            if (profile.portfolio_links_array && profile.portfolio_links_array.length > 0) {
                portfolioLinksDiv.innerHTML = profile.portfolio_links_array.map(link => {
                    if (!link.trim()) return '';
                    // Ensure link has a protocol, default to https if missing for external links
                    let properLink = link.trim();
                    if (!properLink.match(/^https?:\/\//) && !properLink.match(/^mailto:/) && !properLink.match(/^\//) ) {
                        properLink = `http://${properLink}`;
                    }
                    return `<a href="${properLink}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline block mb-1">${link.trim()}</a>`;
                }).join('');
            } else {
                portfolioLinksDiv.innerHTML = '<span class="text-gray-500">هنوز نمونه کاری ثبت نشده است.</span>';
            }
        }

        if (averageRatingElem) averageRatingElem.textContent = profile.average_rating ? parseFloat(profile.average_rating).toFixed(1) : 'جدید';

        // Stats specific to user type
        if (profile.user_type === 'client') {
            if(completedProjectsElem && profile.client_stats) completedProjectsElem.textContent = profile.client_stats.total_projects_posted || 0;
            if(completedProjectsLabel) completedProjectsLabel.textContent = "کل پروژه های ثبت شده";
            if(activeProjectsElem && profile.client_stats) activeProjectsElem.textContent = profile.client_stats.open_projects_count || 0;
            if(activeProjectsLabel) activeProjectsLabel.textContent = "پروژه های باز";
        } else { // freelancer
            if(completedProjectsElem) completedProjectsElem.textContent = profile.completed_projects || 0;
            if(completedProjectsLabel) completedProjectsLabel.textContent = "پروژه های تکمیل شده";
            if(activeProjectsElem && profile.freelancer_stats) activeProjectsElem.textContent = profile.freelancer_stats.active_assignments_count || 0;
            if(activeProjectsLabel) activeProjectsLabel.textContent = "پروژه های در حال انجام";
        }

        displayReviews(profile.reviews_received || []);
    }

    function displayReviews(reviews) {
        if (!reviewsListDiv) return;
        if (reviews.length === 0) {
            reviewsListDiv.innerHTML = '<p class="text-gray-500 p-4 text-center">هنوز نظری برای این کاربر ثبت نشده است.</p>';
            return;
        }
        let html = '<div class="space-y-4">';
        reviews.forEach(review => {
            html += `
                <div class="border rounded-lg p-4 shadow-sm bg-gray-50 hover:bg-gray-100 transition-colors duration-150">
                    <div class="flex items-start">
                        <img src="${review.reviewer_avatar_url || 'frontend/images/default_avatar.png'}" alt="${review.reviewer_username}" class="w-10 h-10 rounded-full mr-3 ml-2 object-cover shadow-sm">
                        <div>
                            <p class="font-semibold">
                                <a href="user_profile.html?id=${review.reviewer_user_id}" class="text-blue-600 hover:underline">${review.reviewer_username}</a>
                                <span class="text-sm text-gray-500"> برای پروژه </span>
                                <a href="project_details.html?id=${review.project_id}" class="text-blue-600 hover:underline">${review.project_title || 'پروژه حذف شده'}</a>
                            </p>
                            <div class="flex items-center my-1">
                                ${[...Array(5)].map((_, i) => `<svg class="w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.387 2.458a1 1 0 00-.364 1.118l1.287 3.971c.3.921-.755 1.688-1.54 1.118l-3.387-2.458a1 1 0 00-1.175 0l-3.387 2.458c-.784.57-1.838-.197-1.539-1.118l1.287-3.971a1 1 0 00-.364-1.118L2.04 9.397c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.97z"></path></svg>`).join('')}
                                <span class="mr-2 text-sm text-gray-600">(${review.rating} از 5)</span>
                            </div>
                            <p class="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">${review.comment ? nl2br(review.comment) : '<i class="text-gray-400">بدون نظر متنی</i>'}</p>
                            <p class="text-xs text-gray-400 mt-1">${review.review_date_formatted}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        reviewsListDiv.innerHTML = html;
    }


    function populateEditForm(profile) {
        if(editFullNameInput) editFullNameInput.value = profile.full_name || '';
        if(editBioTextarea) editBioTextarea.value = profile.bio || '';
        if(editSkillsInput) editSkillsInput.value = profile.skills_array ? profile.skills_array.join(', ') : '';
        if(editPortfolioLinksTextarea) editPortfolioLinksTextarea.value = profile.portfolio_links_array ? profile.portfolio_links_array.join('\n') : '';
        if(editCountryInput) editCountryInput.value = profile.country || '';
    }

    if (editProfileButton) {
        editProfileButton.addEventListener('click', () => {
            profileViewDiv.classList.add('hidden');
            profileEditFormDiv.classList.remove('hidden');
            editMessageArea.innerHTML = ''; // Clear previous messages
        });
    }
    if (changeAvatarButton) {
        changeAvatarButton.addEventListener('click', () => {
            avatarUploadInput.click(); // Trigger file input
        });
    }

    if(avatarUploadInput){
        avatarUploadInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                // Client-side preview (optional)
                const reader = new FileReader();
                reader.onload = (e) => { if(avatarImg) avatarImg.src = e.target.result; }
                reader.readAsDataURL(file);

                // Immediately upload new avatar
                const formData = new FormData();
                formData.append('avatar', file);
                // Add other fields if your backend expects them for avatar-only update, or make a specific endpoint
                // For now, this will be part of the main update_profile.php which might expect other fields
                // This means we might need to submit the whole form or have a dedicated avatar upload endpoint.
                // For simplicity, let's assume update_profile.php can handle avatar-only updates if other fields are empty.
                // Or, it's better to trigger the main form submission here if we want to save it.
                // The current setup implies avatar is part of the main edit form.
                // So, changing avatar here just stages it for the main "Save Changes" button.
                // If an immediate avatar update is desired, a separate AJAX call is needed.
                // For now, let's keep it simple: user selects avatar, then clicks "Save Changes".
                // The `update_profile.php` will handle the `avatar` field from the form submission.
                // To make it more interactive, an immediate upload would be:
                /*
                const avatarFormData = new FormData();
                avatarFormData.append('avatar', file);
                // Potentially add csrf_token if needed
                try {
                    const response = await fetch('backend/php/update_avatar.php', { // Needs a dedicated endpoint
                        method: 'POST',
                        body: avatarFormData
                    });
                    const result = await response.json();
                    if (result.success && result.new_avatar_url) {
                        if(avatarImg) avatarImg.src = result.new_avatar_url;
                        displayEditMessage('آواتار با موفقیت بروزرسانی شد.', true);
                    } else {
                        displayEditMessage(result.message || 'خطا در بروزرسانی آواتار.', false);
                    }
                } catch (error) {
                    displayEditMessage('خطا در ارتباط با سرور برای بروزرسانی آواتار.', false);
                }
                */
               // For now, the avatar is part of the main form, no immediate upload.
            }
        });
    }


    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', () => {
            profileEditFormDiv.classList.add('hidden');
            profileViewDiv.classList.remove('hidden');
            fetchProfileData(); // Re-fetch to discard any preview changes like avatar
        });
    }

    if (editForm) {
        const submitButton = editForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.textContent : 'ذخیره تغییرات';

        editForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            displayEditMessage('', true); // Clear previous messages
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<div class="spinner inline-block mr-2 ml-2"></div> در حال ذخیره...';
            }

            const formData = new FormData(editForm);
            if (avatarUploadInput.files[0]) {
                formData.append('avatar', avatarUploadInput.files[0]);
            }

            try {
                const response = await fetch('backend/php/update_profile.php', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.success) {
                    displayEditMessage(result.message || 'پروفایل با موفقیت بروزرسانی شد.', true);
                    if (result.updated_profile) {
                        displayProfileData(result.updated_profile);
                        if(currentUser && currentUser.user_id == result.updated_profile.user_id) {
                            const updatedCurrentUser = {
                                user_id: result.updated_profile.user_id,
                                username: result.updated_profile.username,
                                user_type: result.updated_profile.user_type,
                                email: result.updated_profile.email,
                                avatar_url: result.updated_profile.avatar_url
                            };
                            localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
                            // If avatar changed in navbar, auth_ui.js might need a way to refresh it, or page reload.
                        }
                    }
                    if(profileEditFormDiv) profileEditFormDiv.classList.add('hidden');
                    if(profileViewDiv) profileViewDiv.classList.remove('hidden');
                } else {
                    displayEditMessage(result.message || 'خطا در بروزرسانی پروفایل.', false);
                    if (result.errors) {
                        // TODO: Display field-specific errors by mapping keys in result.errors to specific <p> tags
                        console.error("Validation errors:", result.errors);
                         Object.keys(result.errors).forEach(key => {
                            const errorP = document.getElementById(`edit_${key}_error`); // e.g. edit_full_name_error
                            if (errorP) errorP.textContent = result.errors[key];
                        });
                    }
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                displayEditMessage('خطا در ارتباط با سرور.', false);
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonText;
                }
            }
        });
    }

    function displayEditMessage(message, isSuccess) {
        if (!editMessageArea) return;
        editMessageArea.innerHTML = '';
        if (!message) return;
        const alertType = isSuccess ? 'alert-success' : 'alert-danger';
        editMessageArea.innerHTML = `<div class="alert ${alertType}">${message}</div>`;
        editMessageArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    // Initial fetch
    fetchProfileData();
    // Update nav based on auth status (auth_ui.js handles this)
});
