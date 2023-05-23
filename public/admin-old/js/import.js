
// Uploader object
var uploader = new plupload.Uploader({
    browse_button: 'browse', // Id of element
    url: '/api/upload.php',
});
var prevNameVal = "";   // Previous name input value (used for validation)
var failed = false; // If upload failed
var uploading = false; // If currently uploading


$('#name_input').on('input', () => {
    if ($('#name_input')[0].checkValidity()) {
        prevNameVal = $('#name_input').val();
    } else {
        $('#name_input').val(prevNameVal)
    }
});

uploader.init();

uploader.bind('FilesAdded', function (up, files) {
    var html = '';
    plupload.each(files, function (file) {
        html += '<li id="' + file.id + '">' + file.name + ' (' + plupload.formatSize(file.size) + ') <b></b></li>';
    });
    document.getElementById('filelist').innerHTML += html;
});

uploader.bind('UploadProgress', function (up, file) {
    document.getElementById(file.id).getElementsByTagName('b')[0].innerHTML = '<span>' + file.percent + "%</span>";
});

uploader.bind('Error', function (up, err) {
    document.getElementById('console').innerHTML += "Error #" + err.code + ": " + err.message;
});

uploader.bind('FileUploaded', function (up, file, result) {
    document.getElementById('console').innerHTML += result.response;
});

uploader.bind('UploadComplete', function (up, files) {
    let data = {
        'name': document.getElementById('name_input').value,
        'status': 'Blur',
    };
    $.ajax({
        type: "POST",
        url: "/api/status.php",
        data: JSON.stringify(data),
        dataType: "application/json"
    });
    document.getElementById('console').innerHTML += "<strong>DONE! You can now close this window!</strong>\n";
    window.onbeforeunload = function () {
        return;
    };
});

$('#submit_button').on('click', () => {
    if (failed == true || uploading == true) {
        return;
    }
    if (uploader.files.length == 0) {
        failed = true;
        document.getElementById('console').innerHTML += "Error: No input files!\n";
        document.getElementById('console').innerHTML += "Refresh page and try again!\n";
        uploader.destroy();
        return;
    }
    document.getElementById('name_input').disabled = true;
    document.getElementById('submit_button').disabled = true;
    let postData = {
        'name': document.getElementById('name_input').value,
    };
    $.ajax({
        type: "POST",
        url: "/api/trails.php",
        data: JSON.stringify(postData),
        dataType: "application/json",
        complete: function (jqXHR, textStatus) {
            let data = JSON.parse(jqXHR.responseText);
            if (data.status != 200) {
                alert('Failed to start upload\n' + data.detail);
                failed = true;
                document.getElementById('console').innerHTML += ("Error: " + data.detail + "\n");
                document.getElementById('console').innerHTML += "Refresh page and try again!\n";
                uploader.destroy();
            } else {
                window.onbeforeunload = function () {
                    return true;
                };
                uploader.setOption('multipart_params', {
                    'trail_name': document.getElementById('name_input').value,
                })
                uploader.start();
                console.log("Starting upload");
                uploading = true;
            } 
        }
    });
});