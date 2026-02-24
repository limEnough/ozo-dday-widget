@echo off
echo Closing Explorer...
taskkill /f /im explorer.exe

echo Clearing icon cache...
set CACHE=%LocalAppData%\Microsoft\Windows\Explorer
del /q "%CACHE%\iconcache_*.db"
del /q "%CACHE%\iconcache_*.db.woa"
del /q "%CACHE%\thumbcache_*.db"
del /q "%CACHE%\*.db"

echo Starting Explorer...
start explorer.exe
echo Done. Taskbar and folder icons will refresh.
