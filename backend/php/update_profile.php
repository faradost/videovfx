<?php
// backend/php/update_profile.php
require_once '../database/database.php';
require_once '../includes/functions.php'; // For session, auth, sanitize

header('Content-Type: application/json');
$response = ['success' => false, 'message' => '', 'errors' => [], 'updated_profile' => null];

// 1. Authentication: Ensure user is logged in
if (!is_logged_in()) {
    http_response_code(401);
    $response['message'] = 'برای بروزرسانی پروفایل ابتدا باید وارد شوید.';
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

$current_user_id = get_current_user_id();

// 3. Get Input Data (using FormData, so from $_POST and $_FILES)
$full_name = sanitize_input($_POST['full_name'] ?? '');
$bio = sanitize_input($_POST['bio'] ?? ''); // Consider a more advanced sanitizer if HTML is allowed
$skills = sanitize_input($_POST['skills'] ?? ''); // Comma-separated
$portfolio_links = sanitize_input($_POST['portfolio_links'] ?? ''); // Newline-separated
$country = sanitize_input($_POST['country'] ?? '');

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

// 4. Validate Inputs (basic validation)
if (strlen($full_name) > 255) {
    $response['errors']['full_name'] = 'نام کامل نباید بیشتر از ۲۵۵ کاراکتر باشد.';
}
if (strlen($bio) > 5000) { // Example limit for bio
    $response['errors']['bio'] = 'بخش درباره من نباید بیشتر از ۵۰۰۰ کاراکتر باشد.';
}
if (strlen($skills) > 1000) {
    $response['errors']['skills'] = 'فیلد مهارت‌ها نباید بیشتر از ۱۰۰۰ کاراکتر باشد.';
}
if (strlen($portfolio_links) > 2000) {
    $response['errors']['portfolio_links'] = 'لینک‌های نمونه کار نباید بیشتر از ۲۰۰۰ کاراکتر باشد.';
}
if (strlen($country) > 100) {
    $response['errors']['country'] = 'نام کشور نباید بیشتر از ۱۰۰ کاراکتر باشد.';
}


if (!empty($response['errors'])) {
    http_response_code(400);
    $response['message'] = 'لطفاً خطاهای فرم را اصلاح کنید.';
    echo json_encode($response);
    exit();
}

// 5. Handle Avatar Upload (if a file is provided)
$avatar_path_to_store = null;
if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] == UPLOAD_ERR_OK) {
    $upload_dir = '../../frontend/uploads/avatars/'; // Relative to this script's location
    if (!is_dir($upload_dir) && !mkdir($upload_dir, 0775, true)) {
        $response['message'] = 'خطا در ایجاد پوشه آپلود آواتار.';
        error_log("Failed to create avatar upload directory: " . $upload_dir);
        http_response_code(500);
        echo json_encode($response);
        exit;
    }

    $allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
    $file_type = $_FILES['avatar']['type'];
    if (!in_array($file_type, $allowed_types)) {
        $response['errors']['avatar'] = 'فقط فایل‌های تصویری (JPG, PNG, GIF) مجاز هستند.';
    }

    $max_file_size = 2 * 1024 * 1024; // 2MB
    if ($_FILES['avatar']['size'] > $max_file_size) {
        $response['errors']['avatar'] = 'حداکثر حجم فایل برای آواتار ۲ مگابایت است.';
    }

    if (empty($response['errors']['avatar'])) {
        $file_extension = pathinfo($_FILES['avatar']['name'], PATHINFO_EXTENSION);
        $new_filename = 'avatar_' . $current_user_id . '_' . time() . '.' . $file_extension;
        $upload_file = $upload_dir . $new_filename;

        if (move_uploaded_file($_FILES['avatar']['tmp_name'], $upload_file)) {
            $avatar_path_to_store = 'frontend/uploads/avatars/' . $new_filename; // Path relative to project root for storing in DB

            // Optional: Delete old avatar if it exists
            $sql_get_old_avatar = "SELECT avatar_url FROM profiles WHERE user_id = ?";
            if($stmt_old_avatar = $mysqli->prepare($sql_get_old_avatar)){
                $stmt_old_avatar->bind_param("i", $current_user_id);
                $stmt_old_avatar->execute();
                $old_avatar_result = $stmt_old_avatar->get_result()->fetch_assoc();
                if($old_avatar_result && !empty($old_avatar_result['avatar_url']) && $old_avatar_result['avatar_url'] !== 'frontend/images/default_avatar.png'){
                    if(file_exists('../../' . $old_avatar_result['avatar_url'])){ // Check from project root
                         unlink('../../' . $old_avatar_result['avatar_url']);
                    }
                }
                $stmt_old_avatar->close();
            }

        } else {
            $response['errors']['avatar'] = 'خطا در آپلود فایل آواتار.';
            error_log("Failed to move uploaded avatar file for user: " . $current_user_id);
        }
    }
}

