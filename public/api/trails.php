<?php
	
/*
Returns all trails in reservation specified
*/

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Authorization");

// Disable error reporting
error_reporting(0);

// config.php is only local and includes sensitive database information
include("config.php");
			
// Create SQL connection
$conn = sqlsrv_connect($server, $connectionInfo);


// Template for query 
$queryTemplate = "SELECT Name From Trails";

// Prepare query
$query = sqlsrv_prepare($conn, $queryTemplate, []);

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
