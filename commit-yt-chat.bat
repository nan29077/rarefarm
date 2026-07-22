@echo off
del /f /q .git\index.lock 2>nul
git restore --staged . 2>nul
git add -A
git commit -m "YouTube 채팅 중복 제거, 마스킹 해제, 출처 뱃지, 3초 빠른 폴링"
echo.
echo 완료. 아무 키나 누르세요.
pause
