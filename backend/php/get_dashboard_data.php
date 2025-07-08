<?php
// backend/php/get_dashboard_data.php
require_once '../database/database.php';
require_once '../includes/functions.php'; // Includes session_start() and auth checks

header('Content-Type: application/json');
$response = ['success' => false, 'message' => '', 'data' => null];

// 1. Authentication: Ensure user is logged in
if (!is_logged_in()) {
    http_response_code(401); // Unauthorized
    $response['message'] = 'برای مشاهده داشبورد ابتدا باید وارد شوید.';
    echo json_encode($response);
    exit();
}

$user_id = get_current_user_id();
$user_type = get_current_user_type();

$dashboard_data = [
    'user' => [
        'user_id' => $user_id,
        'username' => $_SESSION['username'] ?? '', // Assuming username is stored in session
        'user_type' => $user_type,
        'email' => $_SESSION['email'] ?? '' // Assuming email is stored in session
    ],
    'client_data' => null,
    'freelancer_data' => null,
    'notifications' => [] // Placeholder for notifications
];

if ($user_type === 'client') {
    // Fetch projects posted by the client
    $client_projects = [];
    $sql_client_projects = "SELECT project_id, title, status, created_at,
                                   (SELECT COUNT(*) FROM bids WHERE project_id = p.project_id) as bid_count
                            FROM projects p
                            WHERE client_id = ?
                            ORDER BY created_at DESC";
    if ($stmt_cp = $mysqli->prepare($sql_client_projects)) {
        $stmt_cp->bind_param("i", $user_id);
        $stmt_cp->execute();
        $result_cp = $stmt_cp->get_result();
        while ($row = $result_cp->fetch_assoc()) {
            $row['created_at_formatted'] = date("Y-m-d", strtotime($row['created_at']));
            $row['status_translated'] = translate_project_status($row['status']);
            $client_projects[] = $row;
        }
        $stmt_cp->close();
    } else {
        error_log("Dashboard (Client Projects) DB Error: " . $mysqli->error);
        // Continue, don't fail the whole dashboard for this
    }
    $dashboard_data['client_data']['projects_posted'] = $client_projects;

    // Optionally, fetch recent bids on their projects or other relevant client info

} elseif ($user_type === 'freelancer') {
    // Fetch projects the freelancer has bid on
    $freelancer_bids = [];
    $sql_freelancer_bids = "SELECT b.bid_id, b.bid_amount, b.status AS bid_status, b.created_at AS bid_created_at,
                                   p.project_id, p.title AS project_title, p.status AS project_status
                            FROM bids b
                            JOIN projects p ON b.project_id = p.project_id
                            WHERE b.freelancer_id = ?
                            ORDER BY b.created_at DESC";
    if ($stmt_fb = $mysqli->prepare($sql_freelancer_bids)) {
        $stmt_fb->bind_param("i", $user_id);
        $stmt_fb->execute();
        $result_fb = $stmt_fb->get_result();
        while ($row = $result_fb->fetch_assoc()) {
            $row['bid_created_at_formatted'] = date("Y-m-d", strtotime($row['bid_created_at']));
            $row['bid_status_translated'] = translate_bid_status($row['bid_status']);
            $row['project_status_translated'] = translate_project_status($row['project_status']);
            $freelancer_bids[] = $row;
        }
        $stmt_fb->close();
    } else {
        error_log("Dashboard (Freelancer Bids) DB Error: " . $mysqli->error);
    }
    $dashboard_data['freelancer_data']['my_bids'] = $freelancer_bids;

    // Fetch projects assigned to the freelancer (active/in_progress)
    $assigned_projects = [];
    $sql_assigned_projects = "SELECT pa.assignment_id, pa.agreed_price, pa.start_date, pa.status AS assignment_status,
                                     p.project_id, p.title AS project_title, p.status AS project_status,
                                     u_client.username AS client_username
                              FROM project_assignments pa
                              JOIN projects p ON pa.project_id = p.project_id
                              JOIN users u_client ON p.client_id = u_client.user_id
                              WHERE pa.freelancer_id = ? AND pa.status = 'active' -- Or other relevant statuses
                              ORDER BY pa.start_date DESC";
    if ($stmt_ap = $mysqli->prepare($sql_assigned_projects)) {
        $stmt_ap->bind_param("i", $user_id);
        $stmt_ap->execute();
        $result_ap = $stmt_ap->get_result();
        while ($row = $result_ap->fetch_assoc()) {
            $row['start_date_formatted'] = date("Y-m-d", strtotime($row['start_date']));
            // Assuming assignment_status directly maps or needs translation
            $row['assignment_status_translated'] = translate_assignment_status($row['assignment_status']);
            $row['project_status_translated'] = translate_project_status($row['project_status']);
            $assigned_projects[] = $row;
        }
        $stmt_ap->close();
    } else {
        error_log("Dashboard (Assigned Projects) DB Error: " . $mysqli->error);
    }
    $dashboard_data['freelancer_data']['assigned_projects'] = $assigned_projects;
}

