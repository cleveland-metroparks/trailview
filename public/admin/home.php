<?php

session_start();

if (!isset($_SESSION['loggedin'])) {
    header('Location: index.html');
    exit;
}
?>

<html>
<head>
    <title>Admin Home</title>
    <meta name="color-scheme" content="light dark">
    <link rel="stylesheet" href="/css/main.css">
    <link rel="stylesheet" href="/css/main-desktop.css">
    <link rel="stylesheet" href="/dist/pannellum-metroparks/build/pannellum.css"/>
	<link rel="stylesheet" href="/css/viewer.css"/>
    <link rel="stylesheet" href="/css/viewer-desktop.css"/>
    <link rel="stylesheet" href="/css/map.css"/>
    <link rel="stylesheet" href="/css/map-desktop.css"/>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-dark-5@1.1.3/dist/css/bootstrap-nightshade.min.css" rel="stylesheet">
    <!-- <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous"> -->
    <script type="text/javascript" src="/dist/pannellum-metroparks/build/pannellum.js"></script>
    <link href="https://api.mapbox.com/mapbox-gl-js/v2.8.2/mapbox-gl.css" rel="stylesheet">
    <script src="https://api.mapbox.com/mapbox-gl-js/v2.8.2/mapbox-gl.js"></script> 
    <script type="text/javascript" src="/config/mapbox-key.js"></script>
    <script src="/dist/cheap-ruler.min.js"></script>
</head>

<style>
#viewer-container {
    width: 100%;
    height: 600px;
    position: relative;
}
#panorama {
    width: 100%;
    height: 100%;

    position: absolute;
    top: 0;
    left: 0;
}
#map {
    width: 100%;
    height: 600px;
    position: relative;
    z-index: 5;
    top: 600px;
}
/* .marker {
    height: 10px;
    width: 10px;
    background-color: #069401;
    border-radius: 50%;
    display: inline-block;
    transition: 0.15s background-color;
    transition: width 0.15s, height 0.15s;
}

.marker:hover {
    height: 18px;
    width: 18px;
    z-index: 9;
    background-color: #09d102;
    cursor: pointer;
} */

/* .marker_current {
    height: 14px;
    width: 14px;
    background-color: rgb(4, 118, 194);
    border-radius: 50%;
    display: inline-block;
    transition: 0.15s background-color;
    transition: width 0.15s, height 0.15s;
    z-index: 10;
    box-shadow: 0px 0px 0px 7px rgba(67, 177, 250, 0.5);
} */
#nav_arrows_container {
    position: absolute;
    margin: 0;
    width: 35%;
    height: 45%;
    left: 50%;
    bottom: 10%;
    /* transform-style: preserve-3d;
    transform: translateX(-50%); */
    transform: translateX(-50%);
    /* perspective: 100vw; */
}
.inside {
    position: absolute;
    width: 100%;
    height: 100%;

    background-color: gray;
    display: block;
    /* transform: rotateX(50deg); */
}
.nav_arrow_new {
    position: absolute;
    top: 50%;
    left: 50%;
    /* transform-origin: center center; */
    /* transform: translate(6.816859983453708% 7.316448589718068%); */
}

</style>


<script src="https://code.jquery.com/jquery-3.6.0.min.js" integrity="sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=" crossorigin="anonymous"></script>
    <body style="margin: 0; padding: 0; background-color: rgb(255, 255, 255);">
        <div class="row mt-5 mx-3">
            <div class="col-xs-12 col-md-8 my-3">
                <div id="viewer-container">
                    <div id="panorama" style="margin: 0; padding: 0; width: 100%; height: 600px; background-color: D6D6D6;">
                    </div>
                    <div id="nav_container" class="nav_container-full">
                        <a><img class="new_nav" src="/assets/images/ui/arrow_new_small_white.png" draggable="false"></a>
                    </div>
                    <div id="map"></div>
                </div>
                
            </div>
            <div class="col-xs-12 col-md-4 my-3">
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="dark_switch">
                    <label class="form-check-label" for="dark_switch">Dark Mode</label>
                </div>

                <label for="sequence_select">Sequence</label>
                <select id="sequence_select" class="form-select mb-2">
                    <option disabled selected value>Select a Sequence</option>
                </select>

                <label for="image-id">Image Id</label>
                <input id="image-id" class="form-control mb-4" disabled>

                <h5>Sequence Options</h5>

                <div class="mt-2 form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="visibility_switch">
                    <label class="form-check-label" for="visibility_switch">Publicly Visible</label>
                </div>

                <div class="mt-2 form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="flip_switch">
                    <label class="form-check-label" for="flip_switch">Flip sequence 180&#176;</label>
                </div>

                <label id="pitch_label" for="pitch_range" class="mt-3 form-label">Sequence Pitch Correction: 0.0</label>
                <input type="range" class="form-range" min="-90" max="90" step="0.5" id="pitch_range">
                <div class="col">
                    <button id="pitch_preview_btn" type="button" class="btn btn-primary mt-2">View side (best angle)</button>
                    <button id="pitch_set_btn" type="button" class="btn btn-primary mt-2">Set</button>
                </div>
                

                <br>
                <div style="display: none;">
                    <label class="mt-4" for="text_input">Hover Text (Supports HTML formatting)</label>
                    <textarea class="form-control" id="text_input" rows="4"></textarea>

                    <button id="add_info" type="button" class="btn btn-primary mt-2">Add</button>
                    <div class="mt-1 form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="click_delete_switch">
                        <label class="form-check-label" for="click_delete_switch">Click to Delete Info</label>
                    </div>
                </div>
                
                <br>

                <div class="col mt-2">
                    <div id="zipping_alert" class="alert alert-warning" style="display: none;">
                        <div class="spinner-border spinner-border-sm" role="status"></div>
                        <span id="zipping_text"></span>
                    </div>
                    <div id="download_complete_alert" class="alert alert-success" style="display: none">Download complete!</div>
                </div>

                <div class="mt-2">
                    <button id="download_btn" type="button" class="btn btn-success">Download Sequence Images</button>
                    <button id="delete_button" type="button" class="btn btn-danger">Delete Trail</button>
                </div>
                <div class="mt-2">
                    <a href="/admin/import_trail.php"><button type="button" class="btn btn-info">Import New Trail</button></a>
                    <a href="/admin/logout.php"><button type="button" class="btn btn-secondary">Logout</button></a>
                </div>
                <br>
                <div id='processing_status' class="alert alert-warning" role="alert" hidden>
                    <strong>Status:</strong> This trail is still being processed, preview may be unavailable!<br>NOTE: Trail may not be deleted until processing is done!
                </div>
            </div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM" crossorigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap-dark-5@1.1.3/dist/js/darkmode.min.js"></script>
        <script type="text/javascript" src="/js/trailviewer.js"></script>
        <script type="text/javascript" src="/admin/js/admin.js"></script>
    </body>
</html>



