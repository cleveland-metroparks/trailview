<?php

/*
Accepts GET request with
{
    'name': string
}
Accepts POST request with
{
    'pass': string?, (password), needed if not logged in
    'name': string,
}
*/

// Disable error reporting
error_reporting(0);

// Start session
session_start();

// config.php is only local and includes sensitive database information
include('config.php');

// Set output to be JSON type
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $vars = json_decode(file_get_contents('php://input'), true);

    // Require login
    if (!isset($_SESSION['loggedin']) && $vars['pass'] !== $api_pass) {
        echo json_encode(['error' => 'Unauthorized']);
        http_response_code(403);
        exit;
    }

    if ($vars['name'] == null) {
        http_response_code(400);
        echo json_encode(['error' => 'Required parameters not specified']);
        exit;
    }

    $queryTemplate = "UPDATE Trails SET ToDelete = 1 WHERE Name = ?";

    // Create SQL connection
    $conn = sqlsrv_connect($server, $connectionInfo);

    $params = array(&$vars['name']);

    // Prepare query
    $query = sqlsrv_prepare($conn, $queryTemplate, $params);

    sqlsrv_execute($query);

    echo json_encode('success');
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    if ($_REQUEST['name'] == null) {
        http_response_code(400);
        echo json_encode(['error' => 'Required parameters not specified']);
        exit;
    }

    $queryTemplate = "SELECT ToDelete From Trails WHERE Name = ?";

    // Create SQL connection
    $conn = sqlsrv_connect($server, $connectionInfo);

    $params = array(&$_REQUEST['name']);

    // Prepare query
    $query = sqlsrv_prepare($conn, $queryTemplate, $params);

    sqlsrv_execute($query);

    $row = sqlsrv_fetch_array($query, SQLSRV_FETCH_ASSOC);

    echo json_encode(["markDelete" => $row['ToDelete']]);
}

?>