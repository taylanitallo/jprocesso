@echo off
set /p msg="Descricao do que mudou: "
"C:\Program Files\Git\cmd\git.exe" -C "C:\Users\sejuv\OneDrive\Desktop\Sejuv 2025\JEOS Sistemas\jProcesso" add .
"C:\Program Files\Git\cmd\git.exe" -C "C:\Users\sejuv\OneDrive\Desktop\Sejuv 2025\JEOS Sistemas\jProcesso" commit -m "%msg%"
"C:\Program Files\Git\cmd\git.exe" -C "C:\Users\sejuv\OneDrive\Desktop\Sejuv 2025\JEOS Sistemas\jProcesso" push
echo.
echo Publicado! Vercel e Railway vao atualizar automaticamente.
pause
