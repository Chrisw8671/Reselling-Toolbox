@echo off
:loop
cd /d "J:\Documents\Chris\Vscode\Reselling App\2.0\reseller-inventory"
npm run dev -- -p 3000
echo App crashed. Restarting in 5 seconds...
timeout /t 5
goto loop