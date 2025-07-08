<?php
// backend/php/place_bid.php
require_once '../database/database.php';
require_once '../includes/functions.php'; // For session, auth, sanitize

header('Content-Type: application/json');
$response = ['success' => false, 'message' => '', 'errors' => []];

// 1. Authentication: Ensure user is logged in and is a 'freelancer'
if (!is_logged_in()) {
    http_response_code(401);
    $response['message'] = 'برای ارسال پیشنهاد ابتدا باید وارد شوید.';
    echo json_encode($response);
    exit();
}

if (!is_logged_in_as('freelancer')) {
    http_response_code(403);
    $response['message'] = 'فقط فریلنسرها می‌توانند پیشنهاد ثبت کنند.';
    echo json_encode($response);
    exit();
}

// 2. Check Request Method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    $response['message'] = 'متد درخواست نامعتبر است.';
    echo json_encode($response);
    exit();
}

// 3. Get Current User ID (Freelancer ID)
$freelancer_id = get_current_user_id();
if (!$freelancer_id) {
    http_response_code(500);
    $response['message'] = 'خطای سرور: اطلاعات کاربر یافت نشد.';
    error_log("Place_bid: Freelancer ID not found in session despite being logged in.");
    echo json_encode($response);
    exit();
}

// 4. Get and Sanitize Input Data
$project_id = isset($_POST['project_id']) ? filter_var($_POST['project_id'], FILTER_VALIDATE_INT) : null;
$bid_amount_str = sanitize_input($_POST['bid_amount'] ?? '');
$proposal_text = sanitize_input($_POST['proposal_text'] ?? ''); // Basic sanitization, consider allowing some HTML with a proper library if needed
$estimated_delivery_days_str = sanitize_input($_POST['estimated_delivery_days'] ?? '');

// CSRF token validation
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
if (!$project_id) {
    $response['errors']['project_id'] = 'شناسه پروژه نامعتبر است.';
}

$bid_amount = null;
if (empty($bid_amount_str)) {
    $response['errors']['bid_amount'] = 'مبلغ پیشنهادی اجباری است.';
} elseif (!is_numeric($bid_amount_str) || floatval($bid_amount_str) <= 0) {
    $response['errors']['bid_amount'] = 'مبلغ پیشنهادی باید یک عدد مثبت باشد.';
} else {
    $bid_amount = floatval($bid_amount_str);
}

if (empty($proposal_text)) {
    $response['errors']['proposal_text'] = 'متن پیشنهاد اجباری است.';
} elseif (strlen($proposal_text) < 50) {
    $response['errors']['proposal_text'] = 'متن پیشنهاد باید حداقل ۵۰ کاراکتر باشد.';
} elseif (strlen($proposal_text) > 5000) { // Max length for proposal
    $response['errors']['proposal_text'] = 'متن پیشنهاد نمی‌تواند بیشتر از ۵۰۰۰ کاراکتر باشد.';
}


$estimated_delivery_days = null;
if (empty($estimated_delivery_days_str)) {
    $response['errors']['estimated_delivery_days'] = 'زمان تخمینی تحویل اجباری است.';
} elseif (!filter_var($estimated_delivery_days_str, FILTER_VALIDATE_INT, ["options" => ["min_range" => 1]])) {
    $response['errors']['estimated_delivery_days'] = 'زمان تخمینی تحویل باید یک عدد صحیح مثبت باشد.';
} else {
    $estimated_delivery_days = intval($estimated_delivery_days_str);
}


if (!empty($response['errors'])) {
    http_response_code(400);
    $response['message'] = 'لطفاً خطاهای فرم را اصلاح کنید.';
    echo json_encode($response);
    exit();
}

// 6. Additional Business Logic Validations
// - Check if project is still 'open'
// - Check if freelancer hasn't already bid on this project
// - Check if freelancer is not the owner of the project

