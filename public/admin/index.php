<?php
session_start();

if (isset($_SESSION['loggedin'])) {
    header('Location: home.php');
    exit;
}
?>

<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <title>Login</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap-dark-5@1.1.3/dist/css/bootstrap-nightshade.min.css" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    </head>
    <body>
        <div class="container">
            <div class="row align-items-start">
                <div class="col-sm-6 offset-sm-3 mt-5">
                    <div class="login">
                        <h1>Login</h1>
                        <form action="authenticate.php" method="post">
                            <div class="form-floating mb-3 mt-3">
                                <input type="username" class="form-control" id="username" placeholder="Enter username" name="username">
                                <label for="username">Username</label>
                            </div>
                            <div class="form-floating mb-3">
                                <input type="password" class="form-control" id="password" placeholder="Enter password" name="password">
                                <label for="password">Password</label>
                            </div>
                            <button id="submit_button" type="submit" class="btn btn-primary mb-4">Submit</button>
                        </form>
                        <div id="message_container">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </body>
    <script>
        let params = new URL(document.location).searchParams;
        let error = params.get('error');
        if (error == 'invalid') {
            let alert = document.createElement('div');
            alert.classList.add('alert');
            alert.classList.add('alert-danger');
            alert.innerHTML = 'Incorrect username and/or password';
            document.getElementById('message_container').appendChild(alert);
        }
    </script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap-dark-5@1.1.3/dist/js/darkmode.min.js"></script>
</html>