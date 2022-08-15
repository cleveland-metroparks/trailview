<?php

session_start();

if (!isset($_SESSION['loggedin'])) {
    header('Location: index.html');
    exit;
}
?>

<html>

<head>
    <meta name="color-scheme" content="light dark">
    <link rel="stylesheet" href="/css/main.css">
    <link rel="stylesheet" href="/dist/pannellum/pannellum.css" />
    <link rel="stylesheet" href="/css/viewer.css" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-dark-5@1.1.3/dist/css/bootstrap-nightshade.min.css" rel="stylesheet">
    <!-- <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous"> -->
    <script type="text/javascript" src="/dist/pannellum/pannellum.js"></script>
    <link href="https://api.mapbox.com/mapbox-gl-js/v2.8.2/mapbox-gl.css" rel="stylesheet">
    <script src="https://api.mapbox.com/mapbox-gl-js/v2.8.2/mapbox-gl.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js" integrity="sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=" crossorigin="anonymous"></script>
</head>
<style>

</style>
<html>

<body>
    <div class="col-xs-12 col-md-6 offset-md-3">
        <h1>Import New Trail</h1>
        <p>Refresh page if any errors occur!<br>Refresh page if you select the wrong files!</p>
        <label for="upload_files">Select images</label>
        <a id="browse" href="javascript:;">[Browse...]</a><br>

        <label class="mt-2" for="name_input">Trail Name (CamelCase only)</label>
        <input class="form-control" id="name_input" pattern="[a-zA-Z0-9]{0,50}">

        <div class="mt-3">
            <button id="submit_button" type="submit" class="btn btn-primary">Submit</button>
            <a href="/admin/home.php"><button type="button" class="btn btn-info">Back Home</button></a>
        </div>


    </div>

    <div class="row">
        <div class="col">
            <ul id="filelist"></ul>
        </div>
        <div class="col">
            <pre id="console"></pre>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap-dark-5@1.1.3/dist/js/darkmode.min.js"></script>
    <script src="/dist/plupload/plupload.full.min.js"></script>
    <script src="/admin/js/import.js"></script>
</body>

</html>