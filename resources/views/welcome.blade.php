<!DOCTYPE html>
<html lang="id" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>HackNation - WhatsApp Engine & Real-Time DB Chat</title>
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Lucide Icons & Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    
    <!-- QRCode.js Library for Real-Time Client-Side QR Generation -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Plus Jakarta Sans', 'sans-serif'],
                    },
                    colors: {
                        brand: {
                            50: '#eefbf4',
                            100: '#d6f6e4',
                            500: '#10b981',
                            600: '#059669',
                            700: '#047857',
                            900: '#064e3b',
                        },
                        darkbg: '#090d16',
                        darkcard: '#111827',
                        darkborder: '#1f2937'
                    }
                }
            }
        }
    </script>
    <style>
        body {
            background-color: #090d16;
            color: #f3f4f6;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .glass-panel {
            background: rgba(17, 24, 39, 0.75);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glass-modal {
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .pulse-glow-green {
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
        }
        .pulse-glow-amber {
            box-shadow: 0 0 15px rgba(245, 158, 11, 0.4);
        }
        @keyframes scanline {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
        }
        .scan-effect::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 4px;
            background: linear-gradient(90deg, transparent, #10b981, transparent);
            animation: scanline 2.5s infinite linear;
            opacity: 0.7;
        }
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: rgba(17, 24, 39, 0.5);
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(75, 85, 99, 0.4);
            border-radius: 9999px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(16, 185, 129, 0.6);
        }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between selection:bg-brand-500 selection:text-white">

    <!-- Header Navbar -->
    <header class="sticky top-0 z-30 glass-panel border-b border-gray-800/60 px-4 lg:px-8 py-3.5">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
                    <i data-lucide="zap" class="w-5 h-5 text-white"></i>
                </div>
                <div>
                    <h1 class="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        HackNation <span class="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500 font-semibold border border-brand-500/20">Realtime Engine</span>
                    </h1>
                    <p class="text-xs text-gray-400">WebSocket Real-Time Push & High-Speed SQLite WAL</p>
                </div>
            </div>

            <!-- View Mode Switcher -->
            <div class="flex items-center gap-2 p-1 rounded-xl bg-gray-900 border border-gray-800">
                <button id="btnTabWeb" onclick="switchTab('web')" class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition bg-brand-600 text-white shadow">
                    <i data-lucide="layout" class="w-4 h-4"></i>
                    <span>Tampilan WA Web</span>
                </button>
                <button id="btnTabBroadcast" onclick="switchTab('broadcast')" class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition">
                    <i data-lucide="send" class="w-4 h-4"></i>
                    <span>Panel Broadcast</span>
                </button>
            </div>

            <div class="flex items-center gap-4">
                <!-- WebSocket Connection Badge -->
                <div id="wsBadge" class="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-gray-900 text-gray-400 border border-gray-800">
                    <span id="wsDot" class="w-2 h-2 rounded-full bg-gray-500"></span>
                    <span id="wsText">WS Connecting...</span>
                </div>

                <!-- Status Badge -->
                <div id="statusBadge" class="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-900 text-gray-400 border border-gray-800">
                    <span id="statusDot" class="w-2.5 h-2.5 rounded-full bg-gray-500 animate-pulse"></span>
                    <span id="statusText">Checking...</span>
                </div>

                <!-- Login WA Button -->
                <button id="btnLoginWA" onclick="openLoginModal()" class="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-900/30">
                    <i data-lucide="qr-code" class="w-4 h-4"></i>
                    <span id="btnLoginText">Login WA</span>
                </button>
            </div>
        </div>
    </header>

    <!-- Main Workspace -->
    <main class="max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 flex-1 flex flex-col">

        <!-- TAB 1: WhatsApp Web-Style Interface (Realtime WebSocket) -->
        <div id="tabViewWeb" class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 rounded-2xl glass-panel border border-gray-800 shadow-2xl overflow-hidden min-h-[620px]">
            
            <!-- Left Sidebar: Chat List -->
            <div class="lg:col-span-4 border-r border-gray-800/80 flex flex-col bg-gray-950/60">
                <div class="p-4 border-b border-gray-800/80 space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                            <i data-lucide="database" class="w-4 h-4 text-emerald-400"></i>
                            <span>Chat Terdaftar (DB)</span>
                        </span>
                        <button onclick="loadChatList()" title="Refresh obrolan" class="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
                            <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                    <div class="relative">
                        <i data-lucide="search" class="w-4 h-4 text-gray-500 absolute left-3 top-2.5"></i>
                        <input type="text" id="chatSearchInput" oninput="filterChatList()" placeholder="Cari kontak / nomor..." class="w-full pl-9 pr-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500">
                    </div>
                </div>

                <div id="chatListContainer" class="flex-1 overflow-y-auto divide-y divide-gray-900/60">
                    <div class="p-8 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
                        <i data-lucide="loader-2" class="w-6 h-6 animate-spin text-emerald-500"></i>
                        <span>Memuat daftar obrolan...</span>
                    </div>
                </div>
            </div>

            <!-- Right Main Area: Chat Window -->
            <div class="lg:col-span-8 flex flex-col bg-gray-900/40 relative">
                
                <div id="chatHeader" class="p-4 border-b border-gray-800/80 flex items-center justify-between bg-gray-950/40">
                    <div class="flex items-center gap-3">
                        <div id="activeAvatar" class="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                            ?
                        </div>
                        <div>
                            <h3 id="activeTitle" class="text-sm font-bold text-white flex items-center gap-2">
                                Pilih Obrolan
                            </h3>
                            <p id="activeSubtitle" class="text-[11px] text-gray-400">Pilih kontak di sebelah kiri untuk membaca dari DB & WebSocket</p>
                        </div>
                    </div>

                    <div id="activeBadge" class="hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px]">
                        <i data-lucide="zap" class="w-3.5 h-3.5"></i>
                        <span>Realtime Push Active</span>
                    </div>
                </div>

                <div id="chatMessagesContainer" class="flex-1 p-4 lg:p-6 overflow-y-auto space-y-3 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]">
                    <div class="h-full flex flex-col items-center justify-center text-center text-gray-500 text-xs space-y-3 my-auto">
                        <div class="w-16 h-16 rounded-full bg-gray-800/60 flex items-center justify-center text-emerald-500">
                            <i data-lucide="message-square" class="w-8 h-8"></i>
                        </div>
                        <div>
                            <h4 class="text-sm font-semibold text-gray-300">Real-Time DB Chat Viewer</h4>
                            <p class="text-xs text-gray-500 mt-1 max-w-sm">Pesan terdorong secara instant melalui WebSocket. Tanpa polling 3 detik, sangat cepat dan efisien.</p>
                        </div>
                    </div>
                </div>

                <div id="chatInputBar" class="p-3 border-t border-gray-800/80 bg-gray-950/60 flex items-center gap-3">
                    <input type="text" id="quickReplyInput" onkeydown="handleQuickReplyKey(event)" placeholder="Ketik pesan balasan... (Anti-Ban Proteksi Aktif)" class="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500">
                    <button id="btnQuickReply" onclick="sendQuickReply()" class="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-emerald-950/50">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i>
                        <span>Kirim</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- TAB 2: Broadcast Panel View -->
        <div id="tabViewBroadcast" class="hidden grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div class="lg:col-span-7 space-y-6">
                <div class="glass-panel rounded-2xl p-6 lg:p-8 shadow-xl">
                    <div class="flex items-center justify-between pb-6 mb-6 border-b border-gray-800">
                        <div>
                            <h2 class="text-lg font-bold text-white flex items-center gap-2">
                                <i data-lucide="send" class="w-5 h-5 text-brand-500"></i>
                                Kirim Pesan Broadcast
                            </h2>
                            <p class="text-xs text-gray-400 mt-0.5">Kirim pesan WhatsApp langsung dengan fitur simulasi mengetik dan penundaan acak</p>
                        </div>
                        <div class="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                            <i data-lucide="shield-check" class="w-4 h-4"></i>
                            <span>Anti-Ban Active</span>
                        </div>
                    </div>

                    <form id="broadcastForm" onsubmit="handleFormSubmit(event)" class="space-y-5">
                        @csrf
                        <div>
                            <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nomor WhatsApp Tujuan</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                                    <i data-lucide="phone" class="w-4 h-4"></i>
                                </div>
                                <input type="text" name="target" id="targetInput" required placeholder="Contoh: 08123456789 atau 628123456789" class="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-900/80 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm font-mono">
                            </div>
                            <p class="text-xs text-gray-500 mt-1.5">Format otomatis dikonversi ke internasional (contoh: 0812... &rarr; 62812...)</p>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Isi Pesan WhatsApp</label>
                            <textarea name="pesan" id="pesanInput" rows="4" required placeholder="Tuliskan pesan WhatsApp Anda di sini..." class="w-full p-4 rounded-xl bg-gray-900/80 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm leading-relaxed"></textarea>
                        </div>

                        <button type="submit" id="btnSubmit" class="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2">
                            <i data-lucide="send" class="w-4 h-4"></i>
                            <span id="btnSubmitText">Kirim Pesan WhatsApp</span>
                        </button>
                    </form>

                    <div id="alertBox" class="hidden mt-5 p-4 rounded-xl text-sm border flex items-start gap-3">
                        <i id="alertIcon" data-lucide="info" class="w-5 h-5 shrink-0 mt-0.5"></i>
                        <div id="alertMessage" class="flex-1"></div>
                    </div>
                </div>
            </div>

            <!-- Right Column Info -->
            <div class="lg:col-span-5 space-y-6">
                <div class="glass-panel rounded-2xl p-6 shadow-xl space-y-4">
                    <h3 class="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                        <span>Status Engine</span>
                        <button onclick="checkWAStatus()" class="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
                            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                        </button>
                    </h3>
                    <div class="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3 text-xs">
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400">Koneksi Server:</span>
                            <span id="infoConnected" class="font-semibold text-gray-400">Memeriksa...</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400">Status Autentikasi:</span>
                            <span id="infoLoggedIn" class="font-semibold text-gray-400">Memeriksa...</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400">ID WhatsApp (JID):</span>
                            <span id="infoJID" class="font-mono text-emerald-400 truncate max-w-[180px]">-</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </main>

    <!-- Footer -->
    <footer class="glass-panel border-t border-gray-800/60 py-3.5 px-4 text-center text-xs text-gray-500">
        HackNation WhatsApp Engine &copy; 2026 - Powered by Go Whatsmeow, Dual SQLite Pools & Real-Time WebSocket Push
    </footer>

    <!-- QR Code Login Modal -->
    <div id="loginModal" class="fixed inset-0 z-50 hidden flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-modal rounded-3xl max-w-md w-full p-6 lg:p-8 space-y-6 text-center relative shadow-2xl border border-gray-700/50">
            <button onclick="closeLoginModal()" class="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>

            <div>
                <h3 class="text-xl font-bold text-white flex items-center justify-center gap-2">
                    <i data-lucide="qr-code" class="w-6 h-6 text-emerald-400"></i>
                    <span>Login WhatsApp Engine</span>
                </h3>
                <p class="text-xs text-gray-400 mt-1">Pindai kode QR menggunakan aplikasi WhatsApp di ponsel Anda</p>
            </div>

            <!-- BUG FIX #2: Real-time Client-Side QR Canvas -->
            <div class="relative w-64 h-64 mx-auto p-4 rounded-2xl bg-white flex items-center justify-center shadow-inner overflow-hidden scan-effect border border-gray-200">
                <div id="qrCanvasContainer" class="w-full h-full flex items-center justify-center"></div>
                <div id="qrPlaceholder" class="flex flex-col items-center justify-center text-gray-600 gap-2">
                    <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-emerald-600"></i>
                    <span class="text-xs font-medium text-gray-500">Menunggu QR Push via WS...</span>
                </div>
            </div>

            <div class="p-4 rounded-2xl bg-gray-900/80 border border-gray-800 text-left text-xs text-gray-300 space-y-2">
                <div class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Buka WhatsApp di ponsel Anda</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Pilih <b>Menu (⋮)</b> &rarr; <b>Perangkat Tertaut</b></span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Ketuk <b>Tautkan Perangkat</b> lalu arahkan kamera ke QR di atas</span>
                </div>
            </div>

            <div class="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-800">
                <span id="qrStatusText">Realtime WS Push Active</span>
            </div>
        </div>
    </div>

    <!-- Client Script Engine -->
    <script>
        lucide.createIcons();

        let activeJID = null;
        let activeChatName = null;
        let allChats = [];
        let wsSocket = null;
        let qrCodeObj = null;

        document.addEventListener('DOMContentLoaded', () => {
            checkWAStatus();
            loadChatList();
            initWebSocket();
        });

        function initWebSocket() {
            const wsBadge = document.getElementById('wsBadge');
            const wsDot = document.getElementById('wsDot');
            const wsText = document.getElementById('wsText');

            wsBadge.classList.remove('hidden');

            const wsHost = window.location.hostname || 'localhost';
            const wsUrl = `ws://${wsHost}:8080/ws`;

            try {
                wsSocket = new WebSocket(wsUrl);

                wsSocket.onopen = () => {
                    wsDot.className = "w-2 h-2 rounded-full bg-emerald-400 pulse-glow-green";
                    wsText.innerText = "WS Realtime Active";
                    wsText.className = "text-emerald-400 font-semibold";
                };

                wsSocket.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data);
                        
                        // BUG FIX #2: Realtime QR Code Push
                        if (payload.type === 'qr_update') {
                            renderQRCodeString(payload.data.qr);
                        } 
                        else if (payload.type === 'new_message') {
                            const job = payload.data;
                            loadChatList();
                            if (activeJID && (job.jid === activeJID || job.jid.startsWith(activeJID.split('@')[0]))) {
                                appendMessageBubble(job);
                            }
                        } 
                        else if (payload.type === 'status_update') {
                            const st = payload.data.status;
                            if (st === 'connected' || st === 'paired') {
                                closeLoginModal();
                            }
                            checkWAStatus();
                        }
                        // BUG FIX #3: History Synced Refresh
                        else if (payload.type === 'history_synced') {
                            loadChatList();
                        }
                    } catch (e) {
                        console.error('Error parsing WS message:', e);
                    }
                };

                wsSocket.onclose = () => {
                    wsDot.className = "w-2 h-2 rounded-full bg-amber-400";
                    wsText.innerText = "WS Reconnecting...";
                    wsText.className = "text-amber-400 font-semibold";
                    setTimeout(initWebSocket, 3000);
                };

                wsSocket.onerror = (err) => {
                    wsDot.className = "w-2 h-2 rounded-full bg-red-500";
                    wsText.innerText = "WS Offline";
                };
            } catch (err) {
                console.error('WebSocket connection error:', err);
            }
        }

        // BUG FIX #2: Render QR string via Client-Side qrcode.js (tanpa HTTP polling)
        function renderQRCodeString(qrString) {
            const container = document.getElementById('qrCanvasContainer');
            const placeholder = document.getElementById('qrPlaceholder');
            const qrStatusText = document.getElementById('qrStatusText');

            placeholder.classList.add('hidden');
            container.innerHTML = '';

            try {
                qrCodeObj = new QRCode(container, {
                    text: qrString,
                    width: 220,
                    height: 220,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M
                });
                qrStatusText.innerText = 'QR Code Siap Discan (Live Push)';
            } catch (err) {
                console.error('Error rendering QR Code:', err);
                qrStatusText.innerText = 'Gagal me-render QR Code';
            }
        }

        function switchTab(tab) {
            const btnTabWeb = document.getElementById('btnTabWeb');
            const btnTabBroadcast = document.getElementById('btnTabBroadcast');
            const tabViewWeb = document.getElementById('tabViewWeb');
            const tabViewBroadcast = document.getElementById('tabViewBroadcast');

            if (tab === 'web') {
                btnTabWeb.className = "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition bg-brand-600 text-white shadow";
                btnTabBroadcast.className = "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition";
                tabViewWeb.classList.remove('hidden');
                tabViewBroadcast.classList.add('hidden');
                loadChatList();
            } else {
                btnTabBroadcast.className = "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition bg-brand-600 text-white shadow";
                btnTabWeb.className = "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition";
                tabViewBroadcast.classList.remove('hidden');
                tabViewWeb.classList.add('hidden');
            }
        }

        async function loadChatList() {
            try {
                const res = await fetch('/whatsapp/chats');
                const result = await res.json();
                allChats = result.data || [];
                renderChatList(allChats);
            } catch (err) {
                console.error('Failed to load chat list:', err);
            }
        }

        function renderChatList(chats) {
            const container = document.getElementById('chatListContainer');
            if (!chats || chats.length === 0) {
                container.innerHTML = `
                    <div class="p-8 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
                        <i data-lucide="inbox" class="w-6 h-6 text-gray-600"></i>
                        <span>Belum ada riwayat pesan tersimpan di DB.</span>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            container.innerHTML = chats.map(chat => {
                const isSelected = activeJID === chat.jid;
                const activeClass = isSelected ? 'bg-emerald-950/40 border-l-4 border-emerald-500' : 'hover:bg-gray-900/60';

                const isLID = chat.jid_type === 'lid' || (chat.jid && chat.jid.includes('@lid'));
                let titleText = chat.phone;
                let avatarText = chat.phone ? chat.phone.slice(-2) : '?';
                let badgeHTML = '';

                if (isLID) {
                    titleText = chat.sender_name ? `${chat.sender_name} (Kontak Privat)` : 'Kontak Privat';
                    avatarText = 'KP';
                    badgeHTML = `<span class="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium shrink-0 ml-1">Privat</span>`;
                }

                const timeStr = chat.timestamp ? chat.timestamp.split(' ')[1]?.substring(0, 5) || '' : '';

                return `
                    <div onclick="selectChat('${escapeHtml(chat.jid)}', '${escapeHtml(titleText)}', '${chat.jid_type || 'phone'}')" class="p-3.5 cursor-pointer transition flex items-center gap-3 ${activeClass}">
                        <div class="w-10 h-10 rounded-full ${isLID ? 'bg-amber-600/20 text-amber-400 border-amber-500/30' : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'} border flex items-center justify-center font-bold text-xs shrink-0">
                            ${avatarText}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between mb-1">
                                <h4 class="text-xs font-bold text-white truncate flex items-center gap-1">${escapeHtml(titleText)} ${badgeHTML}</h4>
                                <span class="text-[10px] text-gray-500 font-mono shrink-0">${timeStr}</span>
                            </div>
                            <p class="text-[11px] text-gray-400 truncate">
                                ${chat.from_me ? '<span class="text-emerald-400 font-semibold">Anda: </span>' : ''}
                                ${escapeHtml(chat.last_message)}
                            </p>
                        </div>
                    </div>
                `;
            }).join('');

            lucide.createIcons();
        }

        function filterChatList() {
            const query = document.getElementById('chatSearchInput').value.toLowerCase();
            const filtered = allChats.filter(c => c.phone.toLowerCase().includes(query) || (c.sender_name && c.sender_name.toLowerCase().includes(query)) || c.last_message.toLowerCase().includes(query));
            renderChatList(filtered);
        }

        async function selectChat(jid, displayName, jidType) {
            activeJID = jid;
            activeChatName = displayName;
            renderChatList(allChats);

            const isLID = jidType === 'lid' || jid.includes('@lid');
            document.getElementById('activeTitle').innerText = displayName;
            document.getElementById('activeSubtitle').innerText = isLID
                ? `JID: ${jid} (Identitas Privat WA)`
                : `JID: ${jid} (Real-time WebSocket Push)`;
            document.getElementById('activeAvatar').innerText = isLID ? 'KP' : (displayName ? displayName.slice(-2) : '?');
            document.getElementById('activeBadge').classList.remove('hidden');

            loadMessagesForActiveChat();
        }

        async function loadMessagesForActiveChat() {
            if (!activeJID) return;
            const container = document.getElementById('chatMessagesContainer');

            try {
                const res = await fetch(`/whatsapp/messages?jid=${encodeURIComponent(activeJID)}`);
                const result = await res.json();
                const messages = result.data || [];

                if (messages.length === 0) {
                    container.innerHTML = `
                        <div class="h-full flex flex-col items-center justify-center text-center text-gray-500 text-xs">
                            <span>Belum ada pesan dalam obrolan ini.</span>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = messages.map(msg => renderBubbleHTML(msg)).join('');
                container.scrollTop = container.scrollHeight;
            } catch (err) {
                console.error('Error loading messages:', err);
            }
        }

        function appendMessageBubble(msg) {
            const container = document.getElementById('chatMessagesContainer');
            if (container) {
                container.insertAdjacentHTML('beforeend', renderBubbleHTML(msg));
                container.scrollTop = container.scrollHeight;
            }
        }

        function renderBubbleHTML(msg) {
            const timeStr = msg.timestamp ? msg.timestamp.split(' ')[1]?.substring(0, 5) || '' : '';
            if (msg.from_me) {
                return `
                    <div class="flex justify-end">
                        <div class="max-w-[75%] p-3 rounded-2xl rounded-tr-none bg-emerald-600 text-white shadow-lg text-xs leading-relaxed space-y-1">
                            <p>${escapeHtml(msg.message_text)}</p>
                            <div class="text-[9px] text-emerald-200 text-right font-mono">${timeStr} ✓✓</div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="flex justify-start">
                        <div class="max-w-[75%] p-3 rounded-2xl rounded-tl-none bg-gray-800 border border-gray-700/80 text-gray-100 shadow text-xs leading-relaxed space-y-1">
                            <p>${escapeHtml(msg.message_text)}</p>
                            <div class="text-[9px] text-gray-400 text-right font-mono">${timeStr}</div>
                        </div>
                    </div>
                `;
            }
        }

        function handleQuickReplyKey(event) {
            if (event.key === 'Enter') {
                sendQuickReply();
            }
        }

        async function sendQuickReply() {
            const input = document.getElementById('quickReplyInput');
            const btn = document.getElementById('btnQuickReply');
            const message = input.value.trim();

            if (!activeJID || !message) return;

            if (activeJID.includes('@lid')) {
                alert('Peringatan: Kontak ini menggunakan ID Privat WhatsApp (LID) yang nomor telepon aslinya tidak dipublikasikan oleh WhatsApp, sehingga pesan baru tidak dapat dikirim langsung ke LID.');
                return;
            }

            input.value = '';
            btn.disabled = true;

            try {
                const formData = new FormData();
                formData.append('target', activeJID);
                formData.append('pesan', message);

                const res = await fetch('/kirim-pesan', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    }
                });

                const data = await res.json();
                if (!res.ok || data.status !== 'success') {
                    alert(data.message || 'Gagal membalas pesan.');
                }
            } catch (err) {
                console.error('Error sending quick reply:', err);
            } finally {
                btn.disabled = false;
            }
        }

        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        }

        async function checkWAStatus() {
            try {
                const res = await fetch('/whatsapp/status');
                const data = await res.json();

                const badge = document.getElementById('statusBadge');
                const dot = document.getElementById('statusDot');
                const text = document.getElementById('statusText');

                const infoConnected = document.getElementById('infoConnected');
                const infoLoggedIn = document.getElementById('infoLoggedIn');
                const infoJID = document.getElementById('infoJID');

                badge.classList.remove('hidden');

                if (data.logged_in) {
                    dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-glow-green";
                    text.innerText = "WA Online";
                    text.className = "text-emerald-400 font-semibold";
                    
                    if (infoConnected) {
                        infoConnected.innerText = "Online";
                        infoConnected.className = "font-semibold text-emerald-400";
                        infoLoggedIn.innerText = "Logged In";
                        infoLoggedIn.className = "font-semibold text-emerald-400";
                        infoJID.innerText = data.jid || 'Connected';
                    }
                } else {
                    dot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
                    text.innerText = "Offline";
                    text.className = "text-red-400 font-semibold";
                }
            } catch (err) {
                console.error('Status check error:', err);
            }
        }

        function openLoginModal() {
            const modal = document.getElementById('loginModal');
            modal.classList.remove('hidden');
        }

        function closeLoginModal() {
            document.getElementById('loginModal').classList.add('hidden');
        }

        async function handleFormSubmit(event) {
            event.preventDefault();
            const btnSubmit = document.getElementById('btnSubmit');
            const btnSubmitText = document.getElementById('btnSubmitText');
            const form = event.target;

            btnSubmit.disabled = true;
            btnSubmitText.innerText = 'Memproses...';

            try {
                const formData = new FormData(form);
                const res = await fetch('/kirim-pesan', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    }
                });

                const data = await res.json();
                if (res.ok && data.status === 'success') {
                    alert(data.message || 'Pesan berhasil dikirim!');
                    document.getElementById('pesanInput').value = '';
                    loadChatList();
                } else {
                    alert(data.message || 'Gagal mengirim pesan.');
                }
            } catch (err) {
                alert('Terjadi kesalahan koneksi.');
            } finally {
                btnSubmit.disabled = false;
                btnSubmitText.innerText = 'Kirim Pesan WhatsApp';
            }
        }
    </script>
</body>
</html>
