@echo off
cd /d E:\프로젝트\레어팜
git init 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "YouTube 채팅 중복 수신 완전 해결"
pause