// Fetch notifications (basic example, could be more complex)
$notifications = [];
$sql_notifications = "SELECT notification_id, message, link, is_read, created_at
                      FROM notifications
                      WHERE user_id = ? AND is_read = FALSE
                      ORDER BY created_at DESC LIMIT 5"; // Get last 5 unread
if ($stmt_notif = $mysqli->prepare($sql_notifications)) {
    $stmt_notif->bind_param("i", $user_id);
    $stmt_notif->execute();
    $result_notif = $stmt_notif->get_result();
    while ($row = $result_notif->fetch_assoc()) {
        $row['created_at_formatted'] = time_elapsed_string($row['created_at']);
        $notifications[] = $row;
    }
    $stmt_notif->close();
} else {
    error_log("Dashboard (Notifications) DB Error: " . $mysqli->error);
}
$dashboard_data['notifications'] = $notifications;


$response['success'] = true;
$response['data'] = $dashboard_data;

$mysqli->close();
echo json_encode($response);


// Helper functions for translations (could be in functions.php or a dedicated i18n file)
function translate_project_status($status) {
    $translations = [
        'open' => 'باز',
        'in_progress' => 'در حال انجام',
        'completed' => 'تکمیل شده',
        'cancelled' => 'لغو شده',
        'expired' => 'منقضی شده'
    ];
    return $translations[$status] ?? $status;
}

function translate_bid_status($status) {
    $translations = [
        'pending' => 'در انتظار بررسی',
        'accepted' => 'پذیرفته شده',
        'rejected' => 'رد شده',
        'withdrawn' => 'لغو شده توسط فریلنسر'
    ];
    return $translations[$status] ?? $status;
}

function translate_assignment_status($status) {
     $translations = [
        'active' => 'فعال',
        'completed' => 'تکمیل شده',
        'terminated' => 'خاتمه یافته'
    ];
    return $translations[$status] ?? $status;
}


function time_elapsed_string($datetime, $full = false) {
    $now = new DateTime;
    $ago = new DateTime($datetime);
    $diff = $now->diff($ago);

    $diff->w = floor($diff->d / 7);
    $diff->d -= $diff->w * 7;

    $string = array(
        'y' => 'سال',
        'm' => 'ماه',
        'w' => 'هفته',
        'd' => 'روز',
        'h' => 'ساعت',
        'i' => 'دقیقه',
        's' => 'ثانیه',
    );
    foreach ($string as $k => &$v) {
        if ($diff->$k) {
            $v = $diff->$k . ' ' . $v . ($diff->$k > 1 && $k != 'm' ? '' : '');//pluralization for Persian needs more work
        } else {
            unset($string[$k]);
        }
    }

    if (!$full) $string = array_slice($string, 0, 1);
    return $string ? implode(', ', $string) . ' پیش' : 'همین الان';
}

?>
