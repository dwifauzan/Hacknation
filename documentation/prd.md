# PRD — TokoPilot (MVP)

## Problem
UMKM jualan tersebar di WhatsApp & Instagram. Owner harus manual pantau dan bales tiap chat, gampang kelewat pesan, dan capek ngurus nego sendiri.

## Goal MVP
AI agent yang otomatis bales DM WhatsApp, nego dalam batas yang di-set owner, dan kasih link checkout — semua dari satu dashboard, tanpa owner perlu buka WhatsApp manual.

## Target User
- **Owner** — pemilik UMKM, atur aturan & pantau toko dari dashboard
- **Pembeli** — chat lewat WhatsApp seperti biasa, nggak perlu install apa-apa

## Fitur MVP (target 1 minggu)

| # | Fitur | Deskripsi singkat |
|---|---|---|
| 1 | Unified Inbox | Semua chat WhatsApp ngumpul di satu dashboard, owner bisa lihat & ambil alih balas |
| 2 | AI Auto-Reply & Nego Rules | AI bales otomatis, nego dalam batas diskon yang di-set owner, jawab FAQ |
| 3 | Checkout | AI generate link pembayaran (Midtrans/Xendit) begitu pembeli deal |

Detail requirement & screen per fitur ada di `prd-01-unified-inbox.md` s/d `prd-03-checkout.md`.

## Out of Scope (roadmap, bukan MVP)
- Instagram sebagai channel penuh
- Broadcast/DM ke grup komunitas buat promosi
- Sync otomatis ke marketplace (Tokopedia/Shopee)
- Stock & Restock Draft — di-drop dari MVP karena waktu 1 minggu nggak cukup
- Voice command, mission control live-feed, governance hash-chain, MCP storefront

## Success Metrics (buat demo)
- AI bales pesan real-time (event-driven, bukan delay polling)
- Nego selalu jalan dalam batas yang di-set, nggak pernah lewat limit
- Link checkout valid, status order ke-update otomatis

## Tim & Timeline
- **Excel** — backend, agent orchestration, WhatsApp gateway
- **Fauzan** — frontend, dashboard
- **Gerald** — riset, UI/UX, dokumentasi, pitch
- Timeline: 7 hari (breakdown di `README.md`, urutan proses di `flow.md`)

## Risiko Utama
- Approval WhatsApp/Instagram Business API resmi bisa lebih dari 1 minggu → mitigasi: pakai library event-driven unofficial (whatsmeow/Baileys) buat build & demo, ajukan yang resmi paralel di hari 1
