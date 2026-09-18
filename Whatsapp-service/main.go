package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"

	_ "modernc.org/sqlite"
	"github.com/mdp/qrterminal/v3"
	qrcode "github.com/skip2/go-qrcode"
	"go.mau.fi/whatsmeow"
	waE2E "go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
)

var (
	client    *whatsmeow.Client
	currentQR string
	qrMutex   sync.RWMutex
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

func main() {
	dbLog := waLog.Stdout("Database", "INFO", true)
	ctx := context.Background()
	// Inisialisasi koneksi SQLite store (pure Go)
	container, err := sqlstore.New(ctx, "sqlite", "file:whatsapp.db?_foreign_keys=on", dbLog)
	if err != nil {
		log.Fatalf("Gagal inisialisasi database SQLite: %v", err)
	}

	deviceStore, err := container.GetFirstDevice(ctx)
	if err != nil {
		log.Fatalf("Gagal mengambil device store: %v", err)
	}

	clientLog := waLog.Stdout("Client", "INFO", true)
	client = whatsmeow.NewClient(deviceStore, clientLog)
	client.AddEventHandler(eventHandler)

	if client.Store.ID == nil {
		// Belum login, minta QR code channel
		qrChan, _ := client.GetQRChannel(context.Background())
		err = client.Connect()
		if err != nil {
			log.Fatalf("Gagal terhubung ke WhatsApp: %v", err)
		}

		go func() {
			for evt := range qrChan {
				if evt.Event == "code" {
					qrMutex.Lock()
					currentQR = evt.Code
					qrMutex.Unlock()

					fmt.Println("\n================ Scan QR Code ini dengan WhatsApp ================")
					qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
					fmt.Println("=================================================================\n")
				} else {
					log.Printf("QR Event: %s", evt.Event)
				}
			}
		}()
	} else {
		// Sudah ada session
		err = client.Connect()
		if err != nil {
			log.Fatalf("Gagal terhubung ke WhatsApp: %v", err)
		}
		log.Println("Berhasil terhubung ke WhatsApp dengan session yang tersimpan.")
	}

	// HTTP Routes
	http.HandleFunc("/send-wa", handleSendWA)
	http.HandleFunc("/status", handleStatus)
	http.HandleFunc("/qr", handleQR)

	port := "8080"
	log.Printf("WhatsApp Microservice berjalan di port %s...", port)

	server := &http.Server{Addr: ":" + port}
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	log.Println("Mematikan WhatsApp service...")
	client.Disconnect()
}

func eventHandler(evt interface{}) {
	switch v := evt.(type) {
	case *events.Connected:
		log.Println("Terhubung ke server WhatsApp.")
	case *events.LoggedOut:
		log.Println("Keluaran dari session WhatsApp.")
		qrMutex.Lock()
		currentQR = ""
		qrMutex.Unlock()
	case *events.Message:
		log.Printf("Menerima pesan dari %s", v.Info.Sender.String())
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
		json.NewEncoder(w).Encode(APIResponse{Status: "error", Message: "Nomor hp (phone) dan pesan (message) wajib diisi"})
		return
	}

	if !client.IsLoggedIn() {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(APIResponse{Status: "error", Message: "WhatsApp client belum terhubung / belum scan QR code. Buka http://localhost:8080/qr"})
		return
	}

	cleanPhone := formatPhone(req.Phone)
	recipientJID := types.NewJID(cleanPhone, types.DefaultUserServer)

	resp, err := client.SendMessage(context.Background(), recipientJID, &waE2E.Message{
		Conversation: proto.String(req.Message),
	})

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIResponse{Status: "error", Message: fmt.Sprintf("Gagal mengirim pesan: %v", err)})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(APIResponse{
		Status:  "success",
		Message: "Pesan WhatsApp berhasil dikirim",
		Data:    map[string]string{"message_id": resp.ID, "to": cleanPhone},
	})
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	connected := client.IsConnected()
	loggedIn := client.IsLoggedIn()
	jid := ""
	if client.Store.ID != nil {
		jid = client.Store.ID.String()
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"connected": connected,
		"logged_in": loggedIn,
		"jid":       jid,
	})
}

func handleQR(w http.ResponseWriter, r *http.Request) {
	if client.IsLoggedIn() {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprintf(w, "<h2>WhatsApp sudah terhubung (Logged In)</h2><p>JID: %s</p>", client.Store.ID.String())
		return
	}

	qrMutex.RLock()
	qrCode := currentQR
	qrMutex.RUnlock()

	if qrCode == "" {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprint(w, "<h2>QR Code belum siap atau sedang dimuat. Silakan refresh halaman dalam beberapa detik.</h2>")
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
