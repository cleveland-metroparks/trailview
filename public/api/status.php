<?php
	
/*
Returns JSON of trail statuses

Accepts POST request with
{
    'pass': string (optional),
    'name': string,
    'status': string,
}

*/

// Disable error reporting
error_reporting(0);

// config.php is only local and includes sensitive database information
include("config.php");

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {

	// Create SQL connection
	$conn = sqlsrv_connect($server, $connectionInfo);

	// Template for query 
	$queryTemplate = "SELECT Name, Status, ToDelete FROM Trails";

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
		echo json_encode([
			'status' => '200',
			"sequenceStatus" => $resultArr
		]);
	}

	// Free resources
	sqlsrv_free_stmt($query);

} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {

	session_start();

	$vars = json_decode(file_get_contents('php://input'), true);

	$pass = $vars['pass'];
	$Name = $vars['name'];
	$Status = $vars['status'];
	
	// Accept password or login as authentication
	if ($pass != $api_pass && !isset($_SESSION['loggedin'])) {
		echo json_encode([
			'error' => 'unauthorized',
			'detail' => 'Insufficient credentials from either API key or session info',
			'status' => '403'
		]);
		http_response_code(403);
		exit;
	}
	
	if ($Name == null || $Status == null) {
		echo json_encode([
			'error' => 'badRequest',
			'detail' => 'Name or status not specified',
			'status' => '403'
		]);
		http_response_code(400);
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

	echo json_encode([
		'status' => '200'
	]);
}
?>
