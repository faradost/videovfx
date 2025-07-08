<?php
// backend/php/login.php
require_once '../database/database.php';
require_once '../includes/functions.php'; // Includes session_start()

// Ensure this script is accessed via POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit();
}

// Initialize response array
$response = ['success' => false, 'message' => '', 'user' => null, 'errors' => []];

// Get and sanitize input data
$identifier = sanitize_input($_POST['identifier'] ?? ''); // Can be username or email
$password = $_POST['password'] ?? ''; // Do not sanitize password before verification
$csrf_token = $_POST['csrf_token'] ?? '';

// CSRF Token Validation (ensure token is generated and included in the login form)
/*
if (!isset($_SESSION['csrf_token']) || !verify_csrf_token($csrf_token)) {
    $response['message'] = 'CSRF token validation failed.';
    echo json_encode($response);
    exit();
}
*/

// --- Input Validations ---
if (empty($identifier)) {
    $response['errors']['identifier'] = 'نام کاربری یا ایمیل اجباری است.';
}
if (empty($password)) {
    $response['errors']['password'] = 'رمز عبور اجباری است.';
}

if (!empty($response['errors'])) {
    $response['message'] = 'لطفاً اطلاعات فرم را تکمیل کنید.';
    echo json_encode($response);
    exit();
}

// --- Database Query ---
// Check if the identifier is an email or username
$login_field_type = filter_var($identifier, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

$sql = "SELECT user_id, username, password_hash, user_type, email FROM users WHERE $login_field_type = ?";

if ($stmt = $mysqli->prepare($sql)) {
    $stmt->bind_param("s", $identifier);

    if ($stmt->execute()) {
        $stmt->store_result();

        if ($stmt->num_rows == 1) {
            $stmt->bind_result($user_id, $username_db, $password_hash_db, $user_type_db, $email_db);
            if ($stmt->fetch()) {
                // Verify password
                if (verify_password($password, $password_hash_db)) {
                    // Password is correct, start session
                    $_SESSION['user_id'] = $user_id;
                    $_SESSION['username'] = $username_db;
                    $_SESSION['user_type'] = $user_type_db;
                    $_SESSION['email'] = $email_db;
                    // Regenerate session ID for security
                    session_regenerate_id(true);

                    $response['success'] = true;
                    $response['message'] = 'ورود با موفقیت انجام شد. در حال انتقال به داشبورد...';
                    $response['user'] = [
                        'user_id' => $user_id,
                        'username' => $username_db,
                        'user_type' => $user_type_db,
                        'email' => $email_db
                    ];
                    // Determine redirect URL based on user type
                    $redirect_url = ($user_type_db === 'client') ? '../../dashboard_client.html' : '../../dashboard_freelancer.html';
                    // For now, using a generic dashboard.html or handling redirect client-side based on user_type
                    $response['redirect_url'] = '../../dashboard.html';

                } else {
                    // Invalid password
                    $response['message'] = 'نام کاربری/ایمیل یا رمز عبور نامعتبر است.';
                    $response['errors']['form'] = 'نام کاربری/ایمیل یا رمز عبور نامعتبر است.';
                }
            }
        } else {
            // No user found with that username/email
            $response['message'] = 'نام کاربری/ایمیل یا رمز عبور نامعتبر است.';
            $response['errors']['form'] = 'نام کاربری/ایمیل یا رمز عبور نامعتبر است.';
        }
    } else {
        $response['message'] = 'خطا در اجرای دستور پایگاه داده.';
        error_log("Login execute error: " . $stmt->error);
    }
    $stmt->close();
} else {
    $response['message'] = 'خطا در آماده سازی دستور پایگاه داده.';
    error_log("Login prepare error: " . $mysqli->error);
}

// Close connection
$mysqli->close();

// Return JSON response
header('Content-Type: application/json');
echo json_encode($response);
exit();
?>
