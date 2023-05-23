<?php

	$config_file = file_get_contents('../../config/local.json');
	$config_json = json_decode($config_file, true);

	$server = $config_json['db_address'];
	$user = $config_json['db_username'];
	$pass = $config_json['db_password'];
	$db = $config_json['db_name'];
	
	$connectionInfo = array("UID" => $user,
							"PWD" => $pass,
							"Database" => $db);

	$api_pass = $config_json['api_password'];

?>