$sql_check_project = "SELECT client_id, status FROM projects WHERE project_id = ?";
if ($stmt_check_project = $mysqli->prepare($sql_check_project)) {
    $stmt_check_project->bind_param("i", $project_id);
    $stmt_check_project->execute();
    $result_check_project = $stmt_check_project->get_result();
    if ($project_details = $result_check_project->fetch_assoc()) {
        if ($project_details['status'] !== 'open') {
            $response['message'] = 'متاسفانه این پروژه دیگر برای دریافت پیشنهاد باز نیست.';
            http_response_code(403);
            echo json_encode($response);
            $stmt_check_project->close(); $mysqli->close(); exit();
        }
        if ($project_details['client_id'] == $freelancer_id) {
            $response['message'] = 'شما نمی‌توانید برای پروژه خودتان پیشنهاد ثبت کنید.';
            http_response_code(403);
            echo json_encode($response);
            $stmt_check_project->close(); $mysqli->close(); exit();
        }
    } else {
        $response['message'] = 'پروژه مورد نظر یافت نشد.';
        http_response_code(404);
        echo json_encode($response);
        $stmt_check_project->close(); $mysqli->close(); exit();
    }
    $stmt_check_project->close();
} else {
    $response['message'] = 'خطا در بررسی وضعیت پروژه.';
    http_response_code(500);
    error_log("Place_bid project check prepare error: " . $mysqli->error);
    echo json_encode($response);
    $mysqli->close(); exit();
}


$sql_check_bid = "SELECT bid_id FROM bids WHERE project_id = ? AND freelancer_id = ?";
if ($stmt_check_bid = $mysqli->prepare($sql_check_bid)) {
    $stmt_check_bid->bind_param("ii", $project_id, $freelancer_id);
    $stmt_check_bid->execute();
    $stmt_check_bid->store_result();
    if ($stmt_check_bid->num_rows > 0) {
        $response['message'] = 'شما قبلاً برای این پروژه پیشنهاد ارسال کرده‌اید.';
        http_response_code(409); // Conflict
        echo json_encode($response);
        $stmt_check_bid->close(); $mysqli->close(); exit();
    }
    $stmt_check_bid->close();
} else {
    $response['message'] = 'خطا در بررسی پیشنهادات قبلی.';
    http_response_code(500);
    error_log("Place_bid existing bid check prepare error: " . $mysqli->error);
    echo json_encode($response);
    $mysqli->close(); exit();
}


// 7. Database Insertion
$sql_insert_bid = "INSERT INTO bids (project_id, freelancer_id, bid_amount, proposal_text, estimated_delivery_days, status, created_at)
                   VALUES (?, ?, ?, ?, ?, 'pending', NOW())";

if ($stmt_insert = $mysqli->prepare($sql_insert_bid)) {
    $stmt_insert->bind_param("iidss",
        $project_id,
        $freelancer_id,
        $bid_amount,
        $proposal_text,
        $estimated_delivery_days
    );

    if ($stmt_insert->execute()) {
        $bid_id = $stmt_insert->insert_id;
        $response['success'] = true;
        $response['message'] = 'پیشنهاد شما با موفقیت ثبت شد!';
        $response['bid_id'] = $bid_id;
        http_response_code(201); // Created

        // Notify the project owner about the new bid
        // Fetch project title and client_id for the notification message
        $sql_project_info = "SELECT title, client_id FROM projects WHERE project_id = ?";
        if($stmt_pi = $mysqli->prepare($sql_project_info)){
            $stmt_pi->bind_param("i", $project_id);
            $stmt_pi->execute();
            $project_info_res = $stmt_pi->get_result()->fetch_assoc();
            if($project_info_res){
                $project_title = $project_info_res['title'];
                $project_owner_id = $project_info_res['client_id'];
                $freelancer_username = $_SESSION['username'] ?? 'یک فریلنسر'; // Get username from session

                $notification_message = "پیشنهاد جدیدی از طرف {$freelancer_username} برای پروژه '{$project_title}' ثبت شد.";
                $notification_link = "project_details.html?id={$project_id}#bidsListArea";

                // Use the create_notification function (assuming it's available, e.g. from functions.php or defined below)
                if (function_exists('create_notification')) {
                    create_notification($mysqli, $project_owner_id, $notification_message, $notification_link);
                } else {
                    // Fallback or log error if function isn't available
                    error_log("create_notification function not found in place_bid.php");
                }
            }
            $stmt_pi->close();
        }
        // End notification part

    } else {
        http_response_code(500);
        $response['message'] = 'خطا در ثبت پیشنهاد در پایگاه داده.';
        error_log("Error creating bid: " . $stmt_insert->error);
    }
    $stmt_insert->close();
} else {
    http_response_code(500);
    $response['message'] = 'خطا در آماده سازی دستور پایگاه داده برای ثبت پیشنهاد.';
    error_log("Error preparing statement for bid creation: " . $mysqli->error);
}

$mysqli->close();
echo json_encode($response);
?>
