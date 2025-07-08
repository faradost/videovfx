<?php
// backend/php/get_messages.php
require_once '../database/database.php';
require_once '../includes/functions.php'; // For auth and time_elapsed_string

header('Content-Type: application/json');
$response = ['success' => false, 'message' => '', 'threads' => [], 'messages' => [], 'pagination' => null];

// 1. Authentication
if (!is_logged_in()) {
    http_response_code(401);
    $response['message'] = 'برای مشاهده پیام‌ها ابتدا باید وارد شوید.';
    echo json_encode($response);
    exit();
}
$current_user_id = get_current_user_id();

// 2. Parameters:
// - 'thread_with_user_id': To fetch messages with a specific user.
// - 'project_id': To fetch messages related to a specific project (often combined with thread_with_user_id).
// - If no specific user/project, fetch message threads (list of users current user has talked to).
$thread_with_user_id = isset($_GET['with_user_id']) ? filter_var($_GET['with_user_id'], FILTER_VALIDATE_INT) : null;
$related_project_id = isset($_GET['project_id']) ? filter_var($_GET['project_id'], FILTER_VALIDATE_INT, FILTER_NULL_ON_FAILURE) : null;

$page = isset($_GET['page']) ? filter_var($_GET['page'], FILTER_VALIDATE_INT, ["options" => ["default" => 1, "min_range" => 1]]) : 1;
$limit = isset($_GET['limit']) ? filter_var($_GET['limit'], FILTER_VALIDATE_INT, ["options" => ["default" => 20, "min_range" => 1]]) : 20; // Messages per page for a thread
$offset = ($page - 1) * $limit;


