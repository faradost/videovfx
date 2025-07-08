<?php
// backend/php/get_project_details.php
require_once '../database/database.php';
require_once '../includes/functions.php'; // For session checks, etc.

header('Content-Type: application/json');
$response = ['success' => false, 'message' => '', 'project' => null, 'bids' => []];

// Get project_id from query parameter
$project_id = isset($_GET['id']) ? filter_var($_GET['id'], FILTER_VALIDATE_INT) : null;

if (!$project_id) {
    http_response_code(400); // Bad Request
    $response['message'] = 'شناسه پروژه نامعتبر یا ارائه نشده است.';
    echo json_encode($response);
    exit();
}

// --- Fetch Project Details ---
$sql_project = "SELECT p.project_id, p.client_id, p.title, p.description, p.budget, p.status,
                       p.created_at, p.updated_at, p.deadline, p.tags,
                       u.username AS client_username, prof.avatar_url AS client_avatar_url
                FROM projects p
                JOIN users u ON p.client_id = u.user_id
                LEFT JOIN profiles prof ON u.user_id = prof.user_id
                WHERE p.project_id = ?";

if ($stmt_project = $mysqli->prepare($sql_project)) {
    $stmt_project->bind_param("i", $project_id);
    if ($stmt_project->execute()) {
        $result_project = $stmt_project->get_result();
        if ($project_data = $result_project->fetch_assoc()) {
            // Format data
            $project_data['created_at_formatted'] = date("Y-m-d H:i", strtotime($project_data['created_at']));
            $project_data['deadline_formatted'] = $project_data['deadline'] ? date("Y-m-d", strtotime($project_data['deadline'])) : 'نامشخص';
            $project_data['budget_formatted'] = $project_data['budget'] ? number_format($project_data['budget'], 0, '.', ',') . ' تومان' : 'توافقی';
            $project_data['tags_array'] = !empty($project_data['tags']) ? array_map('trim', explode(',', $project_data['tags'])) : [];
            $project_data['client_avatar_url'] = $project_data['client_avatar_url'] ?: 'frontend/images/default_avatar.png';

            // Determine if the current user is the owner of the project
            $current_user_id = get_current_user_id();
            $project_data['is_owner'] = ($current_user_id && $current_user_id == $project_data['client_id']);

            $response['success'] = true;
            $response['project'] = $project_data;

            // --- Fetch Bids for this Project ---
            // Bids are generally visible to the client who posted the project.
            // Freelancers might see their own bid, or a summary (e.g., number of bids, average bid).
            // For simplicity, let's show bids if the user is the project owner or an admin (admin role not implemented yet).
            // Freelancers should generally not see other freelancers' detailed bids until one is accepted, or not at all.

            $can_view_bids = $project_data['is_owner']; // Extend this logic for admins or other roles if necessary

            if ($can_view_bids || ($project_data['status'] !== 'open' && $project_data['status'] !== 'in_progress')) { // Also show bids if project is completed/cancelled for transparency
                 $sql_bids = "SELECT b.bid_id, b.freelancer_id, b.bid_amount, b.proposal_text,
                                    b.estimated_delivery_days, b.created_at AS bid_created_at, b.status AS bid_status,
                                    u_freelancer.username AS freelancer_username,
                                    prof_freelancer.avatar_url AS freelancer_avatar_url,
                                    (SELECT COUNT(*) FROM project_assignments pa WHERE pa.freelancer_id = b.freelancer_id AND pa.status = 'completed') as freelancer_completed_projects,
                                    (SELECT AVG(r.rating) FROM reviews r WHERE r.reviewee_id = b.freelancer_id) as freelancer_avg_rating
                             FROM bids b
                             JOIN users u_freelancer ON b.freelancer_id = u_freelancer.user_id
                             LEFT JOIN profiles prof_freelancer ON u_freelancer.user_id = prof_freelancer.user_id
                             WHERE b.project_id = ?
                             ORDER BY b.bid_amount ASC, b.created_at DESC"; // Example sort: lowest bid first

                if ($stmt_bids = $mysqli->prepare($sql_bids)) {
                    $stmt_bids->bind_param("i", $project_id);
                    if ($stmt_bids->execute()) {
                        $result_bids = $stmt_bids->get_result();
                        while ($bid_row = $result_bids->fetch_assoc()) {
                            $bid_row['bid_created_at_formatted'] = date("Y-m-d H:i", strtotime($bid_row['bid_created_at']));
                            $bid_row['bid_amount_formatted'] = number_format($bid_row['bid_amount'], 0, '.', ',') . ' تومان';
                            $bid_row['freelancer_avatar_url'] = $bid_row['freelancer_avatar_url'] ?: 'frontend/images/default_avatar.png';
                            $bid_row['freelancer_avg_rating'] = $bid_row['freelancer_avg_rating'] ? number_format($bid_row['freelancer_avg_rating'], 1) : 'جدید';
                            $response['bids'][] = $bid_row;
                        }
                    } else {
                        // Log error, but don't fail the whole request if bids can't be fetched
                        error_log("Error executing bids query: " . $stmt_bids->error);
                    }
                    $stmt_bids->close();
                } else {
                    error_log("Error preparing bids query: " . $mysqli->error);
                }
            } else {
                // If user is not owner and project is open/in_progress, just send bid count or summary
                $sql_bid_summary = "SELECT COUNT(*) as bid_count, AVG(bid_amount) as avg_bid_amount FROM bids WHERE project_id = ?";
                if($stmt_summary = $mysqli->prepare($sql_bid_summary)){
                    $stmt_summary->bind_param("i", $project_id);
                    $stmt_summary->execute();
                    $result_summary = $stmt_summary->get_result()->fetch_assoc();
                    $response['project']['bid_summary'] = [
                        'count' => $result_summary['bid_count'] ?? 0,
                        'avg_amount_formatted' => ($result_summary['avg_bid_amount'] ? number_format($result_summary['avg_bid_amount'],0,'.',','). ' تومان' : 'N/A')
                    ];
                    $stmt_summary->close();
                }
            }
             // Check if the current logged-in freelancer (if any) has already bid on this project
            if (is_logged_in_as('freelancer')) {
                $current_freelancer_id = get_current_user_id();
                $sql_check_bid = "SELECT bid_id FROM bids WHERE project_id = ? AND freelancer_id = ?";
                if ($stmt_check_bid = $mysqli->prepare($sql_check_bid)) {
                    $stmt_check_bid->bind_param("ii", $project_id, $current_freelancer_id);
                    $stmt_check_bid->execute();
                    $stmt_check_bid->store_result();
                    if ($stmt_check_bid->num_rows > 0) {
                        $response['project']['current_user_has_bid'] = true;
                    } else {
                        $response['project']['current_user_has_bid'] = false;
                    }
                    $stmt_check_bid->close();
                }
            }


        } else {
            http_response_code(404); // Not Found
            $response['message'] = 'پروژه با این شناسه یافت نشد.';
        }
    } else {
        http_response_code(500); // Internal Server Error
        $response['message'] = 'خطا در اجرای دستور برای جزئیات پروژه.';
        error_log("Get_project_details execute error: " . $stmt_project->error);
    }
    $stmt_project->close();
} else {
    http_response_code(500); // Internal Server Error
    $response['message'] = 'خطا در آماده سازی دستور برای جزئیات پروژه.';
    error_log("Get_project_details prepare error: " . $mysqli->error);
}

$mysqli->close();
echo json_encode($response);
?>
