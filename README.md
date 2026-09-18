# HackNation - High-Performance WhatsApp Microservice Engine & DB Web Suite

System architecture documentation and developer reference for the **HackNation WhatsApp Microservice Engine**. This repository provides an asynchronous, anti-ban protected WhatsApp broadcast and chat management platform built with **Go (`whatsmeow`)**, **SQLite (WAL Mode)**, and **Laravel 11**.

---

## 🏗️ System Architecture

The application adopts a decoupled microservice architecture orchestrated via Docker Compose:

```
+-------------------------------------------------------------------+
|                        Web Browser Client                         |
|   (WhatsApp Web-Style DB Chat UI & Anti-Ban Broadcast Dashboard)  |
+---------------------------------+---------------------------------+
                                  |
                        HTTP / REST Requests
                                  |
                                  v
+---------------------------------+---------------------------------+
|                    Laravel 11 Core Application                    |
|                (Container: laravel-app | Port: 8001)               |
|      - Reverse proxy routing for status, QR, chats, and messages  |
|      - Form validation & input sanitization                       |
+---------------------------------+---------------------------------+
                                  |
                        Internal HTTP Protocol
                    (http://whatsapp-service:8080)
                                  |
                                  v
+---------------------------------+---------------------------------+
|                 Go WhatsApp Engine Microservice                   |
|            (Container: whatsapp-service | Port: 8080)             |
|   - Engine core powered by `go.mau.fi/whatsmeow`                  |
|   - Asynchronous WebSocket event handler & Anti-Ban pipeline      |
|   - SQLite WAL Storage Engine (`whatsapp.db`)                     |
+-------------------------------------------------------------------+
```

### Component Breakdown:
1. **Laravel 11 Core (`laravel-app`)**: Serves the single-page Blade web application (`welcome.blade.php`), proxies frontend AJAX calls to the internal Go microservice (`BroadcastController.php`), and handles input sanitization.
2. **Go WhatsApp Microservice (`whatsapp-service`)**: Pure Go microservice built on `whatsmeow` that manages WhatsApp Web socket connections, pairing states, inbound message streaming, and outbound dispatch with anti-ban protections.
3. **Embedded SQLite Engine (`whatsapp.db`)**: Embedded local database maintaining pairing credentials, session keys, contacts summary, and message history archives.

---

## 🛡️ Anti-Ban Mechanism Implementation

WhatsApp applies automated heuristics to detect non-standard API clients and mass distribution patterns. The Go engine implements multi-layered countermeasures:

### 1. Web Client Device Signature Emulation
The engine overrides client store device properties upon startup to emulate a standard WhatsApp Web session on Google Chrome for Windows:
```go
store.DeviceProps.Os = proto.String("Windows")
```

### 2. Recipient JID Verification (`IsOnWhatsApp`)
Before attempting outbound message dispatch, the engine queries the WhatsApp server to verify whether the target phone number exists:
```go
onWA, err := client.IsOnWhatsApp(ctx, []string{cleanPhone})
```
*Rationale*: Sending messages to unregistered JIDs is a primary trigger for automated account flagging. Requests targeting invalid numbers are rejected immediately with a `400 Bad Request`.

### 3. Humanized Typing Presence Simulation (`SendChatPresence`)
Prior to dispatching message payloads, the engine sends a chat presence update and introduces a randomized typing delay (1,500ms – 3,000ms):
```go
_ = client.SendChatPresence(ctx, targetJID, types.ChatPresenceComposing, types.ChatPresenceMediaText)
time.Sleep(time.Duration(1500 + rand.Intn(1500)) * time.Millisecond)
resp, err := client.SendMessage(ctx, targetJID, &waE2E.Message{ ... })
_ = client.SendChatPresence(ctx, targetJID, types.ChatPresencePaused, types.ChatPresenceMediaText)
```

### 4. Outbound Rate Limiting & Inter-Message Jitter
Outbound dispatches are guarded by a mutex-protected rate limiter that enforces a minimum cooldown of 3 seconds plus a randomized 0–2,000ms jitter between consecutive messages:
```go
sendMutex.Lock()
elapsed := time.Since(lastSendTime)
requiredWait := MinSendInterval + time.Duration(rand.Intn(2000))*time.Millisecond
if elapsed < requiredWait {
    time.Sleep(requiredWait - elapsed)
}
lastSendTime = time.Now()
sendMutex.Unlock()
```

### 5. Inbound Message & History Sync Throttling
- Inbound `*events.Message` logging is rate-limited to 50 events/minute via a sliding window counter to prevent memory pressure.
- Inbound `*events.HistorySync` events are processed without automated media downloads (`DisableAutoDownload`), keeping CPU and disk I/O usage minimal.

---

## 💾 SQLite Concurrency & Database Schema

To eliminate `SQLITE_BUSY` (database is locked) errors during simultaneous history sync writes and message dispatches, the SQLite connection DSN is configured with **Write-Ahead Logging (WAL)** and a 10-second busy timeout:

