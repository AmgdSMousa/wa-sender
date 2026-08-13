@echo off
echo Starting Cloudflare Tunnel for ProSender...
.\cloudflared.exe tunnel run --url http://localhost:3000 prosender
pause
