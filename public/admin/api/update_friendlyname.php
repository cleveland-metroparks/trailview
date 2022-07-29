<?php

/*
Accepts POST request with
{
    'name': string,
    'friendly': string,
}
*/

// Disable error reporting
error_reporting(0);

session_start();

if (!isset($_SESSION['loggedin'])) {
    header('Location: index.html');
    exit;
}

include("config.php");

	
$Name = $_POST['name'];
$Friendly = $_POST['friendly'];

if ($Name == null || $Friendly == null) {
    exit;
}

$conn = sqlsrv_connect($server, $connectionInfo);

// Template for query 
$queryTemplate1 = "UPDATE Trails SET FriendlyName = ? WHERE Name = ?";

// Parameters to fill in template for query
$params1 = array(&$Friendly, &$Name);

// Prepare query
$query1 = sqlsrv_prepare($conn, $queryTemplate1, $params1);

sqlsrv_execute($query1);

sqlsrv_free_stmt($query1);

?>