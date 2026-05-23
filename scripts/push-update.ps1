#!/usr/bin/env pwsh
# ============================================================
# push-update.ps1 — Workflow push FinTrack ke GitHub
# Jalankan setiap kali selesai mengerjakan sebuah task.
# Dokumen /dokumen/ TIDAK akan ikut push (sudah di .gitignore).
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$CommitMessage,

    [Parameter(Mandatory=$false)]
    [string]$Branch = "main"
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  FinTrack — Push Update ke GitHub" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Pindah ke root project
Set-Location $ProjectRoot

# ── 1. Tampilkan status git ──────────────────────────────────
Write-Host "[1/4] Cek status git..." -ForegroundColor Yellow
git status --short
Write-Host ""

# ── 2. Tambahkan semua perubahan KECUALI dokumen ────────────
Write-Host "[2/4] Staging perubahan (dokumen/ dikecualikan oleh .gitignore)..." -ForegroundColor Yellow
git add .
Write-Host "      Staged files:" -ForegroundColor DarkGray
git diff --cached --name-only | ForEach-Object { Write-Host "      + $_" -ForegroundColor DarkGray }
Write-Host ""

# ── 3. Commit ────────────────────────────────────────────────
Write-Host "[3/4] Membuat commit: '$CommitMessage'" -ForegroundColor Yellow
git commit -m $CommitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[!] Tidak ada perubahan untuk di-commit." -ForegroundColor Magenta
    Write-Host "    Pastikan ada file yang berubah sebelum menjalankan script ini." -ForegroundColor Magenta
    exit 0
}
Write-Host ""

# ── 4. Push ke remote ────────────────────────────────────────
Write-Host "[4/4] Push ke origin/$Branch..." -ForegroundColor Yellow
git push origin $Branch

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Berhasil! Perubahan sudah di-push." -ForegroundColor Green
    Write-Host "  Dokumen /dokumen/ TIDAK ikut push." -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[!] Push gagal. Cek koneksi atau konflik branch." -ForegroundColor Red
}

Write-Host ""
