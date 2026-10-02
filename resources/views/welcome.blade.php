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

    @include('partials.workspace-nav')

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

    @vite(['resources/css/app.css', 'resources/js/app.js'])
</body>
</html>
