
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
                    requestQRCode();
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

        async function requestQRCode(attempt = 0) {
            try {
                const response = await fetch('/api/v1/whatsapp/qr', {
                    headers: { 'Accept': 'image/png, application/json' },
                    cache: 'no-store',
                });

                if (response.ok && response.headers.get('content-type')?.includes('image/png')) {
                    const blob = await response.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    const container = document.getElementById('qrCanvasContainer');
                    const placeholder = document.getElementById('qrPlaceholder');
                    const qrStatusText = document.getElementById('qrStatusText');

                    placeholder.classList.add('hidden');
                    container.innerHTML = `<img src="${imageUrl}" alt="WhatsApp QR Code" class="h-[220px] w-[220px]">`;
                    qrStatusText.innerText = 'QR Code Siap Discan';
                    return;
                }

                if (attempt < 10) {
                    window.setTimeout(() => requestQRCode(attempt + 1), 1000);
                }
            } catch (error) {
                if (attempt < 10) {
                    window.setTimeout(() => requestQRCode(attempt + 1), 1000);
                }
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
                const res = await fetch('/api/v1/whatsapp/chats');
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
                const res = await fetch(`/api/v1/whatsapp/messages?jid=${encodeURIComponent(activeJID)}`);
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

                const res = await fetch('/api/v1/whatsapp/messages', {
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
                const res = await fetch('/api/v1/whatsapp/status');
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
            requestQRCode();
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
                const res = await fetch('/api/v1/whatsapp/messages', {
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

Object.assign(window, {
    switchTab,
    loadChatList,
    filterChatList,
    selectChat,
    handleQuickReplyKey,
    sendQuickReply,
    checkWAStatus,
    openLoginModal,
    closeLoginModal,
    handleFormSubmit,
});
