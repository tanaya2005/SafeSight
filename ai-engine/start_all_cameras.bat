@echo off
echo Starting SafeSight Camera Systems...
echo.
echo Starting PPE Detection Server (CAM-1, CAM-2) on port 5001...
start "PPE Detection" cmd /k python camera_stream_server.py
timeout /t 3 /nobreak >nul

echo Starting Zone Monitoring Server (CAM-3, CAM-4) on port 5002...
start "Zone Monitoring" cmd /k python zone_stream_server.py

echo.
echo ✅ Both camera systems started!
echo PPE Detection: http://localhost:5001
echo Zone Monitoring: http://localhost:5002
pause
