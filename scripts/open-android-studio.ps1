param(
  [string]$ProjectRoot = 'P:\playtalk-main'
)

$studioCandidates = @(
  'C:\Program Files\Android\Android Studio\bin\studio64.exe',
  'C:\Program Files\Android\Android Studio\bin\studio.exe'
)

$androidProject = Join-Path $ProjectRoot 'android'
if (-not (Test-Path $androidProject)) {
  Write-Error "Projeto Android nao encontrado em $androidProject"
  exit 1
}

$studioPath = $studioCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $studioPath) {
  Write-Error 'Android Studio nao encontrado nos caminhos padrao.'
  exit 1
}

Start-Process -FilePath $studioPath -ArgumentList "`"$androidProject`""
Write-Output "Android Studio aberto em: $androidProject"
