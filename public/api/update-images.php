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
    sequenceName, latitude, longitude, bearing, flipped, pitchCorrection, visibility
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
    echo json_encode([
        'error' => 'unauthorized',
        'detail' => 'Insufficient credentials from either API key or session info',
        'status' => '403'
    ]);
    http_response_code(403);
    exit;
}

if (
    ($vars['id'] == null && $vars['sequenceName'] == null) ||
    $vars['key'] == null ||
    $vars['value'] === null
) {
    echo json_encode([
        'error' => 'no_id_or_sequenceName_or_key_or_value',
        'detail' => 'Required parameters not specified',
        'status' => '400'
    ]);
    http_response_code(400);
    exit;
}
if ($vars['id'] != null && $vars['sequenceName'] != null) {
    echo json_encode([
        'error' => 'badRequest',
        'detail' => 'Either image id or sequenceName can be accepted, not both',
        'status' => '400'
    ]);
    http_response_code(400);
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
            echo json_encode([
                'error' => 'badRequest',
                'detail' => 'Cannot change latitude for entire sequence',
                'status' => '400'
            ]);
            http_response_code(400);
            exit;
        } else {
            $queryTemplate = "UPDATE Images SET Latitude = ? WHERE Id = ?";
        }
        break;
    case 'longitude':
        if ($sequenceMode) {
            http_response_code(400);
            echo json_encode([
                'error' => 'badRequest',
                'detail' => 'Cannot change longitude for entire sequence',
                'status' => '400'
            ]);
            exit;
        } else {
            $queryTemplate = "UPDATE Images SET Longitude = ? WHERE Id = ?";
        }
        break;
    case 'bearing':
        if ($sequenceMode) {
            echo json_encode([
                'error' => 'badRequest',
                'detail' => 'Cannot change bearing for entire sequence',
                'status' => '400'
            ]);
            http_response_code(400);
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
    case 'visibility':
        if ($sequenceMode) {
            $queryTemplate = "UPDATE Images SET Visibility = ? WHERE SequenceName = ?";
        } else {
            $queryTemplate = "UPDATE Images SET Visibility = ? WHERE Id = ?";
        }
        break;
    default:
        echo json_encode([
            'error' => 'invalid_key',
            'detail' => 'The  provided key is invalid',
            'status' => '400'
        ]);
        http_response_code(400);
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

echo json_encode([
    'status' => '200'
]);


?>