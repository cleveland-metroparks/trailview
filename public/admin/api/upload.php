<?php

/*
Used with Plupload
*/

session_start();

if (!isset($_SESSION['loggedin'])) {
    header('Location: index.html');
    exit;
}

if (empty($_FILES) || $_FILES["file"]["error"]) {
  echo("Error!\n");
  exit;
}

$trail = $_POST['trail_name'];

if ($trail == null) {
    exit;
}

if (!file_exists("E:/trails/" . $trail)) {
    echo "Creating new trail...\n";
    mkdir("E:/trails/" . $trail);
    mkdir("E:/trails/" . $trail . "/img_original");
} else {
    echo "Found existing folder, adding...\n";
}

$fileName = $_FILES["file"]["name"];
move_uploaded_file($_FILES["file"]["tmp_name"], "E:/trails/" . $trail . "/img_original/$fileName");

exit;
?>