```go
dsn := "file:sessions/whatsapp.db?_foreign_keys=on&_journal_mode=WAL&_busy_timeout=10000&_sync=NORMAL"
```

### Schema Definitions:

#### 1. Contact Summary Table (`chats`) — $O(1)$ Lookup Table
Stores upserted contact summaries to enable instant chat list rendering without full table scans:
```sql
CREATE TABLE IF NOT EXISTS chats (
    jid TEXT PRIMARY KEY,
    sender_name TEXT,
    last_message TEXT,
    from_me INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. Message History Table (`chat_messages`)
Stores complete message history for inbound and outbound messages:
```sql
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT,
    jid TEXT,
    sender_name TEXT,
    from_me INTEGER DEFAULT 0,
    message_text TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_jid ON chat_messages(jid);
CREATE INDEX IF NOT EXISTS idx_messages_jid_id ON chat_messages(jid, id DESC);
```

---

## 🔌 API Endpoints Specification

All endpoints are proxied through Laravel Core (`http://localhost:8001`) and delegate internally to the Go microservice (`http://whatsapp-service:8080`).

### 1. System & Authentication Endpoints

#### `GET /whatsapp/status`
Returns connection and authentication state of the Go WhatsApp engine.
- **Response `200 OK`**:
  ```json
  {
    "connected": true,
    "logged_in": true,
    "jid": "628123456789@s.whatsapp.net",
    "anti_ban_active": true,
    "min_delay_sec": 3,
    "max_incoming_pm": 50
  }
  ```

#### `GET /whatsapp/qr`
Returns the active pairing QR code stream.
- **Response**: `image/png` binary stream if unauthenticated; `application/json` if already authenticated.

#### `POST /whatsapp/logout`
Terminates the current WhatsApp Web session and resets pairing state.
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "message": "Session WhatsApp berhasil di-reset / logout."
  }
  ```

---

### 2. Chat Data & Messaging Endpoints (DB-Driven)

#### `GET /whatsapp/chats`
Fetches a list of registered contacts and their latest message snippets strictly from the local `chats` database table.
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "jid": "628123456789@s.whatsapp.net",
        "phone": "628123456789",
        "sender_name": "John Doe",
        "last_message": "Hello, this is a test message",
        "from_me": false,
        "timestamp": "2026-09-18 14:15:00"
      }
    ]
  }
  ```

#### `GET /whatsapp/messages?jid={jid}`
Fetches up to 50 historical messages for a given contact JID from `chat_messages`.
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "jid": "628123456789@s.whatsapp.net",
    "data": [
      {
        "id": 1,
        "message_id": "3EB0AA1221A4BAD9DEB1EA",
        "jid": "628123456789@s.whatsapp.net",
        "sender_name": "John Doe",
        "from_me": false,
        "message_text": "Hello",
        "timestamp": "2026-09-18 14:14:00"
      },
      {
        "id": 2,
        "message_id": "AC5800F6C52658DD73AFEE560FBF520C",
        "jid": "628123456789@s.whatsapp.net",
        "sender_name": "Me",
        "from_me": true,
        "message_text": "Hi John!",
        "timestamp": "2026-09-18 14:15:00"
      }
    ]
  }
  ```

#### `POST /kirim-pesan`
Dispatches an outbound message to the target number via the anti-ban pipeline and archives the record to SQLite.
- **Request Body (`application/x-www-form-urlencoded` or `application/json`)**:
  ```json
  {
    "target": "08123456789",
    "pesan": "Halo! Ini pesan broadcast otomatis."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "message": "Pesan WhatsApp berhasil dikirim (Proteksi Anti-Ban & Tersimpan ke DB)",
    "data": {
      "message_id": "AC5800F6C52658DD73AFEE560FBF520C",
      "to": "628123456789",
      "anti_ban": "typing_presence_and_rate_limited"
    }
  }
  ```

---

## 🛠️ Local Development & Deployment Guide

### Prerequisites
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [Go 1.23+](https://go.dev/) (For local Go microservice development without Docker)
- [PHP 8.2+](https://www.php.net/) & [Composer](https://getcomposer.org/) (For local Laravel development)

### 1. Running via Docker Compose (Production / Full Containerized Setup)

From the project root directory (`Hacknation`), execute:

```bash
docker compose up -d --build
```

Container Port Mappings:
- **Laravel Web Application & Dashboard**: `http://localhost:8001`
- **Go WhatsApp Service**: `http://localhost:8080`

To inspect container logs:
```bash
docker logs -f hacknation-whatsapp-service-1
docker logs -f hacknation-laravel-app-1
```

### 2. Running Standalone Services (Local Development Without Docker)

#### Terminal 1: Run Go WhatsApp Microservice
```bash
cd Whatsapp-service
go run main.go
```
*Listens on `http://localhost:8080`*.

#### Terminal 2: Run Laravel Core
```bash
php artisan serve --port=8000
```
*Listens on `http://localhost:8000`*.
