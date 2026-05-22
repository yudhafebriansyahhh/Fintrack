# FinTrack WhatsApp Gateway (whatsapp-web.js)

Bridge ringan untuk menghubungkan FinTrack dengan WhatsApp via library [`whatsapp-web.js`](https://wwebjs.dev/).
Cocok untuk uji coba lokal dengan satu nomor bot.

## Prasyarat

- Node.js 20+
- Chromium/Chrome (puppeteer akan unduh otomatis saat install)
- Akun WhatsApp aktif untuk dipakai sebagai bot

## Setup

```powershell
cd whatsapp-gateway
copy .env.example .env
npm install
```

Isi `.env`:

| Key | Keterangan |
| --- | --- |
| `PORT` | Port HTTP gateway (default 4000) |
| `GATEWAY_TOKEN` | Token Bearer yang juga dipakai FinTrack di `WHATSAPP_TOKEN` |
| `FINTRACK_WEBHOOK_URL` | URL webhook FinTrack, mis. `http://localhost:8000/api/whatsapp/webhook` |
| `FINTRACK_WEBHOOK_TOKEN` | Token sama dengan `WHATSAPP_WEBHOOK_TOKEN` di FinTrack |
| `SESSION_PATH` | Folder penyimpan session WhatsApp (`./session` default) |

Pastikan FinTrack `.env` punya:

```
WHATSAPP_DRIVER=http
WHATSAPP_ENDPOINT=http://localhost:4000/messages
WHATSAPP_TOKEN=<sama dengan GATEWAY_TOKEN>
WHATSAPP_SENDER=
WHATSAPP_BOT_PHONE=081995851174
WHATSAPP_WEBHOOK_TOKEN=<sama dengan FINTRACK_WEBHOOK_TOKEN>
```

## Menjalankan

```powershell
npm run dev
```

Saat pertama kali, terminal akan menampilkan QR code. Scan dengan akun bot WhatsApp (Settings > Linked Devices > Link a device).
Sesi akan tersimpan di folder `session/`. Restart berikutnya tidak perlu scan ulang selama folder tetap ada.

## Endpoint

- `GET /health` -> cek status, `{status,ready}`
- `POST /messages` (Authorization: Bearer GATEWAY_TOKEN) body `{ phone, message, reference_id }` -> kirim pesan keluar

## Alur

1. FinTrack memanggil `POST http://localhost:4000/messages` setiap ada pesan keluar (OTP, balasan command, reminder).
2. Gateway mengirim ke WhatsApp via session aktif.
3. Saat user membalas chat ke bot, event `message` diteruskan ke `FINTRACK_WEBHOOK_URL` dengan body `{ phone, message, provider_message_id }`.
4. FinTrack memproses pesan via `CommandParser`, lalu kirim balasan kembali ke gateway.

## Tips local

- Jalankan FinTrack di port standar `php artisan serve` (8000).
- Jika menggunakan ngrok, set `FINTRACK_WEBHOOK_URL` ke URL HTTPS ngrok dan pastikan FinTrack juga reachable.
- Untuk reset session WhatsApp, hapus folder `session/`.
- Pengujian cepat: kirim pesan `help` ke nomor bot dan cek terminal gateway.

## Catatan

- whatsapp-web.js memakai Chromium di balik layar. Hindari spam balasan agar tidak terkena rate limit/banned.
- Untuk produksi, jalankan via PM2 atau docker, simpan folder `session` di volume permanen, dan tambahkan reverse proxy + HTTPS.