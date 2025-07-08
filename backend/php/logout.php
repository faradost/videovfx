<?php
// backend/php/logout.php
require_once '../includes/functions.php'; // Ensures session_start() is called

// Unset all of the session variables
$_SESSION = array();

// If it's desired to kill the session, also delete the session cookie.
// Note: This will destroy the session, and not just the session data!
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Finally, destroy the session.
session_destroy();

// Prepare a JSON response (optional, could just redirect)
$response = ['success' => true, 'message' => 'شما با موفقیت خارج شدید.'];

// Redirect to homepage or login page after logout
// For AJAX calls, the client-side script will handle the redirect based on the JSON response.
// If it's a direct navigation to logout.php, a header redirect is fine.

// If this script is called via AJAX, the redirect should be handled by JavaScript.
// If it's a direct link, uncomment the redirect below.
// header("Location: ../../index.html"); // Adjust path as needed
// exit();

header('Content-Type: application/json');
echo json_encode($response);
exit();
?>
