<?php
// backend/php/mark_notification_read.php
require_once '../database/database.php';
require_once '../includes/functions.php';

header('Content-Type: application/json');
$response = ['success' => false, 'message' => ''];

if (!is_logged_in()) {
    http_response_code(401);
    $response['message'] = 'برای این عملیات ابتدا باید وارد شوید.';
    echo json_encode($response);
    exit();
}

$current_user_id = get_current_user_id();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $notification_id = isset($input['notification_id']) ? filter_var($input['notification_id'], FILTER_VALIDATE_INT) : null; // Single ID
    $mark_all_as_read = isset($input['mark_all']) ? filter_var($input['mark_all'], FILTER_VALIDATE_BOOLEAN) : false;

    if ($mark_all_as_read) {
        // Mark all unread notifications for the user as read
        $sql = "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->bind_param("i", $current_user_id);
            if ($stmt->execute()) {
                $response['success'] = true;
                $response['message'] = 'تمام اعلانات خوانده شده علامت زده شدند.';
            } else {
                http_response_code(500);
                $response['message'] = 'خطا در بروزرسانی وضعیت اعلانات: ' . $stmt->error;
                error_log("Mark all notifications read DB error: " . $stmt->error);
            }
            $stmt->close();
        } else {
            http_response_code(500);
            $response['message'] = 'خطا در آماده سازی دستور پایگاه داده: ' . $mysqli->error;
            error_log("Mark all notifications read DB prepare error: " . $mysqli->error);
        }
    } elseif ($notification_id) {
        // Mark a single notification as read
        $sql = "UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->bind_param("ii", $notification_id, $current_user_id);
            if ($stmt->execute()) {
                if ($stmt->affected_rows > 0) {
                    $response['success'] = true;
                    $response['message'] = 'اعلان خوانده شده علامت زده شد.';
                } else {
                    // Notification might not exist, belong to another user, or already be read
                    http_response_code(404); // Or 403 if it's an auth issue on existing one
                    $response['message'] = 'اعلان یافت نشد یا شما مجاز به تغییر آن نیستید.';
                }
            } else {
                http_response_code(500);
                $response['message'] = 'خطا در بروزرسانی وضعیت اعلان: ' . $stmt->error;
                error_log("Mark notification read DB error: " . $stmt->error);
            }
            $stmt->close();
        } else {
            http_response_code(500);
            $response['message'] = 'خطا در آماده سازی دستور پایگاه داده: ' . $mysqli->error;
            error_log("Mark notification read DB prepare error: " . $mysqli->error);
        }
    } else {
        http_response_code(400);
        $response['message'] = 'شناسه اعلان یا درخواست علامت زدن همه اعلانات ارائه نشده است.';
    }
} else {
    http_response_code(405);
    $response['message'] = 'متد درخواست نامعتبر.';
}

$mysqli->close();
echo json_encode($response);
?>
