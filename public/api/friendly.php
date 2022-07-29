<?php
	
/*
Accepts GET request with
{
	'Name': string,
}
Returns friendly name of specified trail
*/

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Authorization");

// Disable error reporting
error_reporting(0);

$name = $_GET["Name"];

// config.php is only local and includes sensitive database information
include("config.php");
			
// Create SQL connection
$conn = sqlsrv_connect($server, $connectionInfo);

// Template for query 
$queryTemplate = "SELECT Name, FriendlyName FROM Trails WHERE Name = ?";

// Parameters to fill in template for query
$params = array(&$name);

// Prepare query
$query = sqlsrv_prepare($conn, $queryTemplate, $params);

sqlsrv_execute($query);

if ($query != null) {

	$row = sqlsrv_fetch_array($query, SQLSRV_FETCH_ASSOC);
	// echo the json output of the result
	header('Content-Type: application/json; charset=utf-8');
	echo json_encode(["Friendly" => $row]);
}

// Free resources
sqlsrv_free_stmt($query);
?>
