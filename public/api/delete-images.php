<?php

/*
Accepts POST request with
{
    'pass': string?, (password), needed if not logged in
    'sequenceName': string,
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

$vars = json_decode(file_get_contents('php://input'), true);

// Require login
if (!isset($_SESSION['loggedin']) && $vars['pass'] !== $api_pass) {
    echo json_encode([
        'error' => 'Uuauthorized',
        'detail' => 'Insufficient credentials from either API key or session info',
        'status' => '403'
    ]);
    http_response_code(403);
    exit;
}

if ($vars['sequenceName'] == null) {
    echo json_encode([
        'error' => 'no_sequenceName',
        'detail' => 'Sequence name was not specified',
        'status' => '400'
    ]);
    http_response_code(400);
    exit;
}

$queryTemplate = "DELETE FROM Images WHERE SequenceName = ?";

// Create SQL connection
$conn = sqlsrv_connect($server, $connectionInfo);

$params = array(&$vars['sequenceName']);

// Prepare query
$query = sqlsrv_prepare($conn, $queryTemplate, $params);

sqlsrv_execute($query);

echo json_encode([
    'status' => '200'
]);

?>