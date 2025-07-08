// frontend/js/register.js
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const messageArea = document.getElementById('message-area');

    // Input error paragraph elements
    const usernameError = document.getElementById('username_error');
    const emailError = document.getElementById('email_error');
    const passwordError = document.getElementById('password_error');
    const passwordConfirmError = document.getElementById('password_confirm_error');
    const userTypeError = document.getElementById('user_type_error');

    if (registerForm) {
        const submitButton = registerForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.innerHTML : 'ثبت نام';

        registerForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            clearAllErrors();
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<div class="spinner inline-block mr-2 ml-2"></div> در حال ثبت نام...';
            }

            const formData = new FormData(registerForm);

            try {
                const response = await fetch('backend/php/register.php', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                displayFormMessage(result.message, result.success, messageArea);

                if (result.success) {
                    registerForm.reset();
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    if (result.errors) {
                        displayValidationErrors(result.errors);
                    }
                }
            } catch (error) {
                console.error('Error submitting registration form:', error);
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
        if(!areaElement) return;
        areaElement.innerHTML = '';
        const alertType = isSuccess ? 'alert-success' : 'alert-danger';
        areaElement.innerHTML = `<div class="alert ${alertType}">${message}</div>`;
    }

    function displayValidationErrors(errors) {
        if (errors.username) usernameError.textContent = errors.username;
        if (errors.email) emailError.textContent = errors.email;
        if (errors.password) passwordError.textContent = errors.password;
        if (errors.password_confirm) passwordConfirmError.textContent = errors.password_confirm;
        if (errors.user_type) userTypeError.textContent = errors.user_type;
        // For a general form error not tied to a specific field
        if (errors.form) displayMessage(errors.form, false);
    }

    function clearAllErrors() {
        messageArea.innerHTML = '';
        if (usernameError) usernameError.textContent = '';
        if (emailError) emailError.textContent = '';
        if (passwordError) passwordError.textContent = '';
        if (passwordConfirmError) passwordConfirmError.textContent = '';
        if (userTypeError) userTypeError.textContent = '';
    }
});
