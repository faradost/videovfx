// frontend/js/post_project.js

// Ensure auth_ui.js is loaded first, or include necessary functions like getCurrentUser()
document.addEventListener('DOMContentLoaded', function() {
    const postProjectForm = document.getElementById('postProjectForm');
    const messageArea = document.getElementById('message-area');

    // Input error paragraph elements
    const titleError = document.getElementById('project_title_error');
    const descriptionError = document.getElementById('project_description_error');
    const budgetError = document.getElementById('project_budget_error');
    const deadlineError = document.getElementById('project_deadline_error');
    const tagsError = document.getElementById('project_tags_error');

    // Check if user is logged in and is a client
    const currentUser = getCurrentUser(); // From auth_ui.js or define locally
    if (!currentUser || !currentUser.user_id) {
        displayFormMessage('برای ثبت پروژه ابتدا باید وارد شوید.', false, messageArea);
        if (postProjectForm) postProjectForm.classList.add('hidden'); // Hide form
        setTimeout(() => { window.location.href = 'login.html?redirect=post_project.html'; }, 3000);
        return;
    }
    if (currentUser.user_type !== 'client') {
        displayFormMessage('فقط کارفرمایان می‌توانند پروژه جدید ثبت کنند. شما به عنوان فریلنسر وارد شده‌اید.', false, messageArea);
        if (postProjectForm) postProjectForm.classList.add('hidden');
         setTimeout(() => { window.location.href = 'dashboard.html'; }, 3000);
        return;
    }


    if (postProjectForm) {
        const submitButton = postProjectForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.innerHTML : 'ثبت پروژه';

        postProjectForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            clearAllErrors();
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<div class="spinner inline-block mr-2 ml-2"></div> در حال ثبت...';
            }

            const formData = new FormData(postProjectForm);

            try {
                const response = await fetch('backend/php/create_project.php', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (response.ok && result.success) {
                    displayFormMessage(result.message || 'پروژه با موفقیت ثبت شد!', true, messageArea);
                    postProjectForm.reset();
                    setTimeout(() => {
                        if (result.project_id) {
                            window.location.href = `project_details.html?id=${result.project_id}`;
                        } else {
                            window.location.href = 'dashboard.html';
                        }
                    }, 2000);
                } else {
                    displayFormMessage(result.message || 'خطا در ثبت پروژه. لطفاً ورودی خود را بررسی کنید.', false, messageArea);
                    if (result.errors) {
                        displayValidationErrors(result.errors);
                    }
                }
            } catch (error) {
                console.error('Error submitting project form:', error);
                displayFormMessage('خطا در ارتباط با سرور. لطفاً بعداً تلاش کنید.', false, messageArea);
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonText;
                }
            }
        });
    }

    function displayFormMessage(message, isSuccess, areaElement) {
        if (!areaElement) return;
        areaElement.innerHTML = '';
        const alertType = isSuccess ? 'alert-success' : 'alert-danger';
        areaElement.innerHTML = `<div class="alert ${alertType}">${message}</div>`;
        window.scrollTo(0, 0);
    }

    function displayValidationErrors(errors) {
        if (errors.project_title) titleError.textContent = errors.project_title;
        if (errors.project_description) descriptionError.textContent = errors.project_description;
        if (errors.project_budget) budgetError.textContent = errors.project_budget;
        if (errors.project_deadline) deadlineError.textContent = errors.project_deadline;
        if (errors.project_tags) tagsError.textContent = errors.project_tags;
        if (errors.form) displayMessage(errors.form, false); // General form error
    }

    function clearAllErrors() {
        messageArea.innerHTML = '';
        if(titleError) titleError.textContent = '';
        if(descriptionError) descriptionError.textContent = '';
        if(budgetError) budgetError.textContent = '';
        if(deadlineError) deadlineError.textContent = '';
        if(tagsError) tagsError.textContent = '';
    }

    // Helper function (can be moved to a shared utility file or ensure auth_ui.js is loaded)
    function getCurrentUser() {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                return JSON.parse(storedUser);
            } catch (e) {
                localStorage.removeItem('currentUser');
                return null;
            }
        }
        return null;
    }
});
