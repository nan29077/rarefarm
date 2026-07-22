@echo off
cd /d "E:\프로젝트\레어팜"
echo [1] Lock 파일 확인 및 삭제 중...
if exist ".git\HEAD.lock" (
    del /f ".git\HEAD.lock" && echo HEAD.lock 삭제 완료
) else (
    echo HEAD.lock 없음
)
if exist ".git\index.lock" (
    del /f ".git\index.lock" && echo index.lock 삭제 완료
) else (
    echo index.lock 없음
)
echo [2] git add 중...
git add "src/components/auth/LoginForm.tsx"
echo [3] git commit 중...
git commit -m "feat: 로그인/회원가입 페이지 상단 로고를 레어팜 신규 로고로 교체"
echo.
echo === 완료 ===
pause
