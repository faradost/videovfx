// frontend/js/login.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const messageArea = document.getElementById('message-area');

    // Input error paragraph elements
    const identifierError = document.getElementById('identifier_error');
    const passwordError = document.getElementById('password_error');

    // Check if user is already logged in, if so, redirect to dashboard
    // This uses the helper from auth_ui.js (ensure it's loaded or define getCurrentUser here)
    // For simplicity, directly accessing localStorage here. Consider using functions from auth_ui.js if it's loaded before this.
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        try {
            const currentUser = JSON.parse(storedUser);
            if (currentUser && currentUser.user_id) {
                 // console.log('User already logged in, redirecting to dashboard.');
                 // window.location.href = 'dashboard.html';
                 // Avoid redirecting if on login page itself to prevent loops if dashboard access fails.
                 // Instead, perhaps show a message "You are already logged in."
            }
        } catch(e) {
            localStorage.removeItem('currentUser'); // Clear corrupted data
        }
    }


    if (loginForm) {
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.innerHTML : 'ورود';

        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            clearAllErrors();
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<div class="spinner inline-block mr-2 ml-2"></div> در حال ورود...';
            }

            const formData = new FormData(loginForm);

            try {
                const response = await fetch('backend/php/login.php', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                displayFormMessage(result.message, result.success, messageArea);

                if (result.success && result.user) {
                    localStorage.setItem('currentUser', JSON.stringify(result.user));
                    let redirectTarget = result.redirect_url || 'dashboard.html';
                    setTimeout(() => {
                        window.location.href = redirectTarget;
                    }, 1500);
                } else {
                    if (result.errors) {
                        displayValidationErrors(result.errors);
                    }
                }
            } catch (error) {
                console.error('Error submitting login form:', error);
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
    }

    function displayValidationErrors(errors) {
        if (errors.identifier) identifierError.textContent = errors.identifier;
        if (errors.password) passwordError.textContent = errors.password;
        // For a general form error (e.g., "Invalid credentials")
        if (errors.form) {
             // Display general form errors in the main message area if specific fields aren't highlighted
            displayMessage(errors.form, false);
        }
    }

    function clearAllErrors() {
        messageArea.innerHTML = '';
        if(identifierError) identifierError.textContent = '';
        if(passwordError) passwordError.textContent = '';
    }
});
