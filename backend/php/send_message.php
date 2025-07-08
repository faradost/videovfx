<?php
// backend/php/send_message.php
require_once '../database/database.php';
require_once '../includes/functions.php'; // For auth and sanitization

header('Content-Type: application/json');
$response = ['success' => false, 'message' => '', 'errors' => []];

// 1. Authentication
if (!is_logged_in()) {
    http_response_code(401);
    $response['message'] = 'برای ارسال پیام ابتدا باید وارد شوید.';
    echo json_encode($response);
    exit();
}
$sender_id = get_current_user_id();

// 2. Check Request Method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    $response['message'] = 'متد درخواست نامعتبر است.';
    echo json_encode($response);
    exit();
}

// 3. Get Input Data (assuming JSON input)
$input = json_decode(file_get_contents('php://input'), true);

$receiver_id = isset($input['receiver_id']) ? filter_var($input['receiver_id'], FILTER_VALIDATE_INT) : null;
$message_text = isset($input['message_text']) ? sanitize_input(trim($input['message_text'])) : ''; // Trim and sanitize
$project_id = isset($input['project_id']) ? filter_var($input['project_id'], FILTER_VALIDATE_INT, FILTER_NULL_ON_FAILURE) : null;

// CSRF token validation if implemented for AJAX JSON requests
/*
$csrf_token = $input['csrf_token'] ?? '';
if (!isset($_SESSION['csrf_token']) || !verify_csrf_token($csrf_token)) {
    http_response_code(403);
    $response['message'] = 'CSRF token validation failed.';
    echo json_encode($response);
    exit();
}
*/

// 4. Validate Inputs
if (!$receiver_id) {
    $response['errors']['receiver_id'] = 'شناسه گیرنده نامعتبر است.';
}
if (empty($message_text)) {
    $response['errors']['message_text'] = 'متن پیام نمی‌تواند خالی باشد.';
} elseif (mb_strlen($message_text, 'UTF-8') > 2000) { // Max length for a message
    $response['errors']['message_text'] = 'متن پیام نمی‌تواند بیشتر از ۲۰۰۰ کاراکتر باشد.';
}
if ($sender_id == $receiver_id) {
    $response['errors']['receiver_id'] = 'شما نمی‌توانید به خودتان پیام ارسال کنید.';
}

// Optional: Validate project_id if provided (e.g., check if sender/receiver are part of the project)
if ($project_id) {
    // Basic check: does project exist?
    $sql_check_project = "SELECT project_id FROM projects WHERE project_id = ?";
    $stmt_check_proj = $mysqli->prepare($sql_check_project);
    $stmt_check_proj->bind_param("i", $project_id);
    $stmt_check_proj->execute();
    $stmt_check_proj->store_result();
    if ($stmt_check_proj->num_rows == 0) {
        $response['errors']['project_id'] = 'پروژه مرتبط یافت نشد.';
    }
    $stmt_check_proj->close();
    // More complex: Are sender/receiver allowed to communicate about this project?
    // This might involve checking if the sender is the client and receiver bid, or if they are assigned, etc.
    // For a basic system, we might skip this deep check for now.
}


if (!empty($response['errors'])) {
    http_response_code(400);
    $response['message'] = 'اطلاعات ارسالی ناقص یا نامعتبر است.';
    echo json_encode($response);
    exit();
}

// 5. Database Insertion
$sql_insert_message = "INSERT INTO messages (sender_id, receiver_id, project_id, message_text, sent_at, is_read)
                       VALUES (?, ?, ?, ?, NOW(), FALSE)";

if ($stmt_insert = $mysqli->prepare($sql_insert_message)) {
    $stmt_insert->bind_param("iiis",
        $sender_id,
        $receiver_id,
        $project_id, // Will be NULL if $project_id is null
        $message_text
    );

    if ($stmt_insert->execute()) {
        $message_id = $stmt_insert->insert_id;
        $response['success'] = true;
        $response['message'] = 'پیام با موفقیت ارسال شد.';
        $response['message_id'] = $message_id;
        // Optionally return the sent message object or parts of it
        $response['sent_message'] = [
            'message_id' => $message_id,
            'sender_id' => $sender_id,
            'receiver_id' => $receiver_id,
            'project_id' => $project_id,
            'message_text' => $message_text, // Return the sanitized version
            'sent_at' => date('Y-m-d H:i:s'), // Current timestamp
            'is_read' => false
        ];
        http_response_code(201); // Created

        // Create a notification for the receiver
        $sender_username = $_SESSION['username'] ?? 'یک کاربر';
        $notification_msg_text = "شما یک پیام جدید از طرف {$sender_username} دارید.";
        $notification_link_url = "messages.html"; // Or specific message thread page: "messages.html?thread_with={$sender_id}"
        if ($project_id) {
             $notification_msg_text .= " در مورد پروژه با شناسه {$project_id}.";
             $notification_link_url = "project_details.html?id={$project_id}#messaging"; // Link to project messaging area
        }
        if (function_exists('create_notification_helper')) {
            create_notification_helper($mysqli, $receiver_id, $notification_msg_text, $notification_link_url);
        }

    } else {
        http_response_code(500);
        $response['message'] = 'خطا در ارسال پیام به پایگاه داده.';
        error_log("Error sending message: " . $stmt_insert->error);
    }
    $stmt_insert->close();
} else {
    http_response_code(500);
    $response['message'] = 'خطا در آماده سازی دستور پایگاه داده برای ارسال پیام.';
    error_log("Error preparing statement for message sending: " . $mysqli->error);
}

$mysqli->close();
echo json_encode($response);
?>
