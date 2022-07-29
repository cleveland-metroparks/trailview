<?php

/*
Accepts POST request with
{
    'pass': string (optional),
    'name': string,
    'status': string,
}
*/

// Disable error reporting
error_reporting(0);

// Start session
session_start();

// Include database info
include("config.php");

$pass = $_POST['pass'];
$Name = $_POST['name'];
$Status = $_POST['status'];

// Accept password or login as authentication
if ($pass != '2Vnhn7XjekbR55uSGhtUr7mJSqRrGcRA' && !isset($_SESSION['loggedin'])) {
    exit;
}

if ($Name == null || $Status == null) {
    exit;
}

$conn = sqlsrv_connect($server, $connectionInfo);

// Template for query 
$queryTemplate1 = "UPDATE Trails SET Status = ? WHERE Name = ?";

// Parameters to fill in template for query
$params1 = array(&$Status, &$Name);

// Prepare query
$query1 = sqlsrv_prepare($conn, $queryTemplate1, $params1);

sqlsrv_execute($query1);

sqlsrv_free_stmt($query1);

?>