if (!empty($response['errors'])) {
    http_response_code(400);
    $response['message'] = 'لطفاً خطاهای فرم را اصلاح کنید (مخصوصا در آپلود آواتار).';
    echo json_encode($response);
    exit();
}


// 6. Database Update
// Check if a profile entry exists, if not, create one (should exist from registration)
$sql_check_profile = "SELECT profile_id FROM profiles WHERE user_id = ?";
$stmt_check = $mysqli->prepare($sql_check_profile);
$stmt_check->bind_param("i", $current_user_id);
$stmt_check->execute();
$stmt_check->store_result();
$profile_exists = $stmt_check->num_rows > 0;
$stmt_check->close();

if ($profile_exists) {
    $sql_update = "UPDATE profiles SET full_name = ?, bio = ?, skills = ?, portfolio_links = ?, country = ?";
    $types = "sssss";
    $params = [$full_name, $bio, $skills, $portfolio_links, $country];

    if ($avatar_path_to_store) {
        $sql_update .= ", avatar_url = ?";
        $types .= "s";
        $params[] = $avatar_path_to_store;
    }
    $sql_update .= " WHERE user_id = ?";
    $types .= "i";
    $params[] = $current_user_id;

    $stmt_update = $mysqli->prepare($sql_update);
    $stmt_update->bind_param($types, ...$params);

} else {
    // This case should ideally not happen if profile is created during registration
    $sql_insert = "INSERT INTO profiles (user_id, full_name, bio, skills, portfolio_links, country, avatar_url)
                   VALUES (?, ?, ?, ?, ?, ?, ?)";
    $avatar_to_insert = $avatar_path_to_store ?: 'frontend/images/default_avatar.png'; // Default if not uploaded
    $stmt_update = $mysqli->prepare($sql_insert); // Re-using stmt_update variable name
    $stmt_update->bind_param("issssss", $current_user_id, $full_name, $bio, $skills, $portfolio_links, $country, $avatar_to_insert);
}


if ($stmt_update->execute()) {
    if ($stmt_update->affected_rows > 0 || ($profile_exists && !$avatar_path_to_store && $stmt_update->affected_rows === 0)) { // Allow 0 affected if no actual text change but avatar might have
        $response['success'] = true;
        $response['message'] = 'پروفایل با موفقیت بروزرسانی شد.';

        // Fetch the updated profile data to send back
        $sql_get_updated = "SELECT u.user_id, u.username, u.email, u.user_type,
                                   p.full_name, p.bio, p.skills, p.portfolio_links, p.avatar_url, p.country,
                                   p.average_rating, p.completed_projects
                            FROM users u
                            LEFT JOIN profiles p ON u.user_id = p.user_id
                            WHERE u.user_id = ?";
        if($stmt_get = $mysqli->prepare($sql_get_updated)){
            $stmt_get->bind_param("i", $current_user_id);
            $stmt_get->execute();
            $updated_profile_data = $stmt_get->get_result()->fetch_assoc();
            if($updated_profile_data){
                 $updated_profile_data['avatar_url'] = $updated_profile_data['avatar_url'] ?: 'frontend/images/default_avatar.png';
                 $updated_profile_data['skills_array'] = !empty($updated_profile_data['skills']) ? array_map('trim', explode(',', $updated_profile_data['skills'])) : [];
                 $updated_profile_data['portfolio_links_array'] = !empty($updated_profile_data['portfolio_links']) ? array_map('trim', preg_split('/\r\n|\r|\n/', $updated_profile_data['portfolio_links'])) : [];
                 $response['updated_profile'] = $updated_profile_data;
            }
            $stmt_get->close();
        }
    } else {
        $response['message'] = 'تغییری برای بروزرسانی وجود نداشت یا خطا در بروزرسانی.';
        // This might not be an error if user submitted same data.
        // $response['success'] = true; // Could be true if no change is not an error
    }
} else {
    http_response_code(500);
    $response['message'] = 'خطا در بروزرسانی پروفایل در پایگاه داده.';
    error_log("Error updating profile for user $current_user_id: " . $stmt_update->error);
}
$stmt_update->close();

$mysqli->close();
echo json_encode($response);
?>
