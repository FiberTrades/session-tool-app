@echo off
rem ==========================================================================
rem  Minimalist Manager - install the EA into EVERY MetaTrader 5 on this PC.
rem
rem  Each MT5 you install keeps its own Experts folder, so an EA installed in
rem  one is missing from the others. Double-click this after every new build
rem  (F7 in MetaEditor) and it copies MinimalistManager.ex5 into all of them.
rem
rem  It uses MinimalistManager.ex5 from the folder this file is in if there is
rem  one, otherwise the newest copy found in any of your MT5s.
rem ==========================================================================
set "MM_HERE=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=[IO.File]::ReadAllText('%~f0'); iex $t.Substring($t.IndexOf('#'+'PS'))"
echo.
pause
exit /b
#PS
$root = Join-Path $env:APPDATA 'MetaQuotes\Terminal'
Write-Host ''
Write-Host 'Minimalist Manager - installing into every MT5 on this PC'
Write-Host ''
$src = $null
if ($env:MM_HERE) { $src = Get-ChildItem -LiteralPath $env:MM_HERE -Filter 'MinimalistManager.ex5' -ErrorAction SilentlyContinue | Select-Object -First 1 }
if (-not $src) { $src = Get-ChildItem -LiteralPath $root -Recurse -Filter 'MinimalistManager.ex5' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 }
if (-not $src) {
  Write-Host 'No MinimalistManager.ex5 found. Build it once (F7 in MetaEditor), or put it next to this file, then run this again.'
  return
}
Write-Host ('Using ' + $src.FullName)
Write-Host ('built ' + $src.LastWriteTime.ToString('dd MMM yyyy HH:mm'))
Write-Host ''
$n = 0
foreach ($d in Get-ChildItem -LiteralPath $root -Directory) {
  $exp  = Join-Path $d.FullName 'MQL5\Experts'
  $orig = Join-Path $d.FullName 'origin.txt'
  if (-not (Test-Path -LiteralPath $exp) -or -not (Test-Path -LiteralPath $orig)) { continue }
  $app = (Get-Content -LiteralPath $orig -Raw).Trim()
  if (-not (Test-Path -LiteralPath (Join-Path $app 'terminal64.exe'))) { continue }   # that MT5 is no longer installed
  $name = Split-Path $app -Leaf
  $dst  = Join-Path $exp 'MinimalistManager.ex5'
  try {
    if ($dst -ne $src.FullName) { Copy-Item -LiteralPath $src.FullName -Destination $dst -Force -ErrorAction Stop }
    Write-Host ('  OK      ' + $name)
    $n++
  } catch {
    Write-Host ('  FAILED  ' + $name + '  - close that MT5 and run this again')
  }
}
Write-Host ''
Write-Host ('Installed in ' + $n + ' MT5 program(s).')
Write-Host 'In each MT5: Navigator > right-click Expert Advisors > Refresh.'
Write-Host 'Where the EA is already on a chart, remove it and attach it again so the new version loads.'
