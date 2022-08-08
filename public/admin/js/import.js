
let prevVal = "";
document.getElementById('name_input').addEventListener('input', function(e){
  if(this.checkValidity()){
    prevVal = this.value;
  } else {
    this.value = prevVal;
  }
});

var uploader = new plupload.Uploader({
    browse_button: 'browse', // this can be an id of a DOM element or the DOM element itself
    url: '/admin/api/upload.php',
});
   
uploader.init();

uploader.bind('FilesAdded', function(up, files) {
    var html = '';
    plupload.each(files, function(file) {
      html += '<li id="' + file.id + '">' + file.name + ' (' + plupload.formatSize(file.size) + ') <b></b></li>';
    });
    document.getElementById('filelist').innerHTML += html;
  });

  uploader.bind('UploadProgress', function(up, file) {
    document.getElementById(file.id).getElementsByTagName('b')[0].innerHTML = '<span>' + file.percent + "%</span>";
  });

uploader.bind('Error', function(up, err) {
    document.getElementById('console').innerHTML += "Error #" + err.code + ": " + err.message;
  });

uploader.bind('FileUploaded', function(up, file, result) {
    document.getElementById('console').innerHTML += result.response;
});


uploader.bind('UploadComplete', function(up, files) {
    let data = {
        'name': document.getElementById('name_input').value,
        'status': 'Blur',
    };
    $.post('/admin/api/set_status.php', data);
    document.getElementById('console').innerHTML += "<strong>DONE! You can now close this window!</strong>\n";
});

var failed = false;
var uploading = false;

document.getElementById('submit_button').onclick = function() {
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
    let data = {
        'name': document.getElementById('name_input').value,
    };
    $.post('/admin/api/insert_trail.php', data)
        .done(function(data) {
            if (data == 'exists') {
                failed = true;
                document.getElementById('console').innerHTML += "Error: Trail already exists, not importing!\n";
                document.getElementById('console').innerHTML += "Refresh page and try again!\n";
                uploader.destroy();
                return;
            }
        });
    uploader.setOption('multipart_params', {
        'trail_name': document.getElementById('name_input').value,
    })
    uploader.start();
    uploading = true;
  };