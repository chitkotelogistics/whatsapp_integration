$backendScriptPath = Join-Path $PSScriptRoot '..\start.bat'
$frontendScriptPath = Join-Path $PSScriptRoot '..\..\frontend\start.bat'
$backendWorkingDirectory = Split-Path $backendScriptPath -Parent
$frontendWorkingDirectory = Split-Path $frontendScriptPath -Parent

$backendAction = New-ScheduledTaskAction -Execute $backendScriptPath -WorkingDirectory $backendWorkingDirectory
$frontendAction = New-ScheduledTaskAction -Execute $frontendScriptPath -WorkingDirectory $frontendWorkingDirectory
$trigger = New-ScheduledTaskTrigger -AtStartup

Register-ScheduledTask -TaskName 'Chitkote WhatsApp Backend AutoStart' -Action $backendAction -Trigger $trigger -Force | Out-Null
Register-ScheduledTask -TaskName 'Chitkote WhatsApp Frontend AutoStart' -Action $frontendAction -Trigger $trigger -Force | Out-Null
