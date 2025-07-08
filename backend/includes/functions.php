<?php
// backend/includes/functions.php

// Start session if not already started
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

/**
 * Sanitize user input to prevent XSS.
 *
 * @param string $data The input data.
 * @return string Sanitized data.
 */
function sanitize_input($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

/**
 * Hash a password using PHP's password_hash function.
 *
 * @param string $password The password to hash.
 * @return string|false The hashed password or false on failure.
 */
function hash_password($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

/**
 * Verify a password against a hash.
 *
 * @param string $password The password to verify.
 * @param string $hash The hash to verify against.
 * @return bool True if the password matches the hash, false otherwise.
 */
function verify_password($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Redirect to a specific URL.
 *
 * @param string $url The URL to redirect to.
 */
function redirect($url) {
    header("Location: " . $url);
    exit();
}

/**
 * Check if a user is logged in.
 *
 * @return bool True if user is logged in, false otherwise.
 */
function is_logged_in() {
    return isset($_SESSION['user_id']);
}

/**
 * Check if a user is logged in and is of a specific type.
 *
 * @param string $user_type The expected user type (e.g., 'client', 'freelancer').
 * @return bool True if user is logged in and matches the type, false otherwise.
 */
function is_logged_in_as($user_type) {
    return isset($_SESSION['user_id']) && isset($_SESSION['user_type']) && $_SESSION['user_type'] === $user_type;
}

/**
 * Get the current logged-in user's ID.
 *
 * @return int|null The user ID or null if not logged in.
 */
function get_current_user_id() {
    return $_SESSION['user_id'] ?? null;
}

/**
 * Get the current logged-in user's type.
 *
 * @return string|null The user type or null if not logged in.
 */
function get_current_user_type() {
    return $_SESSION['user_type'] ?? null;
}

/**
 * Display errors in a structured way (e.g., for forms).
 *
 * @param array $errors Array of error messages.
 * @return string HTML string of errors or empty string if no errors.
 */
function display_errors($errors) {
    if (!empty($errors)) {
        $output = '<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">';
        foreach ($errors as $error) {
            $output .= '<span class="block sm:inline">' . htmlspecialchars($error) . '</span><br>';
        }
        $output .= '</div>';
        return $output;
    }
    return '';
}

/**
 * Display success message.
 *
 * @param string $message Success message.
 * @return string HTML string of the success message.
 */
function display_success($message) {
    if (!empty($message)) {
        return '<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span class="block sm:inline">' . htmlspecialchars($message) . '</span>
                </div>';
    }
    return '';
}

/**
 * Generates a CSRF token and stores it in the session.
 * @return string The CSRF token.
 */
function generate_csrf_token() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verifies a CSRF token.
 * @param string $token The token from the form.
 * @return bool True if valid, false otherwise.
 */
function verify_csrf_token($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// Example usage of CSRF token in a form:
// <input type="hidden" name="csrf_token" value="<?php echo generate_csrf_token(); ? >">
//
// And in the PHP script processing the form:
// if ($_SERVER['REQUEST_METHOD'] === 'POST') {
//     if (!isset($_POST['csrf_token']) || !verify_csrf_token($_POST['csrf_token'])) {
//         die('CSRF token validation failed.');
//     }
//     // Process form data
// }

?>
