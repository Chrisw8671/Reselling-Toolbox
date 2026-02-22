@echo off
:loop
cd /d "C:\Users\Chris\Documents\Vscode\Reselling-Toolbox"
npm run dev -- -p 3000
echo App crashed. Restarting in 5 seconds...
timeout /t 5
goto loop