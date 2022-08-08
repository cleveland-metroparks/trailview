<?php

/*
Accepts GET request with
{
    'id': string
}
Returns shtHash for image 
*/

// Disable error reporting
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');

if ($_GET['id'] == null) {
    http_response_code(400);
    echo json_encode(['error' => 'No image id specified']);
    exit;
}

include('config.php');

$id = $_GET['id'];

// Create SQL connection
$conn = sqlsrv_connect($server, $connectionInfo);

// Template for query 

$queryTemplate = "SELECT Id, ShtHash FROM Images WHERE Id = ?";

$params = [&$id];

// Prepare query
$query = sqlsrv_prepare($conn, $queryTemplate, $params);

sqlsrv_execute($query);


$row = sqlsrv_fetch_array($query, SQLSRV_FETCH_ASSOC);
if ($row['ShtHash'] == null) {
    http_response_code(400);
    echo json_encode(['error' => 'Preview not found']);
    exit;
} else {
    echo json_encode([
        'preview' => $row['ShtHash']
    ]);
}

?>