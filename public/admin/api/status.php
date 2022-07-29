<?php
	
/*
Returns JSON of trail statuses and if trail is flipped
*/

// Disable error reporting
error_reporting(0);

// config.php is only local and includes sensitive database information
include("config.php");
			
// Create SQL connection
$conn = sqlsrv_connect($server, $connectionInfo);

// Template for query 
$queryTemplate = "SELECT Name, Status, Flipped FROM Trails";

// Parameters to fill in template for query
$params = array();

// Prepare query
$query = sqlsrv_prepare($conn, $queryTemplate, $params);

sqlsrv_execute($query);

if ($query != null) {
	
	// Put query into a PHP array
	$resultArr = [];
	while ($row = sqlsrv_fetch_array($query, SQLSRV_FETCH_ASSOC)) {
		$resultArr[] = $row;
	}
	
	// echo the json output of the result
	header('Content-Type: application/json; charset=utf-8');
	echo json_encode(["Status" => $resultArr]);
}

// Free resources
sqlsrv_free_stmt($query);
?>
