<?php

/*
Accepts POST request with
{
    'pass': string?, (password), needed if not logged in
    'id': string?,
    'sequenceName': string?,
    'key': string,
    'value': any,
}
Updates data for images in the db
Requires either id for a single image or sequenceName for all images in a sequence
Valid keys for single image are
    sequenceName, latitude, longitude, bearing, flipped
Valid keys for sequence are
    sequenceName, flipped
*/

// Disable error reporting
error_reporting(0);

// Start session
session_start();

// config.php is only local and includes sensitive database information
include('config.php');

// Set output to be JSON type
header('Content-Type: application/json; charset=utf-8');

$vars = json_decode(file_get_contents('php://input'), true);

// Require login
if (!isset($_SESSION['loggedin']) && $vars['pass'] !== $api_pass) {
    echo json_encode(['error' => 'Unauthorized']);
    http_response_code(403);
    exit;
}

if (
    ($vars['id'] == null && $vars['sequenceName'] == null) ||
    $vars['key'] == null ||
    $vars['value'] === null
) {
    http_response_code(400);
    echo json_encode(['error' => 'Required parameters not specified']);
    exit;
}
if ($vars['id'] != null && $vars['sequenceName'] != null) {
    http_response_code(400);
    echo json_encode(['error' => 'Either image id or sequenceName can be accepted, not both']);
    exit;
}

$sequenceMode = false;
if ($vars['sequenceName'] != null) {
    $sequenceMode = true;
}

$key = $vars['key'];
$queryTemplate;
switch ($key) {
    case 'sequenceName':
        if ($sequenceMode) {
            $queryTemplate = "UPDATE Images SET SequenceName = ? WHERE SequenceName = ?";
        } else {
            $queryTemplate = "UPDATE Images SET SequenceName = ? WHERE Id = ?";
        }
        break;
    case 'latitude':
        if ($sequenceMode) {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot change latitude for entire sequence']);
            exit;
        } else {
            $queryTemplate = "UPDATE Images SET Latitude = ? WHERE Id = ?";
        }
        break;
    case 'longitude':
        if ($sequenceMode) {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot change longitude for entire sequence']);
            exit;
        } else {
            $queryTemplate = "UPDATE Images SET Longitude = ? WHERE Id = ?";
        }
        break;
    case 'bearing':
        if ($sequenceMode) {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot change bearing for entire sequence']);
            exit;
        } else {
            $queryTemplate = "UPDATE Images SET Bearing = ? WHERE Id = ?";
        }
        break;
    case 'flipped':
        if ($sequenceMode) {
            $queryTemplate = "UPDATE Images SET Flipped = ? WHERE SequenceName = ?";
        } else {
            $queryTemplate = "UPDATE Images SET Flipped = ? WHERE Id = ?";
        }
        break;
    case 'pitchCorrection':
        if ($sequenceMode) {
            $queryTemplate = "UPDATE Images SET PitchCorrection = ? WHERE SequenceName = ?";
        } else {
            $queryTemplate = "UPDATE Images SET PitchCorrection = ? WHERE Id = ?";
        }
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid key']);
        exit;
}

// Create SQL connection
$conn = sqlsrv_connect($server, $connectionInfo);

$params;
if ($sequenceMode) {
    $params = array(
        &$vars['value'],
        &$vars['sequenceName']
    );
} else {
    $params = array(
        &$vars['value'],
        &$vars['id']
    );
}

// Prepare query
$query = sqlsrv_prepare($conn, $queryTemplate, $params);

sqlsrv_execute($query);

echo json_encode('success');


?>