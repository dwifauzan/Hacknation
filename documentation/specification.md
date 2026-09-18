# Specification — TokoPilot (MVP)

## Arsitektur Umum
Event-driven, bukan polling. Semua komponen komunikasi lewat event/webhook — nggak ada proses yang ngecek berkala ke WhatsApp/payment gateway.

```
Pembeli (WhatsApp)
      │ pesan masuk
      ▼
WhatsApp Gateway (whatsmeow/Baileys) ──event handler──▶ Agent Orchestrator
                                                              │
                                          ┌───────────────────┴───────────────────┐
                                          ▼                                       ▼
                                    Rules Engine                          Checkout Service
                                 (nego, FAQ, limit)                      (Midtrans/Xendit)
                                          │                                       │
                                          ▼                                       ▼
                                   balas ke pembeli                       link pembayaran
```

## Komponen

### 1. WhatsApp Gateway
- Library: `whatsmeow` (Go) atau `Baileys` (Node.js) — keduanya event-driven lewat koneksi persistent (WebSocket), bukan polling
- Harus jalan sebagai proses **long-running** (bukan serverless function yang mati-hidup)
- Simpan session/device store biar nggak perlu scan QR ulang tiap restart
- Event pesan masuk (`messages.upsert` / `*events.Message`) → forward ke Agent Orchestrator lewat internal API call

### 2. Agent Orchestrator
- LLM API dengan function calling (Claude/GPT)
- Terima pesan masuk → tentuin intent (info umum / nego / checkout / lainnya) → panggil Rules Engine / Checkout Service sesuai kebutuhan
- Kalau confidence rendah atau di luar kapasitas → eskalasi, tandai "Perlu perhatian" di Unified Inbox

### 3. Rules Engine
- Simpan & terapkan: max diskon %, margin floor, daftar FAQ
- Dipakai Agent Orchestrator buat validasi tiap keputusan nego sebelum dieksekusi ke pembeli

### 4. Checkout Service
- Generate payment link lewat Midtrans/Xendit Snap API
- Terima webhook dari payment gateway buat update status order (pending/lunas/kedaluwarsa)

### 5. Owner Dashboard (Frontend)
- Next.js
- Screens: Unified Inbox, AI Settings, Orders — detail tiap screen ada di `prd-01` s/d `prd-03`

## Data Model (garis besar)

| Tabel | Field utama |
|---|---|
| `conversations` | id, buyer_phone, last_message_at, status (`ai_handled` / `needs_attention`), ai_paused |
| `messages` | id, conversation_id, sender (buyer/ai/owner), content, timestamp |
| `products` | id, name, price |
| `orders` | id, conversation_id, product_id, qty, amount, payment_status, payment_link, created_at |
| `settings` | max_discount_pct, margin_floor, ai_enabled |
| `faqs` | id, question, answer |

## Integrasi Eksternal
- **WhatsApp**: whatsmeow / Baileys (unofficial, event-driven) — WhatsApp Business Cloud API resmi diajukan paralel sebagai upgrade kalau approval turun
- **Payment**: Midtrans atau Xendit Snap API + webhook
- **LLM**: Claude/GPT API dengan function calling

## Catatan Deployment
- WhatsApp Gateway butuh proses yang tetap nyala — nggak cocok di platform serverless yang mematikan proses idle
- Simpan credential/session di storage yang persist antar restart, biar nggak perlu re-pairing tiap deploy ulang

## Catatan Scope
Fitur stock & restock draft (termasuk tabel `suppliers` dan field stok di `products`) di-drop dari MVP karena waktu 1 minggu nggak cukup. Kalau mau ditambah lagi nanti, tinggal extend tabel `products` dengan `stock`/`restock_threshold` dan tambah komponen Stock Service terpisah.
