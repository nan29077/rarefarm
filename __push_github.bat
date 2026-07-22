@echo off
chcp 65001 >nul
cd /d "%~dp0"
git init > __github_push.txt 2>&1
git add . >> __github_push.txt 2>&1
git commit -m "init: rarefarm initial commit" >> __github_push.txt 2>&1
git remote add origin https://github.com/nan29077/rarefarm.git >> __github_push.txt 2>&1
git branch -M main >> __github_push.txt 2>&1
git push -u origin main >> __github_push.txt 2>&1
git log --oneline -3 >> __github_push.txt 2>&1
echo done
