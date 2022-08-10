NOTE: It is best to use a Markdown editor/viewer for this file, I like MarkText



* In order to process new trails, an automated service is run on the web server that periodically checks the status of trails and runs the appropriate scripts on them.

* This service can be found in Task Manager on the `services` tab and named `trailview_watchdog` 

* The service simply runs the script `tools/watchdog.py`. Any modification to this file requires restarting the service in Task Manager.

* This service was created using `NSSM - the Non-Sucking Service Manager` and can be found on the desktop named `nssm`
