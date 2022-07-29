import win32serviceutil

service = 'trailview_watchdog'

win32serviceutil.RestartService(service)