if ($thread_with_user_id) {
    // Fetching messages for a specific conversation thread
    $other_user_id = $thread_with_user_id;

    // Optional: Mark messages from this other user as read upon fetching the thread
    $sql_mark_read = "UPDATE messages SET is_read = TRUE
                      WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE";
    if($related_project_id) $sql_mark_read .= " AND project_id = ?";
    else $sql_mark_read .= " AND project_id IS NULL"; // For general messages not tied to a project

    if($stmt_mark = $mysqli->prepare($sql_mark_read)){
        if($related_project_id) $stmt_mark->bind_param("iii", $current_user_id, $other_user_id, $related_project_id);
        else $stmt_mark->bind_param("ii", $current_user_id, $other_user_id);
        $stmt_mark->execute();
        $stmt_mark->close();
    }


    $sql_messages = "SELECT m.message_id, m.sender_id, m.receiver_id, m.project_id, m.message_text, m.sent_at, m.is_read,
                            s_user.username AS sender_username, s_prof.avatar_url AS sender_avatar,
                            r_user.username AS receiver_username, r_prof.avatar_url AS receiver_avatar
                     FROM messages m
                     JOIN users s_user ON m.sender_id = s_user.user_id
                     LEFT JOIN profiles s_prof ON m.sender_id = s_prof.user_id
                     JOIN users r_user ON m.receiver_id = r_user.user_id
                     LEFT JOIN profiles r_prof ON m.receiver_id = r_prof.user_id
                     WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))";

    $params = [$current_user_id, $other_user_id, $other_user_id, $current_user_id];
    $types = "iiii";

    if ($related_project_id) {
        $sql_messages .= " AND m.project_id = ?";
        $params[] = $related_project_id;
        $types .= "i";
    } else {
        // If fetching general chat, explicitly ask for NULL project_id or handle based on app logic
         $sql_messages .= " AND m.project_id IS NULL";
    }

    $sql_messages .= " ORDER BY m.sent_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";

    if ($stmt_msg = $mysqli->prepare($sql_messages)) {
        $stmt_msg->bind_param($types, ...$params);
        $stmt_msg->execute();
        $result_msg = $stmt_msg->get_result();
        $messages_data = [];
        while ($row = $result_msg->fetch_assoc()) {
            $row['sent_at_formatted'] = time_elapsed_string($row['sent_at']); // from functions.php
            $row['sender_avatar'] = $row['sender_avatar'] ?: 'frontend/images/default_avatar.png';
            $row['receiver_avatar'] = $row['receiver_avatar'] ?: 'frontend/images/default_avatar.png';
            $messages_data[] = $row;
        }
        $stmt_msg->close();
        $response['success'] = true;
        $response['messages'] = array_reverse($messages_data); // Show oldest first in the current page
        // Add pagination info for this thread if needed (count total messages in this thread)
    } else {
        http_response_code(500);
        $response['message'] = "خطا در آماده سازی دستور پیام‌ها: " . $mysqli->error;
        error_log("Get_messages (thread) prepare error: " . $mysqli->error);
    }

} else {
    // Fetching message threads (list of users the current user has conversations with)
    // This query gets the latest message for each conversation partner (sender or receiver)
    // It also considers project_id to separate threads for different projects with the same user.
    $sql_threads = "
        SELECT
            other_user_id,
            other_username,
            other_avatar_url,
            project_id,
            p_title AS project_title,
            last_message_text,
            last_message_sent_at,
            last_message_sender_id,
            unread_count
        FROM (
            SELECT
                IF(m.sender_id = ?, m.receiver_id, m.sender_id) AS other_user_id,
                u.username AS other_username,
                prof.avatar_url AS other_avatar_url,
                m.project_id,
                p.title as p_title,
                m.message_text AS last_message_text,
                m.sent_at AS last_message_sent_at,
                m.sender_id AS last_message_sender_id,
                (SELECT COUNT(*) FROM messages sub_m WHERE sub_m.receiver_id = ? AND sub_m.sender_id = IF(m.sender_id = ?, m.receiver_id, m.sender_id) AND sub_m.is_read = FALSE AND IFNULL(sub_m.project_id, 0) = IFNULL(m.project_id, 0)) AS unread_count,
                ROW_NUMBER() OVER (PARTITION BY IF(m.sender_id = ?, m.receiver_id, m.sender_id), IFNULL(m.project_id, 0) ORDER BY m.sent_at DESC) as rn
            FROM messages m
            JOIN users u ON u.user_id = IF(m.sender_id = ?, m.receiver_id, m.sender_id)
            LEFT JOIN profiles prof ON prof.user_id = u.user_id
            LEFT JOIN projects p ON m.project_id = p.project_id
            WHERE m.sender_id = ? OR m.receiver_id = ?
        ) AS ranked_messages
        WHERE rn = 1
        ORDER BY last_message_sent_at DESC
        LIMIT ? OFFSET ?
    ";
    // Parameters for the main query part of threads: current_user_id repeated multiple times
    // For other_user_id, other_username, other_avatar_url, last_message_sender_id, unread_count, rn partitioning, and WHERE clause
    $thread_params = [$current_user_id, $current_user_id, $current_user_id, $current_user_id, $current_user_id, $current_user_id, $current_user_id, $limit, $offset];
    $thread_types = "iiiiiiiiii";


    if ($stmt_threads = $mysqli->prepare($sql_threads)) {
        $stmt_threads->bind_param($thread_types, ...$thread_params);
        $stmt_threads->execute();
        $result_threads = $stmt_threads->get_result();
        $threads_data = [];
        while ($row = $result_threads->fetch_assoc()) {
            $row['last_message_sent_at_formatted'] = time_elapsed_string($row['last_message_sent_at']);
            $row['other_avatar_url'] = $row['other_avatar_url'] ?: 'frontend/images/default_avatar.png';
            $row['is_last_message_yours'] = ($row['last_message_sender_id'] == $current_user_id);
            $threads_data[] = $row;
        }
        $stmt_threads->close();
        $response['success'] = true;
        $response['threads'] = $threads_data;
        // Add pagination for threads list if needed (count total distinct threads)

    } else {
        http_response_code(500);
        $response['message'] = "خطا در آماده سازی دستور لیست گفتگوها: " . $mysqli->error;
        error_log("Get_messages (threads) prepare error: " . $mysqli->error);
    }
}


$mysqli->close();
echo json_encode($response);
?>
