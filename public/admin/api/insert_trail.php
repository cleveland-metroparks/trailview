<?php

/*
Accepts POST request with
{
    'name': string,
}

echoes 'exists' if trail with the same name already exists
*/

// Disable error reporting
error_reporting(0);

// Start session
session_start();

// Require login
if (!isset($_SESSION['loggedin'])) {
    header('Location: index.html');
    exit;
}

// Include database info
include("config.php");
	
$Name = $_POST['name'];

if ($Name == null) {
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
    echo('exists');
    die();
}


$queryTemplate = "INSERT INTO Trails (Name, Status) VALUES
                  (?, ?)";


$SequenceName = $_POST['name'];
$Status = 'Upload';

$params = array(&$Name, &$Status);

$query = sqlsrv_prepare($conn, $queryTemplate, $params);

sqlsrv_execute($query);

sqlsrv_free_stmt($query);

?>