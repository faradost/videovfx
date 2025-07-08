<?php
// backend/php/get_projects.php
require_once '../database/database.php';
require_once '../includes/functions.php'; // For sanitize_input if used for params

header('Content-Type: application/json');
$response = ['success' => false, 'message' => '', 'projects' => [], 'pagination' => null];

// Parameters for filtering, sorting, and pagination (optional for now)
$page = isset($_GET['page']) ? filter_var($_GET['page'], FILTER_VALIDATE_INT, ["options" => ["default" => 1, "min_range" => 1]]) : 1;
$limit = isset($_GET['limit']) ? filter_var($_GET['limit'], FILTER_VALIDATE_INT, ["options" => ["default" => 10, "min_range" => 1]]) : 10; // Number of projects per page
$offset = ($page - 1) * $limit;

// Filtering parameters
$keywords = isset($_GET['keywords']) ? sanitize_input($_GET['keywords']) : '';
$category_tags = isset($_GET['category']) ? sanitize_input($_GET['category']) : ''; // Assuming category maps to tags for now
$min_budget = isset($_GET['min_budget']) ? filter_var($_GET['min_budget'], FILTER_VALIDATE_FLOAT, FILTER_NULL_ON_FAILURE) : null;
$max_budget = isset($_GET['max_budget']) ? filter_var($_GET['max_budget'], FILTER_VALIDATE_FLOAT, FILTER_NULL_ON_FAILURE) : null;

// Sorting parameters (e.g., sort_by=date_desc, budget_asc)
$sort_by = isset($_GET['sort_by']) ? sanitize_input($_GET['sort_by']) : 'date_desc';


// Base SQL query
$sql = "SELECT p.project_id, p.title, p.description, p.budget, p.status, p.created_at, p.deadline, p.tags,
               u.username AS client_username, pr.avatar_url AS client_avatar
        FROM projects p
        JOIN users u ON p.client_id = u.user_id
        LEFT JOIN profiles pr ON u.user_id = pr.user_id
        WHERE p.status = 'open'"; // Initially, only show 'open' projects

$count_sql = "SELECT COUNT(p.project_id)
              FROM projects p
              JOIN users u ON p.client_id = u.user_id
              WHERE p.status = 'open'";

$params = [];
$types = "";

// Apply filters
if (!empty($keywords)) {
    $sql .= " AND (p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)";
    $count_sql .= " AND (p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)";
    $keyword_param = "%" . $keywords . "%";
    array_push($params, $keyword_param, $keyword_param, $keyword_param);
    $types .= "sss";
}

if (!empty($category_tags)) {
    // This assumes category is one of the tags. For a dedicated category field, adjust the schema and query.
    $sql .= " AND p.tags LIKE ?";
    $count_sql .= " AND p.tags LIKE ?";
    $category_param = "%" . $category_tags . "%";
    array_push($params, $category_param);
    $types .= "s";
}

if ($min_budget !== null) {
    $sql .= " AND p.budget >= ?";
    $count_sql .= " AND p.budget >= ?";
    array_push($params, $min_budget);
    $types .= "d";
}
if ($max_budget !== null) {
    $sql .= " AND p.budget <= ?";
    $count_sql .= " AND p.budget <= ?";
    array_push($params, $max_budget);
    $types .= "d";
}


// Apply sorting
$order_clause = " ORDER BY p.created_at DESC"; // Default sort
switch ($sort_by) {
    case 'date_asc':
        $order_clause = " ORDER BY p.created_at ASC";
        break;
    case 'budget_asc':
        $order_clause = " ORDER BY p.budget ASC, p.created_at DESC";
        break;
    case 'budget_desc':
        $order_clause = " ORDER BY p.budget DESC, p.created_at DESC";
        break;
    // Add more sort options if needed (e.g., deadline)
}
$sql .= $order_clause;

// Apply pagination
$sql .= " LIMIT ? OFFSET ?";
array_push($params, $limit, $offset);
$types .= "ii";


// Execute count query for pagination
$total_projects = 0;
if ($stmt_count = $mysqli->prepare($count_sql)) {
    if (!empty($types)) { // types will be shorter for count query (no limit/offset)
        $count_types = substr($types, 0, -2); // Remove "ii" for limit and offset
        $count_params = array_slice($params, 0, -2); // Remove limit and offset values
        if(!empty($count_types)){ // only bind if there are params
             $stmt_count->bind_param($count_types, ...$count_params);
        }
    }
    $stmt_count->execute();
    $stmt_count->bind_result($total_projects);
    $stmt_count->fetch();
    $stmt_count->close();
} else {
    $response['message'] = "خطا در شمارش پروژه‌ها: " . $mysqli->error;
    error_log("Get_projects count prepare error: " . $mysqli->error);
    echo json_encode($response);
    $mysqli->close();
    exit();
}

$total_pages = ceil($total_projects / $limit);
$response['pagination'] = [
    'currentPage' => $page,
    'totalPages' => $total_pages,
    'totalProjects' => $total_projects,
    'perPage' => $limit
];


// Execute main query for projects
if ($stmt = $mysqli->prepare($sql)) {
    if(!empty($types)){ // only bind if there are params
        $stmt->bind_param($types, ...$params);
    }

    if ($stmt->execute()) {
        $result = $stmt->get_result();
        $projects_data = [];
        while ($row = $result->fetch_assoc()) {
            // Format data as needed (e.g., date formatting, budget formatting)
            $row['created_at_formatted'] = date("d M Y", strtotime($row['created_at']));
            if ($row['deadline']) {
                $row['deadline_formatted'] = date("d M Y", strtotime($row['deadline']));
            } else {
                $row['deadline_formatted'] = 'نامشخص';
            }
            $row['budget_formatted'] = $row['budget'] ? number_format($row['budget'], 0, '.', ',') . ' تومان' : 'توافقی';
            $row['description_short'] = strlen($row['description']) > 150 ? mb_substr($row['description'], 0, 150, 'UTF-8') . '...' : $row['description'];
            $row['client_avatar'] = $row['client_avatar'] ?: 'frontend/images/default_avatar.png'; // Default avatar
            $projects_data[] = $row;
        }
        $response['success'] = true;
        $response['projects'] = $projects_data;
        if (empty($projects_data) && $total_projects === 0) {
             $response['message'] = 'در حال حاضر هیچ پروژه بازی با این مشخصات یافت نشد.';
        } elseif (empty($projects_data) && $total_projects > 0) {
            $response['message'] = 'پروژه ای در این صفحه یافت نشد.';
        }

    } else {
        $response['message'] = "خطا در اجرای دستور: " . $stmt->error;
        error_log("Get_projects execute error: " . $stmt->error);
    }
    $stmt->close();
} else {
    $response['message'] = "خطا در آماده سازی دستور: " . $mysqli->error;
    error_log("Get_projects prepare error: " . $mysqli->error);
}

$mysqli->close();
echo json_encode($response);
?>
