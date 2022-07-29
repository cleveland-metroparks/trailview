<?php

/*
Accepts POST request with
{
    'ID': int
}
*/

// Disable error reporting
error_reporting(0);

// Start session
session_start();

// Require login
if (!isset($_SESSION['loggedin'])) {
    header('Location: index.html');
    exit;
}

// Include database info
include("../config.php");

$conn = sqlsrv_connect($server, $connectionInfo);

$queryTemplate = "DELETE FROM TrailInfo WHERE ID = ?";

$Id = $_POST['ID'];

if ($Id == null) {
    exit;
}

$params = array(&$Id);

$query = sqlsrv_prepare($conn, $queryTemplate, $params);

sqlsrv_execute($query);

sqlsrv_free_stmt($query);

?>