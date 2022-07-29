<?php

/*
Accepts POST request with
{
    'name': string,
    'flipped': int (0 or 1 bool),
}
*/

// Disable error reporting
error_reporting(0);

session_start();

include("../config.php");

$Name = $_POST['name'];
$Flipped = $_POST['flipped'];

if (!isset($_SESSION['loggedin'])) {
    exit;
}

if ($Name == null || $Flipped == null) {
    exit;
}

$conn = sqlsrv_connect($server, $connectionInfo);

// Template for query 
$queryTemplate1 = "UPDATE Trails SET Flipped = ? WHERE Name = ?";

// Parameters to fill in template for query
$params1 = array(&$Flipped, &$Name);

// Prepare query
$query1 = sqlsrv_prepare($conn, $queryTemplate1, $params1);

sqlsrv_execute($query1);

sqlsrv_free_stmt($query1);

?>