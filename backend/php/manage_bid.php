<?php
// backend/php/manage_bid.php
require_once '../database/database.php';
require_once '../includes/functions.php'; // For session, auth, sanitize

header('Content-Type: application/json');
$response = ['success' => false, 'message' => '', 'errors' => []];

// 1. Authentication: Ensure user is logged in
if (!is_logged_in()) {
    http_response_code(401);
    $response['message'] = 'برای مدیریت پیشنهاد ابتدا باید وارد شوید.';
    echo json_encode($response);
    exit();
}

// 2. Check Request Method (should be POST)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    $response['message'] = 'متد درخواست نامعتبر است.';
    echo json_encode($response);
    exit();
}

// 3. Get JSON Input
$input = json_decode(file_get_contents('php://input'), true);

// 4. Get and Sanitize Input Data
$bid_id = isset($input['bid_id']) ? filter_var($input['bid_id'], FILTER_VALIDATE_INT) : null;
$action = isset($input['action']) ? sanitize_input($input['action']) : null; // 'accept', 'reject', 'withdraw'
$project_id_from_input = isset($input['project_id']) ? filter_var($input['project_id'], FILTER_VALIDATE_INT) : null; // Optional, for context

// CSRF token validation if needed
/*
$csrf_token = $input['csrf_token'] ?? '';
if (!isset($_SESSION['csrf_token']) || !verify_csrf_token($csrf_token)) {
    http_response_code(403);
    $response['message'] = 'CSRF token validation failed.';
    echo json_encode($response);
    exit();
}
*/

// 5. Validate Inputs
if (!$bid_id) {
    $response['errors']['bid_id'] = 'شناسه پیشنهاد نامعتبر است.';
}
if (!in_array($action, ['accept', 'reject', 'withdraw'])) {
    $response['errors']['action'] = 'عملیات نامعتبر است.';
}

if (!empty($response['errors'])) {
    http_response_code(400);
    $response['message'] = 'اطلاعات ارسالی ناقص یا نامعتبر است.';
    echo json_encode($response);
    exit();
}

// 6. Fetch Bid and Project Details for Authorization and Logic
$current_user_id = get_current_user_id();
$current_user_type = get_current_user_type();

$sql_get_bid_info = "SELECT b.freelancer_id, b.bid_amount, b.status AS bid_status,
                            p.project_id, p.client_id AS project_owner_id, p.status AS project_status
                     FROM bids b
                     JOIN projects p ON b.project_id = p.project_id
                     WHERE b.bid_id = ?";
if (!($stmt_info = $mysqli->prepare($sql_get_bid_info))) {
    http_response_code(500);
    $response['message'] = "خطای سرور: آماده سازی دستور اطلاعات پیشنهاد ناموفق بود. " . $mysqli->error;
    error_log("Manage_bid prepare get_bid_info error: " . $mysqli->error);
    echo json_encode($response);
    exit();
}
$stmt_info->bind_param("i", $bid_id);
$stmt_info->execute();
$result_info = $stmt_info->get_result();
$bid_info = $result_info->fetch_assoc();
$stmt_info->close();

if (!$bid_info) {
    http_response_code(404);
    $response['message'] = 'پیشنهاد مورد نظر یافت نشد.';
    echo json_encode($response);
    exit();
}

// Authorization checks based on action
if ($action === 'accept' || $action === 'reject') {
    // Only project owner (client) can accept/reject bids
    if ($current_user_type !== 'client' || $current_user_id != $bid_info['project_owner_id']) {
        http_response_code(403);
        $response['message'] = 'شما مجاز به انجام این عملیات برای این پیشنهاد نیستید.';
        echo json_encode($response);
        exit();
    }
    if ($bid_info['project_status'] !== 'open') {
        http_response_code(400);
        $response['message'] = 'این پروژه دیگر برای پذیرش/رد پیشنهاد باز نیست. وضعیت پروژه: ' . $bid_info['project_status'];
        echo json_encode($response);
        exit();
    }
    if ($bid_info['bid_status'] !== 'pending') {
         http_response_code(400);
        $response['message'] = 'این پیشنهاد قبلا پردازش شده است (وضعیت فعلی: ' . $bid_info['bid_status'] . ').';
        echo json_encode($response);
        exit();
    }
} elseif ($action === 'withdraw') {
    // Only the freelancer who made the bid can withdraw it
    if ($current_user_type !== 'freelancer' || $current_user_id != $bid_info['freelancer_id']) {
        http_response_code(403);
        $response['message'] = 'شما مجاز به لغو این پیشنهاد نیستید.';
        echo json_encode($response);
        exit();
    }
    if ($bid_info['bid_status'] !== 'pending') {
        http_response_code(400);
        $response['message'] = 'فقط پیشنهادات در حال انتظار قابل لغو هستند. وضعیت فعلی: ' . $bid_info['bid_status'];
        echo json_encode($response);
        exit();
    }
     if ($bid_info['project_status'] !== 'open') { // Freelancer cannot withdraw if project is no longer open
        http_response_code(400);
        $response['message'] = 'این پروژه دیگر برای لغو پیشنهاد باز نیست.';
        echo json_encode($response);
        exit();
    }
}


