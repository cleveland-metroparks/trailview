<?php
	
/*
Accepts GET request with
{
	'id': string
}
Returns all info hotspots for image requested
*/

// Disable error reporting
error_reporting(0);

// GET which image to request
$id = $_GET["id"];

// config.php is only local and includes sensitive database information
include("config.php");
			
// Create SQL connection
$conn = sqlsrv_connect($server, $connectionInfo);

// Template for query 
$queryTemplate = "SELECT ID, ImageID, Pitch, Yaw, HoverText, TargetPitch, TargetYaw, TargetHFOV, CSSClass FROM TrailInfo WHERE ImageID = ?";

// Parameters to fill in template for query
$params = array(&$id);

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
	echo json_encode(["ImgInfo" => $resultArr]);
}

// Free resources
sqlsrv_free_stmt($query);
?>
