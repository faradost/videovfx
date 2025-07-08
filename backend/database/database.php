<?php
// Database configuration
define('DB_SERVER', 'localhost'); // or your database server IP/hostname
define('DB_USERNAME', 'root');    // your database username
define('DB_PASSWORD', '');        // your database password
define('DB_NAME', 'freelance_platform'); // your database name

// Attempt to connect to MySQL database
$mysqli = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

// Check connection
if ($mysqli === false || $mysqli->connect_error) {
    // Log the error to a file or error tracking system instead of echoing directly in production
    error_log("ERROR: Could not connect. " . $mysqli->connect_error);
    // For development, you might want to see the error:
    die("ERROR: Could not connect. " . $mysqli->connect_error);
}

// Set character set to utf8mb4 for full Unicode support
if (!$mysqli->set_charset("utf8mb4")) {
    error_log("Error loading character set utf8mb4: %s\n" . $mysqli->error);
    // For development:
    // printf("Error loading character set utf8mb4: %s\n", $mysqli->error);
}

// Function to close the database connection (optional, as PHP usually closes it at script end)
function close_db_connection($mysqli_conn) {
    if ($mysqli_conn) {
        $mysqli_conn->close();
    }
}

// You might want to include this file in your PHP scripts that need database access.
// Example: require_once 'database.php';
// And then use the $mysqli object for your queries.

// It's a good practice to handle potential SQL injection vulnerabilities by using prepared statements.
// Example of a prepared statement:
/*
$sql = "SELECT user_id FROM users WHERE username = ?";
if ($stmt = $mysqli->prepare($sql)) {
    $stmt->bind_param("s", $param_username);
    $param_username = 'some_username';
    if ($stmt->execute()) {
        $stmt->store_result();
        if ($stmt->num_rows == 1) {
            $stmt->bind_result($user_id);
            if ($stmt->fetch()) {
                // User found
            }
        } else {
            // No user found
        }
    } else {
        echo "Oops! Something went wrong. Please try again later.";
    }
    $stmt->close();
}
*/

// The $mysqli object is now available for use in other PHP scripts that include this file.
?>
