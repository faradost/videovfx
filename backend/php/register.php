<?php
// backend/php/register.php
require_once '../database/database.php';
require_once '../includes/functions.php';

// Ensure this script is accessed via POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    // If not POST, redirect or show error. For simplicity, just exit.
    // In a real app, you might redirect to the registration form with an error message.
    http_response_code(405); // Method Not Allowed
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit();
}

// Initialize response array
$response = ['success' => false, 'message' => '', 'errors' => []];

// Get and sanitize input data
$username = sanitize_input($_POST['username'] ?? '');
$email = sanitize_input($_POST['email'] ?? '');
$password = $_POST['password'] ?? ''; // Do not sanitize password before hashing
$password_confirm = $_POST['password_confirm'] ?? '';
$user_type = sanitize_input($_POST['user_type'] ?? ''); // 'client' or 'freelancer'
$csrf_token = $_POST['csrf_token'] ?? '';

// CSRF Token Validation
// Note: CSRF token generation should be part of the form display logic.
// For now, we'll assume it's handled. If implementing forms, add CSRF generation.
/*
if (!isset($_SESSION['csrf_token']) || !verify_csrf_token($csrf_token)) {
    $response['message'] = 'CSRF token validation failed.';
    echo json_encode($response);
    exit();
}
*/


// --- Input Validations ---
if (empty($username)) {
    $response['errors']['username'] = 'نام کاربری اجباری است.';
} elseif (strlen($username) < 3 || strlen($username) > 50) {
    $response['errors']['username'] = 'نام کاربری باید بین ۳ تا ۵۰ کاراکتر باشد.';
} elseif (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
    $response['errors']['username'] = 'نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد و زیرخط باشد.';
}

if (empty($email)) {
    $response['errors']['email'] = 'ایمیل اجباری است.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $response['errors']['email'] = 'فرمت ایمیل نامعتبر است.';
}

if (empty($password)) {
    $response['errors']['password'] = 'رمز عبور اجباری است.';
} elseif (strlen($password) < 6) {
    $response['errors']['password'] = 'رمز عبور باید حداقل ۶ کاراکتر باشد.';
}

if ($password !== $password_confirm) {
    $response['errors']['password_confirm'] = 'تکرار رمز عبور مطابقت ندارد.';
}

if (empty($user_type)) {
    $response['errors']['user_type'] = 'نوع کاربری (کارفرما/فریلنسر) اجباری است.';
} elseif (!in_array($user_type, ['client', 'freelancer'])) {
    $response['errors']['user_type'] = 'نوع کاربری نامعتبر است.';
}

// If there are validation errors, return them
if (!empty($response['errors'])) {
    $response['message'] = 'لطفاً خطاهای فرم را اصلاح کنید.';
    echo json_encode($response);
    exit();
}

// Check if username or email already exists
$sql_check = "SELECT user_id FROM users WHERE username = ? OR email = ?";
if ($stmt_check = $mysqli->prepare($sql_check)) {
    $stmt_check->bind_param("ss", $username, $email);
    $stmt_check->execute();
    $stmt_check->store_result();

    if ($stmt_check->num_rows > 0) {
        // To give specific feedback, you'd need two separate queries or fetch the result
        // For now, a generic message if either exists.
        // Fetching to see which one exists:
        $stmt_check->bind_result($found_user_id); // We don't need the ID, just to enable fetch
        $stmt_check->fetch(); // Fetch the row to see the data if needed for more specific error, not strictly necessary here

        // More specific check (optional, requires more queries or logic)
        $stmt_check_username = $mysqli->prepare("SELECT user_id FROM users WHERE username = ?");
        $stmt_check_username->bind_param("s", $username);
        $stmt_check_username->execute();
        $stmt_check_username->store_result();
        if ($stmt_check_username->num_rows > 0) {
            $response['errors']['username'] = 'این نام کاربری قبلاً ثبت شده است.';
        }
        $stmt_check_username->close();

        $stmt_check_email = $mysqli->prepare("SELECT user_id FROM users WHERE email = ?");
        $stmt_check_email->bind_param("s", $email);
        $stmt_check_email->execute();
        $stmt_check_email->store_result();
        if ($stmt_check_email->num_rows > 0) {
            $response['errors']['email'] = 'این ایمیل قبلاً ثبت شده است.';
        }
        $stmt_check_email->close();

        if (!empty($response['errors'])) {
            $response['message'] = 'خطا در اطلاعات وارد شده.';
            echo json_encode($response);
            $stmt_check->close();
            $mysqli->close();
            exit();
        }
    }
    $stmt_check->close();
} else {
    $response['message'] = 'خطا در آماده سازی پایگاه داده برای بررسی کاربر.';
    error_log("MySQLi prepare error for check: " . $mysqli->error);
    echo json_encode($response);
    $mysqli->close();
    exit();
}


// Hash the password
$password_hashed = hash_password($password);
if ($password_hashed === false) {
    $response['message'] = 'خطا در پردازش رمز عبور.';
    error_log("Password hashing failed.");
    echo json_encode($response);
    $mysqli->close();
    exit();
}

// --- Database Insertion ---
// Start transaction
$mysqli->begin_transaction();

try {
    // Insert into users table
    $sql_users = "INSERT INTO users (username, email, password_hash, user_type) VALUES (?, ?, ?, ?)";
    $stmt_users = $mysqli->prepare($sql_users);
    if (!$stmt_users) {
        throw new Exception("خطا در آماده سازی دستور پایگاه داده (users): " . $mysqli->error);
    }
    $stmt_users->bind_param("ssss", $username, $email, $password_hashed, $user_type);

    if (!$stmt_users->execute()) {
        throw new Exception("خطا در ثبت کاربر (users): " . $stmt_users->error);
    }
    $user_id = $stmt_users->insert_id; // Get the ID of the newly inserted user
    $stmt_users->close();

    // Insert into profiles table (basic profile)
    $sql_profiles = "INSERT INTO profiles (user_id, full_name) VALUES (?, ?)";
    $stmt_profiles = $mysqli->prepare($sql_profiles);
    if (!$stmt_profiles) {
        throw new Exception("خطا در آماده سازی دستور پایگاه داده (profiles): " . $mysqli->error);
    }
    // For now, full_name can be the username or empty, user can update it later
    $initial_full_name = $username;
    $stmt_profiles->bind_param("is", $user_id, $initial_full_name);

    if (!$stmt_profiles->execute()) {
        throw new Exception("خطا در ایجاد پروفایل کاربر (profiles): " . $stmt_profiles->error);
    }
    $stmt_profiles->close();

    // Commit transaction
    $mysqli->commit();

    $response['success'] = true;
    $response['message'] = 'ثبت نام با موفقیت انجام شد. اکنون می‌توانید وارد شوید.';
    // Optionally, log the user in directly here by setting session variables
    // $_SESSION['user_id'] = $user_id;
    // $_SESSION['username'] = $username;
    // $_SESSION['user_type'] = $user_type;

} catch (Exception $e) {
    $mysqli->rollback(); // Rollback on error
    $response['message'] = 'خطا در ثبت نام: ' . $e->getMessage();
    error_log("Registration error: " . $e->getMessage());
}

// Close connection
$mysqli->close();

// Return JSON response
header('Content-Type: application/json');
echo json_encode($response);
exit();
?>
