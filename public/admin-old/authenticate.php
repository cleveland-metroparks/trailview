<?php

error_reporting(0);

include("config.php");

session_start();

$conn = sqlsrv_connect($server, $connectionInfo);

if (!isset($_POST['username'], $_POST['password'])) {
    exit('Please fill out both username and password fields!');
}

$queryTemplate = "SELECT ID, Password FROM AdminAccounts WHERE Username = ?";

// Parameters to fill in template for query
$params = array(&$_POST['username']);

// Prepare query
$query = sqlsrv_prepare($conn, $queryTemplate, $params);

sqlsrv_execute($query);

if ($query != null) {
    $row = sqlsrv_fetch_array($query, SQLSRV_FETCH_ASSOC);
    if (password_verify($_POST['password'], $row['Password'])) {
        session_regenerate_id();
        $_SESSION['loggedin'] = TRUE;
        $_SESSION['name'] = $_POST['username'];
        $_SESSION['id'] = $row['ID'];
        header('Location: home.php');
    } else {
        header('Location: index.php?error=invalid');
    }
} else {
    header('Location: index.php?error=invalid');
}

?>