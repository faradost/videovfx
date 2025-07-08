<?php
// backend/php/get_profile.php
require_once '../database/database.php';
require_once '../includes/functions.php'; // For session checks, etc.

header('Content-Type: application/json');
$response = ['success' => false, 'message' => '', 'profile' => null];

// Get user_id from query parameter (to view other profiles) or session (for own profile)
$profile_user_id = isset($_GET['user_id']) ? filter_var($_GET['user_id'], FILTER_VALIDATE_INT) : null;
$current_user_id = get_current_user_id(); // Logged-in user

if (!$profile_user_id) {
    // If no user_id is provided in GET, default to the logged-in user's profile
    if ($current_user_id) {
        $profile_user_id = $current_user_id;
    } else {
        http_response_code(400); // Bad Request or 401 Unauthorized
        $response['message'] = 'شناسه کاربر برای مشاهده پروفایل مشخص نشده و یا شما وارد نشده‌اید.';
        echo json_encode($response);
        exit();
    }
}

// --- Fetch Profile Details ---
$sql_profile = "SELECT u.user_id, u.username, u.email, u.user_type, u.created_at AS member_since,
                       p.full_name, p.bio, p.skills, p.portfolio_links, p.avatar_url, p.country,
                       p.average_rating, p.completed_projects
                FROM users u
                LEFT JOIN profiles p ON u.user_id = p.user_id
                WHERE u.user_id = ?";

if ($stmt_profile = $mysqli->prepare($sql_profile)) {
    $stmt_profile->bind_param("i", $profile_user_id);
    if ($stmt_profile->execute()) {
        $result_profile = $stmt_profile->get_result();
        if ($profile_data = $result_profile->fetch_assoc()) {
            // Format data
            $profile_data['member_since_formatted'] = date("F Y", strtotime($profile_data['member_since'])); // e.g., January 2023
            $profile_data['avatar_url'] = $profile_data['avatar_url'] ?: 'frontend/images/default_avatar.png';
            $profile_data['skills_array'] = !empty($profile_data['skills']) ? array_map('trim', explode(',', $profile_data['skills'])) : [];
            $profile_data['portfolio_links_array'] = !empty($profile_data['portfolio_links']) ? array_map('trim', preg_split('/\r\n|\r|\n/', $profile_data['portfolio_links'])) : [];

            // Determine if the current logged-in user is viewing their own profile
            $profile_data['is_own_profile'] = ($current_user_id && $current_user_id == $profile_data['user_id']);

            // Mask email if not own profile (optional, based on privacy settings)
            if (!$profile_data['is_own_profile']) {
                 // $profile_data['email'] = '******'; // Or remove it completely
            }

            $response['success'] = true;
            $response['profile'] = $profile_data;

            // --- Fetch additional stats or related data based on user_type ---
            if ($profile_data['user_type'] === 'client') {
                // Example: Number of open projects, total projects posted
                $sql_client_stats = "SELECT
                                        (SELECT COUNT(*) FROM projects WHERE client_id = ? AND status = 'open') as open_projects_count,
                                        (SELECT COUNT(*) FROM projects WHERE client_id = ?) as total_projects_posted";
                if($stmt_cs = $mysqli->prepare($sql_client_stats)){
                    $stmt_cs->bind_param("ii", $profile_user_id, $profile_user_id);
                    $stmt_cs->execute();
                    $client_stats_result = $stmt_cs->get_result()->fetch_assoc();
                    $response['profile']['client_stats'] = $client_stats_result;
                    $stmt_cs->close();
                }
            } elseif ($profile_data['user_type'] === 'freelancer') {
                // Example: Number of active assignments, total bids made (already have completed_projects and avg_rating in profiles table)
                 $sql_freelancer_stats = "SELECT
                                        (SELECT COUNT(*) FROM project_assignments WHERE freelancer_id = ? AND status = 'active') as active_assignments_count,
                                        (SELECT COUNT(*) FROM bids WHERE freelancer_id = ?) as total_bids_made";
                if($stmt_fs = $mysqli->prepare($sql_freelancer_stats)){
                    $stmt_fs->bind_param("ii", $profile_user_id, $profile_user_id);
                    $stmt_fs->execute();
                    $freelancer_stats_result = $stmt_fs->get_result()->fetch_assoc();
                    $response['profile']['freelancer_stats'] = $freelancer_stats_result;
                    $stmt_fs->close();
                }
            }

            // --- Fetch Reviews for this user (reviewee_id) ---
            $reviews = [];
            $sql_reviews = "SELECT r.review_id, r.project_id, r.rating, r.comment, r.created_at AS review_date,
                                   p.title AS project_title,
                                   u_reviewer.user_id AS reviewer_user_id,
                                   u_reviewer.username AS reviewer_username,
                                   prof_reviewer.avatar_url AS reviewer_avatar_url
                            FROM reviews r
                            JOIN projects p ON r.project_id = p.project_id
                            JOIN users u_reviewer ON r.reviewer_id = u_reviewer.user_id
                            LEFT JOIN profiles prof_reviewer ON r.reviewer_id = prof_reviewer.user_id
                            WHERE r.reviewee_id = ?
                            ORDER BY r.created_at DESC LIMIT 10"; // Get last 10 reviews

            if($stmt_reviews = $mysqli->prepare($sql_reviews)){
                $stmt_reviews->bind_param("i", $profile_user_id);
                $stmt_reviews->execute();
                $result_reviews = $stmt_reviews->get_result();
                while($review_row = $result_reviews->fetch_assoc()){
                    $review_row['review_date_formatted'] = date("Y-m-d", strtotime($review_row['review_date']));
                    $review_row['reviewer_avatar_url'] = $review_row['reviewer_avatar_url'] ?: 'frontend/images/default_avatar.png';
                    $reviews[] = $review_row;
                }
                $stmt_reviews->close();
            }
            $response['profile']['reviews_received'] = $reviews;


        } else {
            http_response_code(404); // Not Found
            $response['message'] = 'پروفایل با این شناسه کاربری یافت نشد.';
        }
    } else {
        http_response_code(500); // Internal Server Error
        $response['message'] = 'خطا در اجرای دستور برای اطلاعات پروفایل.';
        error_log("Get_profile execute error: " . $stmt_profile->error);
    }
    $stmt_profile->close();
} else {
    http_response_code(500); // Internal Server Error
    $response['message'] = 'خطا در آماده سازی دستور برای اطلاعات پروفایل.';
    error_log("Get_profile prepare error: " . $mysqli->error);
}

$mysqli->close();
echo json_encode($response);
?>
