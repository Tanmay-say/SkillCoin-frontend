@echo off
setlocal
set "ROOT=%~dp0"
"%ROOT%node_modules\.pnpm\node_modules\.bin\tsx.CMD" "%ROOT%packages\cli\src\bin\skillcoin.ts" %*
