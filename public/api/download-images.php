<?php

/*
Accepts GET request with
{
    'pass': string?, (password), needed if not logged in
    'name': string
}
*/

function generateRandomString($length = 10) {
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $charactersLength = strlen($characters);
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[rand(0, $charactersLength - 1)];
    }
    return $randomString;
}

// Disable error reporting
error_reporting(0);

// Start session
session_start();

// config.php is only local and includes sensitive database information
include('config.php');

include ('../dist/good-zip-archive.php');

// Set output to be JSON type
header('Content-Type: application/json; charset=utf-8');

// Require login
if (!isset($_SESSION['loggedin']) && $_REQUEST['pass'] !== $api_pass) {
    echo json_encode(['error' => 'Unauthorized']);
    http_response_code(403);
    exit;
}

if ($_REQUEST['name'] == null) {
    echo json_encode(['error' => 'Required parameters not specified']);
    http_response_code(400);
    exit;
}

set_time_limit(0);

$zip_name = $_REQUEST['name'] . '_' . generateRandomString(5) . '_zip';

$zip_file = '../downloads/' . $zip_name . '.zip';

new GoodZipArchive('E:\\trails\\' . $_REQUEST['name'] . '\\img_original', $zip_file);

echo json_encode(['success' => 'https://trailview.cmparks.net/downloads/' . $zip_name . '.zip']);

?>