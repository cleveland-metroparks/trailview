<?php
	
/*
Accepts GET request and will return list of all sequences

Accepts POST request with
{
	'pass': string?, (only if not logged in)
    'name': string,
}
*/

// Disable error reporting
error_reporting(0);

// config.php is only local and includes sensitive database information
include('config.php');

// Set output to be JSON type
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
	
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
		echo json_encode([
			'status' => '200',
			'trails' => $resultArr
		]);
	}

	// Free resources
	sqlsrv_free_stmt($query);

} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {

	$vars = json_decode(file_get_contents('php://input'), true);

	// Require login
	session_start();
	if (!isset($_SESSION['loggedin']) && $vars['pass'] !== $api_pass) {
		echo json_encode([
			'error' => 'unauthorized',
			'detail' => 'Insufficient credentials from either API key or session info',
			'status' => '403'
		]);
		http_response_code(403);
		exit;
	}

	$Name = $vars['name'];

	if ($Name == null) {
		echo json_encode([
			'error' => 'no_name',
			'detail' => 'Sequence name not provided',
			'status' => '400'
		]);
		http_response_code(400);
		exit;
	}
				
	$conn = sqlsrv_connect($server, $connectionInfo);
	
	// Template for query 
	$queryTemplate1 = "SELECT Name FROM Trails WHERE Name = ?";
	
	// Parameters to fill in template for query
	$params1 = array(&$Name);
	
	// Prepare query
	$query1 = sqlsrv_prepare($conn, $queryTemplate1, $params1);
	
	sqlsrv_execute($query1);
	
	$resultArr = [];
	if ($query1 != null) {
		while ($row = sqlsrv_fetch_array($query1, SQLSRV_FETCH_ASSOC)) {
			$resultArr[] = $row;
		}
	}
	
	if (count($resultArr) != 0) {
		echo json_encode([
			'error' => 'exists',
			'detail' => 'Sequence Name already exists in DB',
			'status' => '400'
		]);
		http_response_code(400);
		exit;
	}
	
	$queryTemplate = "INSERT INTO Trails (Name, Status) VALUES
					  (?, ?)";
	
	$SequenceName = $vars['name'];
	$Status = 'Upload';
	
	$params = array(&$Name, &$Status);
	
	$query = sqlsrv_prepare($conn, $queryTemplate, $params);
	
	sqlsrv_execute($query);
	
	sqlsrv_free_stmt($query);

	echo json_encode(['status' => '200']);
}
