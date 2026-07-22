@echo off
chcp 65001 > nul
cd /d E:\프로젝트\레어팜

if exist .git\index.lock (
    del /f .git\index.lock
)
git restore --staged . 2>nul
git add "src/app/live-auction/[id]/page.tsx"
git commit -m "경매 상품 카드를 채팅 입력창 위로 분리 배치 (겹침 해결)"
pause
