<?php

/*
Accepts GET request with
{
    'type': string, ('standard', 'all')
    'id': string?
}
Returns data from images db
    'standard' returns 
        id, sequenceName, latitude, longitude, bearing, flipped, pitchCorrection
    'all' returns 
        id, sequenceName, originalName, originalLatitude, originalLongitude, latitude, longitude, bearing, flipped, shtHash, pitchCorrection, visibility

--------

Accepts POST request with
{
    'pass': string, (password)
    'id': string,
    'sequenceName': string,
    'originalLatitude': float,
    'originalLongitude': float,
    'latitude': float,
    'longitude': float,
    'bearing': float,
    'flipped': int, (0 for false, 1 for true)
    'shtHash': string,
    'originalName': string,
}
Adds new Image entry. Requires pass and Id
*/

// Disable error reporting
error_reporting(0);

// config.php is only local and includes sensitive database information
include('config.php');

// Set output to be JSON type
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $type = $_REQUEST['type'];
    if ($type === 'standard') {
        // Create SQL connection
        $conn = sqlsrv_connect($server, $connectionInfo);

        $query;
        if ($_REQUEST['id'] == null) {
            $queryTemplate = "SELECT Id, SequenceName, Latitude, Longitude, Bearing, Flipped, PitchCorrection, Visibility FROM Images WHERE Visibility = 1";
            $query = sqlsrv_prepare($conn, $queryTemplate, []);
        } else {
            $queryTemplate = "SELECT Id, SequenceName, Latitude, Longitude, Bearing, Flipped, PitchCorrection FROM Images WHERE Id = ? AND Visibility = 1";
            $query = sqlsrv_prepare($conn, $queryTemplate, [&$_REQUEST['id']]);
        }

        sqlsrv_execute($query);

        // Convert query to PHP array
        $resultArr = [];
        while ($row = sqlsrv_fetch_array($query, SQLSRV_FETCH_ASSOC)) {
            $resultArr[] = [
                'id' => $row['Id'],
                'sequenceName' => $row['SequenceName'],
                'latitude' => $row['Latitude'],
                'longitude' => $row['Longitude'],
                'bearing' => $row['Bearing'],
                'flipped' => $row['Flipped'] == 0 ? false : true,
                'pitchCorrection' => $row['PitchCorrection']
            ];
        }
        echo json_encode([
            'status' => '200',
            'imagesStandard' => $resultArr
        ]);

    } else if ($type === 'all') {
        // Create SQL connection
        $conn = sqlsrv_connect($server, $connectionInfo);

        // Template for query 
        $queryTemplate = "SELECT Id, SequenceName, OriginalName, OriginalLatitude, OriginalLongitude, Latitude, Longitude, Bearing, Flipped, ShtHash, PitchCorrection, Visibility FROM Images";

        // Prepare query
        $query = sqlsrv_prepare($conn, $queryTemplate, []);

        sqlsrv_execute($query);

        // Convert query to PHP array
        $resultArr = [];
        while ($row = sqlsrv_fetch_array($query, SQLSRV_FETCH_ASSOC)) {
            $resultArr[] = [
                'id' => $row['Id'],
                'sequenceName' => $row['SequenceName'],
                'originalName' => $row['OriginalName'],
                'originalLatitude' => $row['OriginalLatitude'],
                'originalLongitude' => $row['OriginalLongitude'],
                'latitude' => $row['Latitude'],
                'longitude' => $row['Longitude'],
                'bearing' => $row['Bearing'],
                'flipped' => $row['Flipped'] == 0 ? false : true,
                'shtHash' => $row['ShtHash'],
                'pitchCorrection' => $row['PitchCorrection'],
                'visibility' => $row['Visibility'] == 0 ? false : true
            ];
        }
        echo json_encode([
            'status' => '200',
            'imagesAll' => $resultArr
        ]);
    } else {
        echo json_encode([
            'error' => 'badRequest',
            'detail' => 'Unknown GET request type (options are standard and all)',
            'status' => '400'
        ]);
        http_response_code(400);
        exit;
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // $vars = json_decode(file_get_contents('php://input'), true);
    $vars = $_REQUEST;
    if ($vars['pass'] == null || $vars['id'] == null) {
        echo json_encode([
            'error' => 'no_pass_or_id',
            'detail' => 'API key or id is not specified',
            'status' => '400'
        ]);
        http_response_code(400);
        exit;
    } else if ($vars['pass'] !== $api_pass) {
        echo json_encode([
            'error' => 'unauthorized',
            'detail' => 'Insufficient credentials from API key',
            'status' => '403'
        ]);
        http_response_code(403);
        exit;
    } else {
        // Create SQL connection
        $conn = sqlsrv_connect($server, $connectionInfo);

        // Template for query 
        $queryTemplate = "INSERT INTO Images (Id, SequenceName, OriginalLatitude, OriginalLongitude, Latitude, Longitude, Bearing, Flipped, ShtHash, OriginalName)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $params = array(
            &$vars['id'],
            &$vars['sequenceName'],
            &$vars['originalLatitude'],
            &$vars['originalLongitude'],
            &$vars['latitude'],
            &$vars['longitude'],
            &$vars['bearing'],
            &$vars['flipped'],
            &$vars['shtHash'],
            &$vars['originalName'],
        );

        // Prepare query
        $query = sqlsrv_prepare($conn, $queryTemplate, $params);

        sqlsrv_execute($query);

        if (sqlsrv_rows_affected($query) == false) {
            echo json_encode([
                'error' => 'notEffected',
                'detail' => 'No data was updated, maybe duplicates',
                'status' => '400'
            ]);
            http_response_code(400);
            exit;
        } else {
            echo json_encode([
                'status' => '200'
            ]);
        }
    }
}

?>


