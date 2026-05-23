#!/usr/bin/env pwsh
# ============================================================
# update-checklist.ps1 — Update Log Update di Checklist FinTrack
# Jalankan setelah task selesai, sebelum push-update.ps1
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$LogEntry,

    [Parameter(Mandatory=$false)]
    [string]$Date = (Get-Date -Format "yyyy-MM-dd")
)

$ProjectRoot  = Split-Path -Parent $PSScriptRoot
$ChecklistPath = Join-Path $ProjectRoot "dokumen\Checklist_Status_Fitur_FinTrack.md"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Update Log Checklist FinTrack" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Baca isi file checklist
$content = Get-Content $ChecklistPath -Raw -Encoding UTF8

# Baris baru yang akan ditambahkan ke tabel Log Update
$newRow = "| $Date | $LogEntry |"

# Cari baris terakhir tabel Log Update dan sisipkan baris baru setelahnya
# Tabel Log Update dimulai dengan "| Tanggal | Update |"
if ($content -match '\| Tanggal \| Update \|') {
    # Cari posisi baris terakhir berisi "| 20" (tahun) untuk append setelah baris terakhir tabel
    $lines    = $content -split "`n"
    $lastIdx  = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^\| 20\d\d-') {
            $lastIdx = $i
        }
    }

    if ($lastIdx -ge 0) {
        # Sisipkan baris baru setelah baris log terakhir
        $linesBefore = $lines[0..$lastIdx]
        $linesAfter  = $lines[($lastIdx+1)..($lines.Count-1)]
        $newLines    = $linesBefore + $newRow + $linesAfter
        $newContent  = $newLines -join "`n"
        Set-Content $ChecklistPath -Value $newContent -Encoding UTF8 -NoNewline
        Write-Host "Berhasil menambahkan log update:" -ForegroundColor Green
        Write-Host "  $newRow" -ForegroundColor DarkGray
    } else {
        Write-Host "[!] Tidak dapat menemukan tabel Log Update. Tambahkan manual." -ForegroundColor Red
    }
} else {
    Write-Host "[!] Tidak dapat menemukan header Log Update. Periksa file checklist." -ForegroundColor Red
}

Write-Host ""
Write-Host "File checklist: $ChecklistPath" -ForegroundColor DarkGray
Write-Host "(Ingat: file ini TIDAK akan di-push ke GitHub)" -ForegroundColor Magenta
Write-Host ""
