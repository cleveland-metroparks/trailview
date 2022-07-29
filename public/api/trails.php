<?php
	
/*
Accepts GET request with
{
	'reservation': string,
}
Returns all trails in reservation specified
*/

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Authorization");

// Disable error reporting
error_reporting(0);

// GET request specifies which reservation to select trails from
$reservation = $_GET["reservation"];

// config.php is only local and includes sensitive database information
include("config.php");
			
// Create SQL connection
$conn = sqlsrv_connect($server, $connectionInfo);

$query;
if ($reservation != null) {
	// Template for query 
	$queryTemplate = "SELECT Name, FriendlyName, Reservation, ImageURL, InitImageID, SequenceName FROM Trails WHERE Reservation = ?";

	// Parameters to fill in template for query
	$params = array(&$reservation);

	// Prepare query
	$query = sqlsrv_prepare($conn, $queryTemplate, $params);
} else {
	// Template for query 
	$queryTemplate = "SELECT Name, FriendlyName, Reservation, ImageURL, InitImageID, SequenceName FROM Trails";

	// Prepare query
	$query = sqlsrv_prepare($conn, $queryTemplate, []);
}

sqlsrv_execute($query);

if ($query != null) {
	
	// Put query into a PHP array
	$resultArr = [];
	while ($row = sqlsrv_fetch_array($query, SQLSRV_FETCH_ASSOC)) {
		$resultArr[] = $row;
	}
	
	// echo the json output of the result
	header('Content-Type: application/json; charset=utf-8');
	echo json_encode(["Trails" => $resultArr]);
}

// Free resources
sqlsrv_free_stmt($query);
?>
