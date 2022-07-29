<?php
	
/*
Returns JSON of all reservations
*/

// Disable error reporting
error_reporting(0);

// config.php is only local and includes sensitive database information
include("config.php");

// Create SQL connection
$conn = sqlsrv_connect($server, $connectionInfo);

// Select list of reservations
$sql = "SELECT Name, FriendlyName FROM Reservations";

// Execute the query
$result = sqlsrv_query($conn, $sql);

// Convert query to PHP array
$resultArr = [];
while ($row = sqlsrv_fetch_array($result, SQLSRV_FETCH_ASSOC)) {
	$resultArr[] = $row;
}

// Free resources
sqlsrv_free_stmt($result);

// echo into json format
header('Content-Type: application/json; charset=utf-8');
echo json_encode(["Reservations" => $resultArr]);
?>
