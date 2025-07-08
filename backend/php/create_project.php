<?php
// backend/php/create_project.php
require_once '../database/database.php';
require_once '../includes/functions.php'; // Includes session_start() and auth checks

// Initialize response array
$response = ['success' => false, 'message' => '', 'errors' => []];

// 1. Authentication: Ensure user is logged in and is a 'client'
if (!is_logged_in()) {
    http_response_code(401); // Unauthorized
    $response['message'] = 'برای ثبت پروژه ابتدا باید وارد شوید.';
    echo json_encode($response);
    exit();
}

if (!is_logged_in_as('client')) {
    http_response_code(403); // Forbidden
    $response['message'] = 'فقط کارفرمایان می‌توانند پروژه جدید ثبت کنند.';
    echo json_encode($response);
    exit();
}

// 2. Check Request Method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    $response['message'] = 'متد درخواست نامعتبر است.';
    echo json_encode($response);
    exit();
}

// 3. Get Current User ID (Client ID)
$client_id = get_current_user_id();
if (!$client_id) {
    // This should ideally not happen if is_logged_in() passed
    http_response_code(500);
    $response['message'] = 'خطای سرور: اطلاعات کاربر یافت نشد.';
    error_log("Create_project: User ID not found in session despite being logged in.");
    echo json_encode($response);
    exit();
}


// 4. Get and Sanitize Input Data
$project_title = sanitize_input($_POST['project_title'] ?? '');
$project_description = sanitize_input($_POST['project_description'] ?? ''); // Allow basic HTML if needed, or use a more robust sanitizer
$project_budget_str = sanitize_input($_POST['project_budget'] ?? '');
$project_deadline_str = sanitize_input($_POST['project_deadline'] ?? '');
$project_tags = sanitize_input($_POST['project_tags'] ?? ''); // Comma-separated string of tags

// CSRF token validation - if implemented on the frontend form
/*
$csrf_token = $_POST['csrf_token'] ?? '';
if (!isset($_SESSION['csrf_token']) || !verify_csrf_token($csrf_token)) {
    http_response_code(403);
    $response['message'] = 'CSRF token validation failed.';
    echo json_encode($response);
    exit();
}
*/

// 5. Validate Inputs
if (empty($project_title)) {
    $response['errors']['project_title'] = 'عنوان پروژه اجباری است.';
} elseif (strlen($project_title) > 255) {
    $response['errors']['project_title'] = 'عنوان پروژه نباید بیشتر از ۲۵۵ کاراکتر باشد.';
}

if (empty($project_description)) {
    $response['errors']['project_description'] = 'توضیحات پروژه اجباری است.';
} elseif (strlen($project_description) < 50) {
    $response['errors']['project_description'] = 'توضیحات پروژه باید حداقل ۵۰ کاراکتر باشد.';
}


$project_budget = null;
if (!empty($project_budget_str)) {
    if (!is_numeric($project_budget_str) || floatval($project_budget_str) < 0) {
        $response['errors']['project_budget'] = 'بودجه باید یک عدد معتبر باشد.';
    } else {
        $project_budget = floatval($project_budget_str);
    }
}


$project_deadline = null;
if (!empty($project_deadline_str)) {
    // Validate date format (Y-m-d) and ensure it's not in the past
    $date_format = 'Y-m-d';
    $d = DateTime::createFromFormat($date_format, $project_deadline_str);
    if ($d && $d->format($date_format) === $project_deadline_str) {
        $today = new DateTime();
        $today->setTime(0,0,0); // Compare dates only
        if ($d < $today) {
            $response['errors']['project_deadline'] = 'مهلت انجام نمی‌تواند تاریخی در گذشته باشد.';
        } else {
            $project_deadline = $project_deadline_str;
        }
    } else {
        $response['errors']['project_deadline'] = 'فرمت تاریخ مهلت انجام نامعتبر است. (مثال: YYYY-MM-DD)';
    }
}

// Validate tags (optional: length, number of tags, etc.)
if (strlen($project_tags) > 255) {
    $response['errors']['project_tags'] = 'فیلد مهارت‌ها نباید بیشتر از ۲۵۵ کاراکتر باشد.';
}


// If there are validation errors, return them
if (!empty($response['errors'])) {
    http_response_code(400); // Bad Request
    $response['message'] = 'لطفاً خطاهای فرم را اصلاح کنید.';
    echo json_encode($response);
    exit();
}

// 6. Database Insertion
$sql = "INSERT INTO projects (client_id, title, description, budget, deadline, tags, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'open', NOW(), NOW())";

if ($stmt = $mysqli->prepare($sql)) {
    // Bind parameters: i for integer, s for string, d for double/decimal
    // client_id (i), title (s), description (s), budget (d or s if allowing formatted string), deadline (s), tags (s)
    $stmt->bind_param("issdss",
        $client_id,
        $project_title,
        $project_description,
        $project_budget,  // Pass null if empty, or the float value
        $project_deadline, // Pass null if empty, or the date string
        $project_tags
    );

    if ($stmt->execute()) {
        $project_id = $stmt->insert_id;
        $response['success'] = true;
        $response['message'] = 'پروژه با موفقیت ثبت شد!';
        $response['project_id'] = $project_id;
        http_response_code(201); // Created
    } else {
        http_response_code(500); // Internal Server Error
        $response['message'] = 'خطا در ثبت پروژه در پایگاه داده.';
        error_log("Error creating project: " . $stmt->error);
    }
    $stmt->close();
} else {
    http_response_code(500); // Internal Server Error
    $response['message'] = 'خطا در آماده سازی دستور پایگاه داده.';
    error_log("Error preparing statement for project creation: " . $mysqli->error);
}

// Close connection
$mysqli->close();

// Return JSON response
header('Content-Type: application/json');
echo json_encode($response);
exit();
?>
