<?php

/*
Accepts POST request with
{
    'ImageID': string,
    'Pitch': float,
    'Yaw': float,
    'HoverText': string,
    'TargetPitch': float,
    'TargetYaw': float,
    TargetHFOV': float,
    'CSSClass': string,
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

$conn = sqlsrv_connect($server, $connectionInfo);

$queryTemplate = "INSERT INTO TrailInfo (ImageID, Pitch, Yaw, HoverText, TargetPitch, TargetYaw, TargetHFOV, CSSClass) VALUES
                  (?, ?, ?, ?, ?, ?, ?, ?)";

$ImageID = $_POST['ImageID'];
$Pitch = $_POST['Pitch'];
$Yaw = $_POST['Yaw'];
$HoverText = $_POST['HoverText'];
$TargetPitch = $_POST['TargetPitch'];
$TargetYaw = $_POST['TargetYaw'];
$TargetHFOV = $_POST['TargetHFOV'];
$CSSClass = $_POST['CSSClass'];

$params = array(&$ImageID, &$Pitch, &$Yaw, &$HoverText, &$TargetPitch, &$TargetYaw, &$TargetHFOV, &$CSSClass);

$query = sqlsrv_prepare($conn, $queryTemplate, $params);

sqlsrv_execute($query);

sqlsrv_free_stmt($query);

?>