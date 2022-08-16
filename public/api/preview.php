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
    echo json_encode([
        'error' => 'no_id',
        'detail' => 'No image id specified',
        'status' => '400'
    ]);
    http_response_code(400);
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
    echo json_encode([
        'error' => 'no_preview',
        'detail' => 'No image preview found',
        'status' => '400'
    ]);
    http_response_code(400);
    exit;
} else {
    echo json_encode([
        'status' => '200',
        'preview' => $row['ShtHash']
    ]);
}

?>