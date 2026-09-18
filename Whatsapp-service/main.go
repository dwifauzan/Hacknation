package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/coder/websocket"
	"github.com/mdp/qrterminal/v3"
	qrcode "github.com/skip2/go-qrcode"
	"go.mau.fi/whatsmeow"
	waE2E "go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
	_ "modernc.org/sqlite"
)

// ⚠️ ANTI-BAN CRITICAL — JANGAN UBAH CONSTANTS
const (
	MinSendInterval   = 3 * time.Second // Jeda minimum antara pengiriman pesan (Anti-Ban Critical)
	MaxIncomingPerMin = 50              // Maksimal log/proses event pesan masuk per menit (Anti-Ban Guard)

	// HistorySync Optimization Constants
	HistorySyncMaxAgeDays     = 7
	HistorySyncMaxMsgsPerChat = 1
)

type SendWARequest struct {
	Phone   string `json:"phone"`
	Message string `json:"message"`
}

type APIResponse struct {
	Status  string      `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type DBJob struct {
	MessageID   string `json:"message_id"`
	JID         string `json:"jid"`
	SenderName  string `json:"sender_name"`
	FromMe      bool   `json:"from_me"`
	MessageText string `json:"message_text"`
	Timestamp   string `json:"timestamp"`
	IsHistory   bool   `json:"is_history"`
}

type ChatSummary struct {
	JID         string `json:"jid"`
	Phone       string `json:"phone"`
	SenderName  string `json:"sender_name"`
	LastMessage string `json:"last_message"`
	FromMe      bool   `json:"from_me"`
	Timestamp   string `json:"timestamp"`
	JIDType     string `json:"jid_type"`
}

func getJIDType(jid string) string {
	if strings.Contains(jid, "@lid") || strings.HasSuffix(jid, "@lid") {
		return "lid"
	}
	return "phone"
}

func resolveToPhoneJID(jid string) string {
	if jid == "" {
		return ""
	}
	normJID := normalizeJID(jid)
	if !strings.HasSuffix(normJID, "@lid") && !strings.Contains(normJID, "@lid") {
		return normJID
	}
	if client == nil || client.Store == nil || client.Store.LIDs == nil {
		return normJID
	}

	parsedLID, err := types.ParseJID(normJID)
	if err != nil {
		return normJID
	}

	pnJID, err := client.Store.LIDs.GetPNForLID(context.Background(), parsedLID)
	if err == nil && !pnJID.IsEmpty() {
		resolved := normalizeJID(pnJID.String())
		if resolved != "" {
			return resolved
		}
	}
	return normJID
}

func migrateExistingLIDs() {
	if writeDB == nil || client == nil || client.Store == nil || client.Store.LIDs == nil {
		return
	}

	rows, err := writeDB.Query(`SELECT jid FROM chats WHERE jid LIKE '%@lid'`)
	if err != nil {
		log.Printf("[MIGRATION] LID check error: %v", err)
		return
	}

	type lidMigration struct {
		lidJID   string
		phoneJID string
	}
	var migrations []lidMigration

	for rows.Next() {
		var lidJID string
		if err := rows.Scan(&lidJID); err == nil {
			phoneJID := resolveToPhoneJID(lidJID)
			if phoneJID != lidJID && (strings.HasSuffix(phoneJID, "@s.whatsapp.net") || !strings.Contains(phoneJID, "@lid")) {
				migrations = append(migrations, lidMigration{lidJID: lidJID, phoneJID: phoneJID})
			}
		}
	}
	rows.Close()

	if len(migrations) == 0 {
		log.Println("[MIGRATION] Tidak ada LID JID yang perlu dimigrasi di database.")
		return
	}

	log.Printf("[MIGRATION] Memulai migrasi %d LID JID ke Phone JID...", len(migrations))

	tx, err := writeDB.Begin()
	if err != nil {
		log.Printf("[MIGRATION] Gagal transaksi migrasi LID: %v", err)
		return
	}
	defer tx.Rollback()

	for _, m := range migrations {
		_, err := tx.Exec(`UPDATE chat_messages SET jid = ? WHERE jid = ?`, m.phoneJID, m.lidJID)
		if err != nil {
			log.Printf("[MIGRATION] Error update chat_messages for %s: %v", m.lidJID, err)
			continue
		}

		var existingCount int
		_ = tx.QueryRow(`SELECT COUNT(*) FROM chats WHERE jid = ?`, m.phoneJID).Scan(&existingCount)

		if existingCount > 0 {
			_, _ = tx.Exec(`
				UPDATE chats
				SET
					sender_name = COALESCE(NULLIF(sender_name, ''), (SELECT sender_name FROM chats WHERE jid = ?)),
					last_message = CASE WHEN (SELECT timestamp FROM chats WHERE jid = ?) > timestamp THEN (SELECT last_message FROM chats WHERE jid = ?) ELSE last_message END,
					timestamp = CASE WHEN (SELECT timestamp FROM chats WHERE jid = ?) > timestamp THEN (SELECT timestamp FROM chats WHERE jid = ?) ELSE timestamp END
				WHERE jid = ?
			`, m.lidJID, m.lidJID, m.lidJID, m.lidJID, m.lidJID, m.phoneJID)

			_, _ = tx.Exec(`DELETE FROM chats WHERE jid = ?`, m.lidJID)
		} else {
			_, _ = tx.Exec(`UPDATE chats SET jid = ? WHERE jid = ?`, m.phoneJID, m.lidJID)
		}

		log.Printf("[MIGRATION] Berhasil memigrasi LID %s -> %s", m.lidJID, m.phoneJID)
	}

	if err := tx.Commit(); err != nil {
		log.Printf("[MIGRATION] Gagal commit migrasi LID: %v", err)
	} else {
		log.Println("[MIGRATION] Selesai memigrasi LID ke Phone JID.")
		loadChatCacheFromDB()
	}
}

var (
	client    *whatsmeow.Client
	writeDB   *sql.DB
	readDB    *sql.DB
	currentQR string
	qrMutex   sync.RWMutex

	// ⚠️ ANTI-BAN CRITICAL — JANGAN UBAH MUTEX & RATE LIMIT VARIABLES
	sendMutex    sync.Mutex
	lastSendTime time.Time

	receivedMsgCount int64
	windowStartTime  time.Time
	windowMutex      sync.Mutex

	// High-Performance Storage Batching Queue
	writeQueue = make(chan DBJob, 1000)

	// Prepared Statements
	stmtGetMessagesCursor *sql.Stmt

	// In-Memory Chat Cache (O(1) Instant Read)
	chatCache      []ChatSummary
	chatCacheMutex sync.RWMutex

	// Debounce WS Broadcast (max 1 broadcast per 5s per JID)
	lastBroadcastMap = make(map[string]time.Time)
	broadcastMutex   sync.Mutex

	// WebSocket Realtime Hub
	wsClients = make(map[*websocket.Conn]bool)
	wsMutex   sync.Mutex
)

func getLogLevel() string {
	if lvl := os.Getenv("LOG_LEVEL"); lvl != "" {
		return strings.ToUpper(lvl)
	}
	return "INFO"
}

func init() {
	rand.Seed(time.Now().UnixNano())
	windowStartTime = time.Now()
}

func normalizeJID(jid string) string {
	if jid == "" {
		return ""
	}
	parts := strings.Split(jid, "@")
	if len(parts) != 2 {
		return jid
	}
	userPart := parts[0]
	if colonIdx := strings.Index(userPart, ":"); colonIdx != -1 {
		userPart = userPart[:colonIdx]
	}
	return userPart + "@" + parts[1]
}

func initChatDatabase(db *sql.DB) {
	query := `
	CREATE TABLE IF NOT EXISTS chats (
		jid TEXT PRIMARY KEY,
		sender_name TEXT,
		last_message TEXT,
		from_me INTEGER DEFAULT 0,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
	);

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
	CREATE INDEX IF NOT EXISTS idx_chats_timestamp ON chats(timestamp DESC);
	`
	_, err := db.Exec(query)
	if err != nil {
		log.Printf("Gagal inisialisasi tabel chat & indexes: %v", err)
	} else {
		log.Println("Database 'chats' & 'chat_messages' teroptimasi dengan SQLite PRAGMAs, WAL Mode & Indexes.")
	}
}

func loadChatCacheFromDB() {
	if readDB == nil {
		return
	}
	rows, err := readDB.Query(`SELECT jid, sender_name, last_message, from_me, timestamp FROM chats ORDER BY timestamp DESC LIMIT 50`)
	if err != nil {
		log.Printf("Gagal memuat chatCache dari DB: %v", err)
		return
	}
	defer rows.Close()

	list := []ChatSummary{}
	for rows.Next() {
		var jid, senderName, msgText, ts string
		var fromMeInt int
		if err := rows.Scan(&jid, &senderName, &msgText, &fromMeInt, &ts); err == nil {
			resolvedJID := resolveToPhoneJID(jid)
			phone := resolvedJID
			if parts := strings.Split(resolvedJID, "@"); len(parts) > 0 {
				phone = parts[0]
			}
			list = append(list, ChatSummary{
				JID:         resolvedJID,
				Phone:       phone,
				SenderName:  senderName,
				LastMessage: msgText,
				FromMe:      fromMeInt == 1,
				Timestamp:   ts,
				JIDType:     getJIDType(resolvedJID),
			})
		}
	}

	chatCacheMutex.Lock()
	chatCache = list
	chatCacheMutex.Unlock()
	log.Printf("Loaded %d chats into In-Memory Chat Cache.", len(list))
}

func updateInMemoryChatCache(job DBJob) {
	chatCacheMutex.Lock()
	defer chatCacheMutex.Unlock()

	normJID := resolveToPhoneJID(job.JID)
	phone := normJID
	if parts := strings.Split(normJID, "@"); len(parts) > 0 {
		phone = parts[0]
	}

	newItem := ChatSummary{
		JID:         normJID,
		Phone:       phone,
		SenderName:  job.SenderName,
		LastMessage: job.MessageText,
		FromMe:      job.FromMe,
		Timestamp:   job.Timestamp,
		JIDType:     getJIDType(normJID),
	}

	idx := -1
	for i, item := range chatCache {
		if item.JID == normJID {
			idx = i
			break
		}
	}

	if idx != -1 {
		if newItem.SenderName == "" {
			newItem.SenderName = chatCache[idx].SenderName
		}
		chatCache = append(chatCache[:idx], chatCache[idx+1:]...)
	}

	chatCache = append([]ChatSummary{newItem}, chatCache...)
	if len(chatCache) > 50 {
		chatCache = chatCache[:50]
	}
}

// Worker Goroutine: Batching Write Queue (Flush tiap 200ms atau 50 item)
func startDBWorker() {
	stmtInsertMsg, err := writeDB.Prepare(`INSERT INTO chat_messages (message_id, jid, sender_name, from_me, message_text, timestamp) VALUES (?, ?, ?, ?, ?, ?)`)
	if err != nil {
		log.Printf("Gagal prepare stmtInsertMsg: %v", err)
	}
	stmtUpsertChat, err := writeDB.Prepare(`INSERT INTO chats (jid, sender_name, last_message, from_me, timestamp) VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(jid) DO UPDATE SET
			sender_name = COALESCE(NULLIF(EXCLUDED.sender_name, ''), chats.sender_name),
			last_message = EXCLUDED.last_message,
			from_me = EXCLUDED.from_me,
			timestamp = EXCLUDED.timestamp`)
	if err != nil {
		log.Printf("Gagal prepare stmtUpsertChat: %v", err)
	}

	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()

	batch := make([]DBJob, 0, 50)

	flush := func() {
		if len(batch) == 0 {
			return
		}
		tx, err := writeDB.Begin()
		if err != nil {
			log.Printf("Gagal begin tx write worker: %v", err)
			batch = batch[:0]
			return
		}

		txStmtInsert := tx.Stmt(stmtInsertMsg)
		txStmtUpsert := tx.Stmt(stmtUpsertChat)

		for _, job := range batch {
			fromMeInt := 0
			if job.FromMe {
				fromMeInt = 1
			}
			normJID := normalizeJID(job.JID)
			_, _ = txStmtInsert.Exec(job.MessageID, normJID, job.SenderName, fromMeInt, job.MessageText, job.Timestamp)
			_, _ = txStmtUpsert.Exec(normJID, job.SenderName, job.MessageText, fromMeInt, job.Timestamp)
			updateInMemoryChatCache(job)
		}

		if err := tx.Commit(); err != nil {
			log.Printf("Gagal commit batch write worker: %v", err)
		} else {
			// Debounced WS Broadcast per JID (Maksimal 1x per 5 detik per JID kontak)
			for _, job := range batch {
				if !job.IsHistory {
					normJID := normalizeJID(job.JID)
					broadcastMutex.Lock()
					lastTime := lastBroadcastMap[normJID]
					if time.Since(lastTime) >= 5*time.Second {
						lastBroadcastMap[normJID] = time.Now()
						broadcastMutex.Unlock()
						broadcastWS("new_message", job)
					} else {
						broadcastMutex.Unlock()
					}
				}
			}
		}
		batch = batch[:0]
	}

	for {
		select {
		case job, ok := <-writeQueue:
			if !ok {
				flush()
				return
			}
			batch = append(batch, job)
			if len(batch) >= 50 {
				flush()
			}
		case <-ticker.C:
			flush()
		}
	}
}

func pushJobToQueueFull(msgID, jid, senderName string, fromMe bool, text string, ts string, isHistory bool) {
	if strings.TrimSpace(text) == "" {
		return
	}
	normJID := normalizeJID(jid)
	if ts == "" {
		ts = time.Now().Format("2006-01-02 15:04:05")
	}

	job := DBJob{
		MessageID:   msgID,
		JID:         normJID,
		SenderName:  senderName,
		FromMe:      fromMe,
		MessageText: text,
		Timestamp:   ts,
		IsHistory:   isHistory,
	}

	select {
	case writeQueue <- job:
	default:
		log.Println("[WARN] Write queue penuh (1000 items), simpan pesan di-skip.")
	}
}

func pushJobToQueue(msgID, jid, senderName string, fromMe bool, text string) {
	pushJobToQueueFull(msgID, jid, senderName, fromMe, text, "", false)
}

func broadcastWS(msgType string, payload interface{}) {
	wsMutex.Lock()
	defer wsMutex.Unlock()

	if len(wsClients) == 0 {
		return
	}

	data, err := json.Marshal(map[string]interface{}{
		"type": msgType,
		"data": payload,
	})
	if err != nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	for c := range wsClients {
		_ = c.Write(ctx, websocket.MessageText, data)
	}
}

// withCORS membungkus handler agar bisa diakses browser dari origin lain
// (frontend :3000, Laravel :8001). Wajib untuk integrasi docker-compose.
func withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(map[string]interface{}{"status": "ok", "service": "whatsapp-service"})
}

func handleWS(w http.ResponseWriter, r *http.Request) {
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true,
	})
	if err != nil {
		log.Printf("Gagal upgrade websocket: %v", err)
		return
	}
	defer c.CloseNow()

	wsMutex.Lock()
	wsClients[c] = true
	wsMutex.Unlock()

	defer func() {
		wsMutex.Lock()
		delete(wsClients, c)
		wsMutex.Unlock()
	}()

	ctx := r.Context()
	for {
		_, _, err := c.Read(ctx)
		if err != nil {
			break
		}
	}
}

func extractMessageText(v *events.Message) string {
	if v.Message == nil {
		return ""
	}
	if v.Message.GetConversation() != "" {
		return v.Message.GetConversation()
	}
	if v.Message.GetExtendedTextMessage() != nil && v.Message.GetExtendedTextMessage().GetText() != "" {
		return v.Message.GetExtendedTextMessage().GetText()
	}
	if v.Message.GetImageMessage() != nil && v.Message.GetImageMessage().GetCaption() != "" {
		return "[Gambar] " + v.Message.GetImageMessage().GetCaption()
	}
	if v.Message.GetDocumentMessage() != nil && v.Message.GetDocumentMessage().GetCaption() != "" {
		return "[Dokumen] " + v.Message.GetDocumentMessage().GetCaption()
	}
	return ""
}

func extractMessageTextFromHistory(msg *waE2E.Message) string {
	if msg == nil {
		return ""
	}
	if msg.GetConversation() != "" {
		return msg.GetConversation()
	}
	if msg.GetExtendedTextMessage() != nil && msg.GetExtendedTextMessage().GetText() != "" {
		return msg.GetExtendedTextMessage().GetText()
	}
	if msg.GetImageMessage() != nil && msg.GetImageMessage().GetCaption() != "" {
		return "[Gambar] " + msg.GetImageMessage().GetCaption()
	}
	if msg.GetDocumentMessage() != nil && msg.GetDocumentMessage().GetCaption() != "" {
		return "[Dokumen] " + msg.GetDocumentMessage().GetCaption()
	}
	return ""
}

func main() {
	logLevel := getLogLevel()
	log.Printf("Menjalankan WhatsApp service dengan Dual-Pool SQLite, In-Memory Cache & WS Realtime (Log Level: %s)", logLevel)

	// ⚠️ ANTI-BAN CRITICAL — JANGAN UBAH DEVICE PROPS FINGERPRINT
	store.DeviceProps.Os = proto.String("Windows")

	dbLog := waLog.Stdout("Database", logLevel, true)
	ctx := context.Background()

	if err := os.MkdirAll("sessions", 0755); err != nil {
		log.Fatalf("Gagal membuat folder sessions: %v", err)
	}

	dsnWriter := "file:sessions/whatsapp.db?_foreign_keys=on&_journal_mode=WAL&_busy_timeout=10000&_sync=NORMAL&_cache_size=-64000&_temp_store=MEMORY&_mmap_size=268435456"
	dsnReader := "file:sessions/whatsapp.db?mode=ro&_foreign_keys=on&_journal_mode=WAL&_busy_timeout=10000&_sync=NORMAL&_cache_size=-64000&_temp_store=MEMORY&_mmap_size=268435456"

	container, err := sqlstore.New(ctx, "sqlite", dsnWriter, dbLog)
	if err != nil {
		log.Fatalf("Gagal inisialisasi database SQLite: %v", err)
	}

	// 1. Single-connection Writer DB Pool
	wDB, err := sql.Open("sqlite", dsnWriter)
	if err != nil {
		log.Fatalf("Gagal membuka Writer DB: %v", err)
	}
	wDB.SetMaxOpenConns(1)
	writeDB = wDB
	initChatDatabase(writeDB)

	// 2. Multi-connection Read-Only DB Pool (4 concurrent connections)
	rDB, err := sql.Open("sqlite", dsnReader)
	if err != nil {
		log.Fatalf("Gagal membuka Reader DB: %v", err)
	}
	rDB.SetMaxOpenConns(4)
	readDB = rDB

	// Load In-Memory Chat List Cache dari SQLite saat startup
	loadChatCacheFromDB()

	// Prepared Statements untuk Cursor Pagination Query
	pMsgsCursor, err := readDB.Prepare(`
		SELECT id, message_id, jid, sender_name, from_me, message_text, timestamp 
		FROM chat_messages 
		WHERE (jid = ? OR jid = ? OR jid LIKE ?) AND (? = 0 OR id < ?) 
		ORDER BY id DESC LIMIT 30`)
	if err != nil {
		log.Printf("Gagal prepare stmtGetMessagesCursor: %v", err)
	}
	stmtGetMessagesCursor = pMsgsCursor

	// Jalankan Worker Async Write Queue
	go startDBWorker()

	// Goroutine Checkpoint WAL Pasif (Tiap 5 Menit)
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			if writeDB != nil {
				_, _ = writeDB.Exec("PRAGMA wal_checkpoint(PASSIVE);")
			}
		}
	}()

	deviceStore, err := container.GetFirstDevice(ctx)
	if err != nil {
		log.Fatalf("Gagal mengambil device store: %v", err)
	}

	clientLog := waLog.Stdout("Client", logLevel, true)
	client = whatsmeow.NewClient(deviceStore, clientLog)
	client.AddEventHandler(eventHandler)

	if client.Store.ID == nil {
		startQRLoginProcess()
	} else {
		log.Println("Mencoba menghubungkan dengan session tersimpan...")
		err = client.Connect()
		if err != nil {
			log.Printf("Gagal terhubung ke WhatsApp: %v", err)
		} else {
			log.Println("Berhasil terhubung ke WhatsApp dengan session tersimpan.")
		}
	}

	// HTTP Routes (dibungkus CORS agar bisa dipanggil browser :3000 & Laravel :8001)
	http.HandleFunc("/send-wa", withCORS(handleSendWA))
	http.HandleFunc("/status", withCORS(handleStatus))
	http.HandleFunc("/qr", withCORS(handleQR))
	http.HandleFunc("/logout", withCORS(handleLogout))
	http.HandleFunc("/chats", withCORS(handleChats))
	http.HandleFunc("/messages", withCORS(handleMessages))
	http.HandleFunc("/health", handleHealth)
	http.HandleFunc("/ws", handleWS)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("WhatsApp Microservice berjalan di port %s dengan WebSocket real-time...", port)

	server := &http.Server{Addr: ":" + port}
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	log.Println("Mematikan WhatsApp service...")
	client.Disconnect()
	close(writeQueue)
	if writeDB != nil {
		writeDB.Close()
	}
	if readDB != nil {
		readDB.Close()
	}
}

func startQRLoginProcess() {
	if client.IsConnected() {
		client.Disconnect()
	}
	qrChan, err := client.GetQRChannel(context.Background())
	if err != nil {
		log.Printf("[TRACING] Error mendapatkan QR channel: %v", err)
		return
	}

	go func() {
		for evt := range qrChan {
			log.Printf("[TRACING] QR Event diterima: %s", evt.Event)
			if evt.Event == "code" {
				qrMutex.Lock()
				currentQR = evt.Code
				qrMutex.Unlock()

				fmt.Println("\n================ Scan QR Code ini dengan WhatsApp ================")
				qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
				fmt.Println("=================================================================")

				// BUG FIX #2: Broadcast QR code string ke WebSocket real-time
				broadcastWS("qr_update", map[string]interface{}{"qr": evt.Code})
			} else if evt.Event == "timeout" {
				log.Println("[TRACING] QR Code expired. Silakan refresh /qr untuk QR baru.")
				qrMutex.Lock()
				currentQR = ""
				qrMutex.Unlock()
			} else if evt.Event == "success" {
				log.Println("[TRACING] QR Code berhasil di-scan!")
				qrMutex.Lock()
				currentQR = ""
				qrMutex.Unlock()
				broadcastWS("status_update", map[string]interface{}{"status": "connected"})
			}
		}
	}()

	err = client.Connect()
	if err != nil {
		log.Printf("[TRACING] Gagal memanggil client.Connect(): %v", err)
	}
}

func eventHandler(evt interface{}) {
	switch v := evt.(type) {
	case *events.Connected:
		log.Println("[EVENT] Connected: Terhubung ke server WhatsApp.")
		broadcastWS("status_update", map[string]interface{}{"status": "connected"})
		go migrateExistingLIDs()
	case *events.Disconnected:
		log.Println("[EVENT] Disconnected: Terputus dari server WhatsApp.")
		broadcastWS("status_update", map[string]interface{}{"status": "disconnected"})
	case *events.ConnectFailure:
		log.Printf("[EVENT] ConnectFailure: Gagal terhubung: %v", v.Reason)
	case *events.PairSuccess:
		log.Printf("[EVENT] PairSuccess: Berhasil pairing dengan nomor %s", v.ID.String())
		qrMutex.Lock()
		currentQR = ""
		qrMutex.Unlock()
		broadcastWS("status_update", map[string]interface{}{"status": "paired", "id": v.ID.String()})
		go migrateExistingLIDs()
	case *events.LoggedOut:
		log.Printf("[EVENT] LoggedOut: Keluar dari session WhatsApp. Reason: %v", v.Reason)
		qrMutex.Lock()
		currentQR = ""
		qrMutex.Unlock()
		broadcastWS("status_update", map[string]interface{}{"status": "logged_out"})
		go startQRLoginProcess()
	case *events.StreamReplaced:
		log.Println("[EVENT] StreamReplaced: Session WhatsApp digantikan oleh koneksi lain.")
	case *events.HistorySync:
		log.Printf("[EVENT] HistorySync: Menerima sinkronisasi riwayat pesan (%d obrolan). Memproses ke DB (Max %d hari, Max %d msg/chat)...",
			len(v.Data.GetConversations()), HistorySyncMaxAgeDays, HistorySyncMaxMsgsPerChat)
		go func(hs *events.HistorySync) {
			count := 0
			cutoff := time.Now().Add(-time.Duration(HistorySyncMaxAgeDays) * 24 * time.Hour)

			for _, conv := range hs.Data.GetConversations() {
				rawJID := conv.GetID()
				if rawJID == "" || strings.HasSuffix(rawJID, "@g.us") || strings.Contains(rawJID, "@g.us") {
					continue
				}
				resolvedJID := resolveToPhoneJID(rawJID)

				msgs := conv.GetMessages()
				if len(msgs) == 0 {
					continue
				}

				startIdx := len(msgs) - HistorySyncMaxMsgsPerChat
				if startIdx < 0 {
					startIdx = 0
				}
				recentMsgs := msgs[startIdx:]

				for _, historyMsg := range recentMsgs {
					if historyMsg == nil || historyMsg.GetMessage() == nil {
						continue
					}
					webMsg := historyMsg.GetMessage()
					if webMsg.GetMessage() == nil {
						continue
					}

					// Filter timestamp max HistorySyncMaxAgeDays (7 hari)
					if webMsg.GetMessageTimestamp() > 0 {
						msgTime := time.Unix(int64(webMsg.GetMessageTimestamp()), 0)
						if msgTime.Before(cutoff) {
							continue
						}
					}

					txt := extractMessageTextFromHistory(webMsg.GetMessage())
					if txt == "" {
						continue
					}

					msgID := ""
					fromMe := false
					if webMsg.GetKey() != nil {
						msgID = webMsg.GetKey().GetID()
						fromMe = webMsg.GetKey().GetFromMe()
					}

					senderName := conv.GetName()
					if senderName == "" {
						parts := strings.Split(resolvedJID, "@")
						if len(parts) > 0 {
							senderName = parts[0]
						}
					}

					ts := time.Now().Format("2006-01-02 15:04:05")
					if webMsg.GetMessageTimestamp() > 0 {
						ts = time.Unix(int64(webMsg.GetMessageTimestamp()), 0).Format("2006-01-02 15:04:05")
					}

					pushJobToQueueFull(msgID, resolvedJID, senderName, fromMe, txt, ts, true)
					count++
				}
			}
			log.Printf("[EVENT] HistorySync: Selesai memproses %d pesan riwayat ke DB Queue.", count)
			broadcastWS("history_synced", map[string]interface{}{"status": "completed", "total": count})
		}(v)
	case *events.Message:
		// BUG FIX #1: Abaikan total pesan dari grup
		if v.Info.IsGroup {
			return
		}

		// ⚠️ ANTI-BAN CRITICAL — JANGAN HAPUS RATE LIMITER INBOUND
		windowMutex.Lock()
		now := time.Now()
		if now.Sub(windowStartTime) > time.Minute {
			windowStartTime = now
			atomic.StoreInt64(&receivedMsgCount, 0)
		}
		count := atomic.AddInt64(&receivedMsgCount, 1)
		windowMutex.Unlock()

		msgText := extractMessageText(v)
		senderName := v.Info.PushName
		if senderName == "" {
			senderName = v.Info.Sender.User
		}

		normJID := resolveToPhoneJID(v.Info.Chat.String())

		if msgText != "" {
			// Simpan pesan ke Async Write Queue (Non-blocking) dengan JID ternormalisasi
			pushJobToQueue(v.Info.ID, normJID, senderName, v.Info.IsFromMe, msgText)
		}

		if count <= MaxIncomingPerMin {
			log.Printf("[EVENT] Message (#%d/min): Menerima pesan dari %s (ID: %s)", count, normJID, v.Info.ID)
		} else if count == MaxIncomingPerMin+1 {
			log.Printf("[RATE LIMIT] Batas log pesan masuk (%d/menit) tercapai. Pesan berikutnya disenyapkan sementara.", MaxIncomingPerMin)
		}
	}
}

func formatPhone(phone string) string {
	var sb strings.Builder
	for _, ch := range phone {
		if ch >= '0' && ch <= '9' {
			sb.WriteRune(ch)
		}
	}
	clean := sb.String()

	if strings.HasPrefix(clean, "0") {
		clean = "62" + clean[1:]
	}

	return clean
}

// ⚠️ ANTI-BAN CRITICAL — JANGAN UBAH ALUR PENGIRIMAN OUTBOUND
func handleSendWA(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(APIResponse{Status: "error", Message: "Method not allowed"})
		return
	}

	var req SendWARequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIResponse{Status: "error", Message: "Invalid JSON body"})
		return
	}

	if req.Phone == "" || req.Message == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIResponse{Status: "error", Message: "Nomor HP (phone) dan pesan (message) wajib diisi"})
		return
	}

	if !client.IsLoggedIn() {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(APIResponse{Status: "error", Message: "WhatsApp client belum terhubung / belum scan QR code."})
		return
	}

	cleanPhone := formatPhone(req.Phone)
	targetJID := types.NewJID(cleanPhone, types.DefaultUserServer)

	// ⚠️ ANTI-BAN CRITICAL — JANGAN HAPUS VERIFIKASI IsOnWhatsApp
	onWA, err := client.IsOnWhatsApp(context.Background(), []string{cleanPhone})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIResponse{Status: "error", Message: fmt.Sprintf("Gagal memverifikasi nomor WhatsApp: %v", err)})
		return
	}
	if len(onWA) == 0 || !onWA[0].IsIn {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIResponse{Status: "error", Message: fmt.Sprintf("Nomor %s tidak terdaftar di WhatsApp!", cleanPhone)})
		return
	}
	if onWA[0].JID.User != "" {
		targetJID = onWA[0].JID
	}

	// ⚠️ ANTI-BAN CRITICAL — JANGAN UBAH RATE LIMIT DELAY & JITTER MUTEX (SEQUENTIAL BLOCKING)
	sendMutex.Lock()
	elapsed := time.Since(lastSendTime)
	requiredWait := MinSendInterval + time.Duration(rand.Intn(2000))*time.Millisecond
	if elapsed < requiredWait {
		waitTime := requiredWait - elapsed
		time.Sleep(waitTime)
	}
	lastSendTime = time.Now()
	sendMutex.Unlock()

	// ⚠️ ANTI-BAN CRITICAL — JANGAN UBAH URUTAN: SendChatPresence(Composing) -> Sleep -> SendMessage -> SendChatPresence(Paused)
	_ = client.SendChatPresence(context.Background(), targetJID, types.ChatPresenceComposing, types.ChatPresenceMediaText)
	typingDelay := time.Duration(1500+rand.Intn(1500)) * time.Millisecond
	time.Sleep(typingDelay)

	resp, err := client.SendMessage(context.Background(), targetJID, &waE2E.Message{
		Conversation: proto.String(req.Message),
	})

	_ = client.SendChatPresence(context.Background(), targetJID, types.ChatPresencePaused, types.ChatPresenceMediaText)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIResponse{Status: "error", Message: fmt.Sprintf("Gagal mengirim pesan: %v", err)})
		return
	}

	normJID := normalizeJID(targetJID.String())

	// Push pesan outbound ke Async Write Queue (Tidak mengganggu jalur pengiriman)
	pushJobToQueue(resp.ID, normJID, "Me", true, req.Message)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(APIResponse{
		Status:  "success",
		Message: "Pesan WhatsApp berhasil dikirim (Proteksi Anti-Ban & Async Storage Active)",
		Data: map[string]interface{}{
			"message_id": resp.ID,
			"to":         cleanPhone,
			"anti_ban":   "typing_presence_and_rate_limited",
		},
	})
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	connected := client.IsConnected()
	loggedIn := client.IsLoggedIn()
	jid := ""
	if client.Store.ID != nil {
		jid = normalizeJID(client.Store.ID.String())
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"connected":       connected,
		"logged_in":       loggedIn,
		"jid":             jid,
		"anti_ban_active": true,
		"min_delay_sec":   MinSendInterval.Seconds(),
		"max_incoming_pm": MaxIncomingPerMin,
	})
}

func handleQR(w http.ResponseWriter, r *http.Request) {
	if client.IsLoggedIn() {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "logged_in",
			"message": "WhatsApp sudah terhubung",
			"jid":     normalizeJID(client.Store.ID.String()),
		})
		return
	}

	qrMutex.RLock()
	qrCode := currentQR
	qrMutex.RUnlock()

	if qrCode == "" {
		if !client.IsConnected() {
			go startQRLoginProcess()
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "generating",
			"message": "QR Code sedang dibuat. Silakan coba beberapa detik lagi.",
		})
		return
	}

	png, err := qrcode.Encode(qrCode, qrcode.Medium, 256)
	if err != nil {
		http.Error(w, "Gagal membuat gambar QR Code", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.Write(png)
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(APIResponse{Status: "error", Message: "Method not allowed"})
		return
	}

	if client != nil {
		if client.IsLoggedIn() {
			err := client.Logout(context.Background())
			if err != nil {
				client.Disconnect()
			}
		} else if client.IsConnected() {
			client.Disconnect()
		}
	}

	qrMutex.Lock()
	currentQR = ""
	qrMutex.Unlock()

	go startQRLoginProcess()

	json.NewEncoder(w).Encode(APIResponse{
		Status:  "success",
		Message: "Session WhatsApp berhasil di-reset / logout.",
	})
}

// In-Memory Chat List Cache Read (Super Cepat O(1), 0ms Disk Query)
func handleChats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	chatCacheMutex.RLock()
	data := make([]ChatSummary, len(chatCache))
	copy(data, chatCache)
	chatCacheMutex.RUnlock()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"data":   data,
	})
}

// Cursor-Based Pagination Read untuk handleMessages
func handleMessages(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	targetJID := r.URL.Query().Get("jid")
	if targetJID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIResponse{Status: "error", Message: "Parameter jid wajib diisi"})
		return
	}

	if stmtGetMessagesCursor == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"status": "success", "data": []interface{}{}})
		return
	}

	normJID := normalizeJID(targetJID)
	cleanPhone := formatPhone(normJID)
	fullJID := cleanPhone + "@s.whatsapp.net"

	var beforeID int64 = 0
	if beforeStr := r.URL.Query().Get("before_id"); beforeStr != "" {
		if parsed, err := strconv.ParseInt(beforeStr, 10, 64); err == nil {
			beforeID = parsed
		}
	}

	rows, err := stmtGetMessagesCursor.Query(normJID, fullJID, cleanPhone+"%", beforeID, beforeID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIResponse{Status: "error", Message: fmt.Sprintf("Query messages error: %v", err)})
		return
	}
	defer rows.Close()

	type MessageItem struct {
		ID          int64  `json:"id"`
		MessageID   string `json:"message_id"`
		JID         string `json:"jid"`
		SenderName  string `json:"sender_name"`
		FromMe      bool   `json:"from_me"`
		MessageText string `json:"message_text"`
		Timestamp   string `json:"timestamp"`
		JIDType     string `json:"jid_type"`
	}

	descList := []MessageItem{}
	for rows.Next() {
		var id int64
		var msgID, jid, senderName, msgText, ts string
		var fromMeInt int
		if err := rows.Scan(&id, &msgID, &jid, &senderName, &fromMeInt, &msgText, &ts); err == nil {
			resolvedJID := resolveToPhoneJID(jid)
			descList = append(descList, MessageItem{
				ID:          id,
				MessageID:   msgID,
				JID:         resolvedJID,
				SenderName:  senderName,
				FromMe:      fromMeInt == 1,
				MessageText: msgText,
				Timestamp:   ts,
				JIDType:     getJIDType(resolvedJID),
			})
		}
	}

	// Balik urutan slice agar urut dari paling lama ke paling baru (kronologis)
	ascList := make([]MessageItem, len(descList))
	for i, item := range descList {
		ascList[len(descList)-1-i] = item
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"jid":    normJID,
		"data":   ascList,
	})
}
