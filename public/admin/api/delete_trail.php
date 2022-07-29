<?php

/*
Accepts POST request with
{
    'name': string,
}
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
include("../config.php");


$Name = $_POST['name'];

if ($Name == null) {
    exit;
}

$conn = sqlsrv_connect($server, $connectionInfo);

// Template for query 
$queryTemplate1 = "SELECT Name, Status FROM Trails";
	
// Parameters to fill in template for query
$params1 = array();

// Prepare query
$query1 = sqlsrv_prepare($conn, $queryTemplate1, $params1);

sqlsrv_execute($query1);

if ($query1 != null) {
    
    while ($row = sqlsrv_fetch_array($query1, SQLSRV_FETCH_ASSOC)) {
        // Only delete under certain statuses
        if ($row['Name'] == $Name) {
            if ($row['Status'] != 'Done' && $row['Status'] != 'Upload') {
                exit;
            }
        }
    }
}

$queryTemplate = "DELETE FROM Trails WHERE Name = ?";

$params = array(&$Name);

$query = sqlsrv_prepare($conn, $queryTemplate, $params);

sqlsrv_execute($query);

sqlsrv_free_stmt($query);

function generateRandomString($length = 20) {
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $charactersLength = strlen($characters);
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[rand(0, $charactersLength - 1)];
    }
    return $randomString;
}

// Use random name to ensure no duplicates
if (file_exists("E:/trails/" . $Name)) {
    // Doesn't actually delete, just moves to a difference directory in case of accidental deletion
    rename("E:/trails/" . $Name, "E:/deleted_trails/" . $Name . '.' . generateRandomString());
}

?>