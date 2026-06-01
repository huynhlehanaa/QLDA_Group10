@echo off
cd /d "%~dp0"
set NEXT_TELEMETRY_DISABLED=1
".\node_modules\node\bin\node.exe" ".\node_modules\next\dist\bin\next" dev --hostname 127.0.0.1 --port 3000
