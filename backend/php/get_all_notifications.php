<?php
// backend/php/get_all_notifications.php
require_once '../database/database.php';
require_once '../includes/functions.php'; // For time_elapsed_string and auth

header('Content-Type: application/json');
$response = ['success' => false, 'message' => '', 'notifications' => [], 'pagination' => null];

if (!is_logged_in()) {
    http_response_code(401);
    $response['message'] = 'برای مشاهده اعلانات ابتدا باید وارد شوید.';
    echo json_encode($response);
    exit();
}

$user_id = get_current_user_id();

// Pagination parameters
$page = isset($_GET['page']) ? filter_var($_GET['page'], FILTER_VALIDATE_INT, ["options" => ["default" => 1, "min_range" => 1]]) : 1;
$limit = isset($_GET['limit']) ? filter_var($_GET['limit'], FILTER_VALIDATE_INT, ["options" => ["default" => 15, "min_range" => 1]]) : 15;
$offset = ($page - 1) * $limit;

// Count total notifications for the user for pagination
$sql_count = "SELECT COUNT(*) FROM notifications WHERE user_id = ?";
$total_notifications = 0;
if ($stmt_count = $mysqli->prepare($sql_count)) {
    $stmt_count->bind_param("i", $user_id);
    $stmt_count->execute();
    $stmt_count->bind_result($total_notifications);
    $stmt_count->fetch();
    $stmt_count->close();
} else {
    http_response_code(500);
    $response['message'] = "خطا در شمارش اعلانات: " . $mysqli->error;
    error_log("Get_all_notifications count prepare error: " . $mysqli->error);
    echo json_encode($response);
    $mysqli->close();
    exit();
}

$total_pages = ceil($total_notifications / $limit);
$response['pagination'] = [
    'currentPage' => $page,
    'totalPages' => $total_pages,
    'totalNotifications' => $total_notifications,
    'perPage' => $limit
];

// Fetch paginated notifications for the user
$sql_notifications = "SELECT notification_id, message, link, is_read, created_at
                      FROM notifications
                      WHERE user_id = ?
                      ORDER BY created_at DESC
                      LIMIT ? OFFSET ?";

if ($stmt_notifications = $mysqli->prepare($sql_notifications)) {
    $stmt_notifications->bind_param("iii", $user_id, $limit, $offset);
    $stmt_notifications->execute();
    $result = $stmt_notifications->get_result();

    $notifications_data = [];
    while ($row = $result->fetch_assoc()) {
        // Use a helper function if it exists, otherwise define time_elapsed_string here or include it
        if (function_exists('time_elapsed_string')) {
             $row['created_at_formatted'] = time_elapsed_string($row['created_at']);
        } else {
            // Fallback basic formatting if time_elapsed_string is not available
            $date = new DateTime($row['created_at']);
            $row['created_at_formatted'] = $date->format('Y-m-d H:i');
        }
        $notifications_data[] = $row;
    }
    $stmt_notifications->close();

    $response['success'] = true;
    $response['notifications'] = $notifications_data;
    if (empty($notifications_data) && $total_notifications > 0 && $page > 1) {
        $response['message'] = 'اعلانی در این صفحه یافت نشد.';
    } elseif (empty($notifications_data) && $total_notifications === 0) {
        $response['message'] = 'هیچ اعلانی برای شما وجود ندارد.';
    }

} else {
    http_response_code(500);
    $response['message'] = "خطا در آماده سازی دستور اعلانات: " . $mysqli->error;
    error_log("Get_all_notifications prepare error: " . $mysqli->error);
}

$mysqli->close();
echo json_encode($response);

// Definition for time_elapsed_string if not already in functions.php or included
if (!function_exists('time_elapsed_string')) {
    function time_elapsed_string($datetime, $full = false) {
        $now = new DateTime;
        $ago = new DateTime($datetime);
        $diff = $now->diff($ago);

        $diff->w = floor($diff->d / 7);
        $diff->d -= $diff->w * 7;

        $string = array(
            'y' => 'سال', 'm' => 'ماه', 'w' => 'هفته', 'd' => 'روز',
            'h' => 'ساعت', 'i' => 'دقیقه', 's' => 'ثانیه',
        );
        foreach ($string as $k => &$v) {
            if ($diff->$k) {
                $v = $diff->$k . ' ' . $v; // Simplified pluralization
            } else {
                unset($string[$k]);
            }
        }
        if (!$full) $string = array_slice($string, 0, 1);
        return $string ? implode(', ', $string) . ' پیش' : 'همین الان';
    }
}
?>
