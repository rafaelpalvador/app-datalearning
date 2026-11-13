# Atualiza (ou instala) o Datum no Windows pelo terminal.
# Uso no PowerShell:
#   irm https://raw.githubusercontent.com/rafaelpalvador/app-datalearning/HEAD/scripts/atualizar-windows.ps1 | iex
# Para reinstalar mesmo se já estiver na última versão: $env:DATUM_FORCAR = '1' antes do comando.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # deixa o download bem mais rápido no PowerShell 5
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$repo = 'rafaelpalvador/app-datalearning'

Write-Host 'Procurando a versão mais recente do Datum...' -ForegroundColor Cyan
$rel = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest" -Headers @{ 'User-Agent' = 'Datum-atualizador' }
$ultima = $rel.tag_name.TrimStart('v')
$asset = $rel.assets | Where-Object { $_.name -like '*windows-instalador.exe' } | Select-Object -First 1
if (-not $asset) { throw "A versão $ultima não tem instalador para Windows." }

# versão instalada (lida do registro do Windows)
$chaves = @(
  'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
$instalado = Get-ItemProperty $chaves -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayName -match '^(Datum|DataLingo)\b' } | Select-Object -First 1
$atual = if ($instalado) { $instalado.DisplayVersion } else { $null }

if ($atual) { Write-Host "Instalada: $atual   |   Mais recente: $ultima" }
else { Write-Host "O Datum não está instalado. Instalando a versão $ultima..." }

if ($atual -and -not $env:DATUM_FORCAR -and ([version]$atual -ge [version]$ultima)) {
  Write-Host 'Você já está na versão mais recente.' -ForegroundColor Green
  return
}

$destino = Join-Path $env:TEMP $asset.name
Write-Host ("Baixando {0} ({1:N1} MB)..." -f $asset.name, ($asset.size / 1MB))
Invoke-WebRequest $asset.browser_download_url -OutFile $destino -UseBasicParsing

Write-Host 'Fechando o Datum (se estiver aberto)...'
Get-Process -Name 'Datum', 'DataLingo' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

Write-Host 'Instalando (o progresso é mantido)...'
$p = Start-Process -FilePath $destino -ArgumentList '/S', '--updated' -PassThru
$p.WaitForExit()
Remove-Item $destino -ErrorAction SilentlyContinue

# abre o Datum a partir da pasta onde ele foi instalado
$novo = Get-ItemProperty $chaves -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayName -match '^(Datum|DataLingo)\b' } | Select-Object -First 1
$exe = $null
if ($novo.InstallLocation) { $exe = Join-Path $novo.InstallLocation 'Datum.exe' }
if (-not ($exe -and (Test-Path $exe)) -and $novo.DisplayIcon) { $exe = ($novo.DisplayIcon -split ',')[0].Trim('"') }
if ($exe -and (Test-Path $exe)) { Start-Process $exe }
Write-Host "Pronto: Datum $($novo.DisplayVersion) instalado." -ForegroundColor Green