// 7. Perform Action using a Transaction
$mysqli->begin_transaction();
try {
    if ($action === 'accept') {
        // 1. Update bid status to 'accepted'
        $sql_update_bid = "UPDATE bids SET status = 'accepted' WHERE bid_id = ?";
        $stmt_update_bid = $mysqli->prepare($sql_update_bid);
        $stmt_update_bid->bind_param("i", $bid_id);
        if (!$stmt_update_bid->execute()) throw new Exception("خطا در بروزرسانی وضعیت پیشنهاد: " . $stmt_update_bid->error);
        $stmt_update_bid->close();

        // 2. Update project status to 'in_progress'
        $sql_update_project = "UPDATE projects SET status = 'in_progress' WHERE project_id = ?";
        $stmt_update_project = $mysqli->prepare($sql_update_project);
        $stmt_update_project->bind_param("i", $bid_info['project_id']);
        if (!$stmt_update_project->execute()) throw new Exception("خطا در بروزرسانی وضعیت پروژه: " . $stmt_update_project->error);
        $stmt_update_project->close();

        // 3. Create an entry in `project_assignments`
        $sql_assign = "INSERT INTO project_assignments (project_id, freelancer_id, bid_id, agreed_price, start_date, status)
                       VALUES (?, ?, ?, ?, NOW(), 'active')";
        $stmt_assign = $mysqli->prepare($sql_assign);
        $stmt_assign->bind_param("iiid", $bid_info['project_id'], $bid_info['freelancer_id'], $bid_id, $bid_info['bid_amount']);
        if (!$stmt_assign->execute()) throw new Exception("خطا در ثبت تخصیص پروژه: " . $stmt_assign->error);
        $stmt_assign->close();

        // 4. (Optional) Reject other pending bids for the same project
        $sql_reject_others = "UPDATE bids SET status = 'rejected' WHERE project_id = ? AND bid_id != ? AND status = 'pending'";
        $stmt_reject_others = $mysqli->prepare($sql_reject_others);
        $stmt_reject_others->bind_param("ii", $bid_info['project_id'], $bid_id);
        if (!$stmt_reject_others->execute()) throw new Exception("خطا در رد کردن سایر پیشنهادات: " . $stmt_reject_others->error);
        $stmt_reject_others->close();

        $response['message'] = 'پیشنهاد با موفقیت پذیرفته شد و پروژه به فریلنسر تخصیص داده شد.';
        if (function_exists('create_notification_helper')) {
            $project_title_for_notif = $bid_info['project_title'] ?? $project_id_from_input; // Fallback if title not fetched
            create_notification_helper($mysqli, $bid_info['freelancer_id'], "تبریک! پیشنهاد شما برای پروژه '{$project_title_for_notif}' پذیرفته شد.", "project_details.html?id={$bid_info['project_id']}");
        }


    } elseif ($action === 'reject') {
        $sql_update_bid = "UPDATE bids SET status = 'rejected' WHERE bid_id = ?";
        $stmt_update_bid = $mysqli->prepare($sql_update_bid);
        $stmt_update_bid->bind_param("i", $bid_id);
        if (!$stmt_update_bid->execute()) throw new Exception("خطا در بروزرسانی وضعیت پیشنهاد: " . $stmt_update_bid->error);
        $stmt_update_bid->close();
        $response['message'] = 'پیشنهاد با موفقیت رد شد.';
        if (function_exists('create_notification_helper')) {
            $project_title_for_notif = $bid_info['project_title'] ?? $project_id_from_input;
            create_notification_helper($mysqli, $bid_info['freelancer_id'], "متاسفانه پیشنهاد شما برای پروژه '{$project_title_for_notif}' رد شد.", "project_details.html?id={$bid_info['project_id']}");
        }

    } elseif ($action === 'withdraw') {
        $sql_update_bid = "UPDATE bids SET status = 'withdrawn' WHERE bid_id = ?";
        $stmt_update_bid = $mysqli->prepare($sql_update_bid);
        $stmt_update_bid->bind_param("i", $bid_id);
        if (!$stmt_update_bid->execute()) throw new Exception("خطا در بروزرسانی وضعیت پیشنهاد: " . $stmt_update_bid->error);
        $stmt_update_bid->close();
        $response['message'] = 'پیشنهاد شما با موفقیت لغو شد.';
        if (function_exists('create_notification_helper')) {
            $project_title_for_notif = $bid_info['project_title'] ?? $project_id_from_input;
            $freelancer_username = $_SESSION['username'] ?? 'یک فریلنسر';
            create_notification_helper($mysqli, $bid_info['project_owner_id'], "فریلنسر {$freelancer_username} پیشنهاد خود را برای پروژه '{$project_title_for_notif}' لغو کرد.", "project_details.html?id={$bid_info['project_id']}");
        }
    }

    $mysqli->commit();
    $response['success'] = true;

} catch (Exception $e) {
    $mysqli->rollback();
    http_response_code(500);
    $response['message'] = 'عملیات ناموفق بود: ' . $e->getMessage();
    error_log("Manage_bid transaction error: " . $e->getMessage());
}

// The create_notification_helper function is expected to be in functions.php and included.

$mysqli->close();
echo json_encode($response);
?>
