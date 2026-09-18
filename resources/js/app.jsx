import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    Activity,
    Bot,
    Check,
    ChevronRight,
    CircleUserRound,
    Download,
    HelpCircle,
    Instagram,
    Layers3,
    MessageCircle,
    MessageSquare,
    Package,
    Pencil,
    Play,
    Plus,
    Trash2,
    Bell,
    RefreshCw,
    Search,
    ShoppingBag,
    SlidersHorizontal,
    Sparkles,
    Tags,
    ArrowDownUp,
    BotMessageSquare,
    Paperclip,
    PauseCircle,
    Send,
    TriangleAlert,
} from 'lucide-react';
import '../css/app.css';

const activities = [
    { type: 'Shopee', icon: Tags, color: 'blue', text: 'dm dari follower A bertanya tentang stok produk', time: '2m ago' },
    { type: 'WhatsApp', icon: MessageCircle, color: 'green', text: 'dm dari nomor Siti Rahma bertanya tentang harga', time: '8m ago' },
    { type: 'Instagram', icon: MessageSquare, color: 'blue', text: 'dm dari account A bertanya tentang katalog', time: '14m ago' },
    { type: 'Message Failed', icon: Activity, color: 'red', text: <>Failed to dm account A on <strong className="font-semibold text-red-400">Instagram</strong></>, time: '20m ago' },
    { type: 'AI TokoPilot', icon: RefreshCw, color: 'blue', text: 'Start to activity messaging all dm one by one', time: '42m ago' },
];

const channels = [
    { name: 'Instagram', icon: Instagram, synced: 'Synced 2m ago' },
    { name: 'WhatsApp', icon: MessageCircle, synced: 'Synced 4m ago' },
];

const conversations = [
    { name: 'Siti Rahma', initials: 'SR', phone: '+62 813-2940-1122', message: 'Bisa minta diskon Batik Biru jadi 110rb untuk beli 5 pcs? Kalau boleh langsung transfer...', time: '12:34', status: 'attention', tag: 'Penawaran melebihi batas kebijakan 15% — menunggu respon owner', unread: true },
    { name: 'Budi Santoso', initials: 'BS', phone: '+62 811-9022-3344', message: 'Pesanan #ORD-10231 sudah dikirimkan dengan Resi JNE: JNE88291024. Estimasi tiba besok.', time: '12:28', status: 'ai' },
    { name: 'Hendra Wijaya', initials: 'HW', phone: '+62 857-1188-4455', message: 'Stok Kopi Arabica Gayo 250g tersedia dan siap dikirim hari ini ya kak!', time: '12:15', status: 'ai' },
    { name: 'Dewi Lestari', initials: 'DL', phone: '+62 812-3456-7890', message: 'Kak, mau tanya apakah bisa custom motif batik untuk seragam kantor 50 pcs?', time: '11:50', status: 'attention', tag: 'Pertanyaan custom order diluar katalog standar', unread: true },
    { name: 'Rian Fauzi', initials: 'RF', phone: '+62 878-9900-1122', message: 'Baik mas Hendra (Owner), saya transfer via BCA ya.', time: '10:45', status: 'paused' },
    { name: 'Maya Anggraini', initials: 'MA', phone: '+62 819-2233-4455', message: 'Format pemesanan sudah diterima. Total pembayaran Rp 175.000.', time: '09:30', status: 'ai' },
];

const conversationMessages = [
    { side: 'customer', label: 'Siti Rahma (Pembeli)', time: '12:20', text: 'Halo kak, Batik Biru Pekalongan ukuran L masih ada stoknya?' },
    { side: 'ai', time: '12:21', text: 'Halo Kak Siti! Batik Biru Pekalongan ukuran L masih tersedia 14 pcs siap kirim hari ini ya kak 😉 Harga normal Rp 145.000 / pcs dengan jaminan bahan katun primisima halus.' },
    { side: 'customer', label: 'Siti Rahma (Pembeli)', time: '12:25', text: 'Kalau ambil 5 pcs bisa dapat Rp 110.000 per pcs nggak kak? Sekalian buat seragam arisan.' },
    { side: 'alert', text: 'TokoPilot mendeteksi tawaran diskon Rp 110.000 (24.1%), melebihi batas toleransi toko (maks. 15%). AI menahan respon otomatis dan mengalihkan kendali penuh ke Owner.' },
    { side: 'owner', time: '12:30', text: 'Halo Bu Siti, untuk pembelian 5 pcs Batik Biru kami bisa kasih harga spesial grosir Rp 125.000 per pcs dan gratis ongkir se-Jawa. Bagaimana bu?' },
    { side: 'customer', label: 'Siti Rahma (Pembeli)', time: '12:32', text: 'Wah boleh kak! Total jadi berapa ya?' },
    { side: 'customer', label: 'Siti Rahma', time: '12:33', text: 'Bisa minta nomor rekening BCA tokonya?' },
];

function App() {
    const [activePage, setActivePage] = useState('Overview');
    const [lastUpdated, setLastUpdated] = useState('just now');
    const [notice, setNotice] = useState('');

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    }, []);

    const showNotice = (message) => {
        setNotice(message);
        window.setTimeout(() => setNotice(''), 2500);
    };

    const refreshDashboard = () => {
        setLastUpdated('just now');
        showNotice('Dashboard data refreshed (demo mode)');
    };

    return (
        <div className="min-h-screen flex bg-[#070c18] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
            <aside className="hidden md:flex w-[280px] bg-[#080d1a] border-r border-[#151f33] flex-col justify-between p-6 shrink-0 min-h-screen">
                <div className="space-y-8">
                    <div className="flex items-center gap-3 px-2 pt-2">
                        <div className="w-8 h-8 rounded-lg bg-[#122b2b] flex items-center justify-center text-emerald-400">
                            <Layers3 className="w-5 h-5" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">TokoPilot</span>
                    </div>

                    <nav className="space-y-2">
                        <NavItem label="Overview" active={activePage === 'Overview'} onClick={() => setActivePage('Overview')} icon={Activity} />
                        <NavItem label="Checking DM Chat" active={activePage === 'Checking DM Chat'} onClick={() => setActivePage('Checking DM Chat')} icon={MessageSquare} />
                        <div className="py-2"><hr className="border-t border-[#162136]" /></div>
                        <NavItem label="AI Settings" active={activePage === 'AI Settings'} onClick={() => setActivePage('AI Settings')} icon={Bot} />
                    </nav>
                </div>

                <div className="pt-6 border-t border-[#162136] px-2 space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase">Agent Active</span>
                    </div>
                    <p className="text-sm text-slate-400">Toko Batik &amp; Kopi</p>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                <header className="h-16 border-b border-[#151f33] px-5 md:px-8 flex items-center justify-between bg-[#070c18]">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span className="text-slate-300 font-medium text-xs md:text-sm">UMKM Commerce Cockpit</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111c30] border border-[#1d2b45] text-xs font-medium text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Toko Batik &amp; Kopi Nusantara</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#a3b1fa] text-[#070c18] flex items-center justify-center font-bold text-sm">
                            <CircleUserRound className="w-4 h-4 text-slate-800" />
                        </div>
                    </div>
                </header>

                <div className="p-5 md:p-8 max-w-7xl w-full mx-auto space-y-6">
                    {activePage === 'Checking DM Chat' ? (
                        <CheckingDMPage showNotice={showNotice} />
                    ) : activePage === 'AI Settings' ? (
                        <AISettingsPage showNotice={showNotice} />
                    ) : (
                    <>
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-slate-300 uppercase rounded-full bg-[#121c2e] border border-[#1f2e4a]">Today, 24 Oct</span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#2cdb98] rounded-full bg-[#0d2a2a] border border-[#15463f]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2cdb98]" />Agent Active
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{greeting}, Toko Batik &amp; Kopi</h1>
                        <p className="text-slate-400 text-sm">Here&apos;s what TokoPilot has handled for your store today.</p>
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <MetricCard label="Pesan chat yang diterima hari ini" value="128" detail="+12 today" icon={ShoppingBag} />
                        <MetricCard label="Total jumlah pesan pada 1 minggu ini" value="42 active" detail="All in sync" icon={Package} />
                    </section>

                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        <div className="lg:col-span-8 bg-[#0e1728] border border-[#18253b] rounded-2xl p-5 md:p-6">
                            <div className="flex items-start justify-between mb-5">
                                <div>
                                    <h2 className="text-base font-bold text-white tracking-tight">Recent Activity</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Automated actions executed by TokoPilot without needing manual intervention</p>
                                </div>
                                <button onClick={() => showNotice('History view is available in the next showcase module')} className="text-xs font-medium text-[#7d87f5] hover:text-[#97a0ff] inline-flex items-center gap-1 shrink-0 ml-4 transition-colors">
                                    <span className="hidden sm:inline">Go to see History AI</span><ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                {activities.map((activity) => <ActivityRow key={`${activity.type}-${activity.time}`} activity={activity} />)}
                            </div>
                        </div>

                        <div className="lg:col-span-4 bg-[#0e1728] border border-[#18253b] rounded-2xl p-5 md:p-6 flex flex-col justify-between">
                            <div>
                                <h2 className="text-base font-bold text-white tracking-tight">Channel Status</h2>
                                <p className="text-xs text-slate-400 mt-0.5 mb-5">Real-time sync connections</p>
                                <div className="space-y-3">
                                    {channels.map((channel) => <ChannelRow key={channel.name} channel={channel} />)}
                                </div>
                            </div>
                            <button onClick={() => showNotice('Channel management is in demo mode')} className="mt-6 w-full py-2.5 px-4 bg-[#111c30] hover:bg-[#16243d] border border-[#1c2b45] text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all">
                                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />Manage Channels
                            </button>
                        </div>
                    </section>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Showcase mode · Dummy data only · Laravel backend preserved</span>
                        <button onClick={refreshDashboard} className="inline-flex items-center gap-1.5 hover:text-slate-300"><RefreshCw className="w-3 h-3" />Updated {lastUpdated}</button>
                    </div>
                    </>
                    )}
                </div>
            </main>

            {notice && <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-[#2c3d62] bg-[#111c30] px-4 py-3 text-xs text-slate-200 shadow-2xl">{notice}</div>}
        </div>
    );
}

const defaultFaqs = [
    { category: 'LOGISTIK', question: 'Berapa lama estimasi pengiriman dan kurir apa saja?', answer: 'Pengiriman dari Pekalongan via JNE, J&T, dan SiCepat. Pesanan sebelum jam 15.00 dikirim hari yang sama. Estimasi Jawa 1–2 hari, luar Jawa 2–4 hari.' },
    { category: 'CUSTOM ORDER', question: 'Apakah melayani pesanan seragam batik / custom motif?', answer: 'Bisa untuk minimal order 20 pcs. Namun perlu konfirmasi motif & waktu pengerjaan 14 hari langsung dengan owner via chat ini.' },
    { category: 'PEMBAYARAN', question: 'Nomor rekening resmi toko untuk transfer pembayaran?', answer: 'BCA: 8820-192-441 a.n. Toko Batik Nusantara. Selalu pastikan nama penerima sesuai sebelum transfer.' },
    { category: 'PRODUK', question: 'Apakah bahan batik luntur saat dicuci pertama kali?', answer: 'Kain katun primisima kami menggunakan pewarna reaktif berkualitas tinggi, tidak luntur. Disarankan cuci terpisah untuk bilasan pertama.' },
];

function AISettingsPage({ showNotice }) {
    const [discount, setDiscount] = useState('15');
    const [margin, setMargin] = useState('25');
    const [minimumPurchase, setMinimumPurchase] = useState('3');
    const [largeTransactionEscalation, setLargeTransactionEscalation] = useState(true);
    const [faqs, setFaqs] = useState(defaultFaqs);

    const resetDefaults = () => {
        setDiscount('15');
        setMargin('25');
        setMinimumPurchase('3');
        setLargeTransactionEscalation(true);
        setFaqs(defaultFaqs);
        showNotice('Aturan dikembalikan ke default');
    };

    const addFaq = () => {
        setFaqs((current) => [...current, {
            category: 'BARU',
            question: 'Pertanyaan FAQ baru',
            answer: 'Tambahkan jawaban standar yang ingin digunakan oleh TokoPilot AI.',
        }]);
        showNotice('FAQ baru ditambahkan (demo)');
    };

    const removeFaq = (index) => {
        setFaqs((current) => current.filter((_, faqIndex) => faqIndex !== index));
        showNotice('FAQ dihapus (demo)');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="text-[11px] font-mono tracking-wider font-semibold text-slate-400 uppercase">Pengaturan Otomasi / <span className="text-slate-300">AI Settings</span></div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Aturan AI &amp; Batasan Negosiasi</h1>
                    <p className="text-xs text-slate-400">Kendali penuh atas apa yang boleh dijawab dan disepakati oleh TokoPilot AI secara mandiri tanpa perlu koding.</p>
                </div>
                <button onClick={() => showNotice('Demo event dipicu — tidak ada pesan eksternal dikirim')} className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-[#0d131d] hover:bg-[#172030] border border-[#1b2533] rounded-lg text-xs font-medium text-slate-200"><Play className="w-3.5 h-3.5 text-emerald-400" />Trigger Demo Event</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <section className="lg:col-span-5 bg-[#0d131d] border border-[#1b2533] rounded-xl p-5 space-y-5">
                    <div>
                        <div className="flex items-center gap-2 text-white font-semibold text-sm"><TriangleAlert className="w-4 h-4 text-slate-300" /><h2>Batas &amp; Parameter Negosiasi</h2></div>
                        <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">TokoPilot akan menolak otomatis tawaran pembeli yang melebihi batas ini dan mengeskalasikan ke owner.</p>
                    </div>
                    <SettingNumber label="Diskon Maksimal Otomatis" hint="Batas wajar: 1% - 50%" value={discount} setValue={setDiscount} unit="%" description="Tawaran diskon hingga 15% dapat disetujui AI jika kuantiti memenuhi syarat." />
                    <SettingNumber label="Margin Bersih Minimal (Margin Floor)" hint="Safety lock active" value={margin} setValue={setMargin} unit="%" description="AI tidak akan pernah menjual produk di bawah margin keuntungan 25% dari HPP." safe />
                    <SettingNumber label="Minimal Pembelian untuk Diskon" value={minimumPurchase} setValue={setMinimumPurchase} unit="pcs" />
                    <div className="p-3 bg-[#080d14] rounded-xl border border-[#1b2533] flex items-center justify-between gap-3">
                        <div><h3 className="text-xs font-semibold text-slate-200">Eskalasi Transaksi Besar</h3><p className="text-[11px] text-slate-400 mt-0.5">Wajib eskalasi ke owner jika nilai transaksi di atas Rp 1.000.000.</p></div>
                        <Toggle enabled={largeTransactionEscalation} onClick={() => setLargeTransactionEscalation((value) => !value)} />
                    </div>
                </section>

                <section className="lg:col-span-7 bg-[#0d131d] border border-[#1b2533] rounded-xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-1">
                        <div><div className="flex items-center gap-2 text-white font-semibold text-sm"><MessageSquare className="w-4 h-4 text-slate-300" /><h2>Basis Pengetahuan Toko &amp; FAQ</h2></div><p className="mt-1 text-[11px] text-slate-400">Jawaban standar yang digunakan AI saat pembeli bertanya hal umum tentang toko Anda.</p></div>
                        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0"><span className="text-[11px] font-mono text-slate-400">{faqs.length} Pertanyaan Aktif</span><button onClick={addFaq} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#5e6ad2]/20 hover:bg-[#5e6ad2]/30 border border-[#5e6ad2]/40 text-[#dcdffc] rounded-lg text-xs font-semibold"><Plus className="w-3.5 h-3.5" />Tambah FAQ</button></div>
                    </div>
                    <div className="space-y-2.5">
                        {faqs.map((faq, index) => <FaqCard key={`${faq.category}-${index}`} faq={faq} onEdit={() => showNotice('Editor FAQ tersedia pada integrasi berikutnya')} onRemove={() => removeFaq(index)} />)}
                    </div>
                    <div className="mt-4 p-3.5 rounded-lg bg-[#080d14]/80 border border-[#1b2533] flex items-start gap-3"><HelpCircle className="w-4 h-4 text-slate-400 mt-0.5" /><div className="space-y-1"><h5 className="text-xs font-semibold text-slate-200">Protokol Fallback Mandiri</h5><p className="text-[11px] text-slate-400 leading-relaxed">Jika pertanyaan pembeli tidak cocok dengan FAQ di atas, TokoPilot akan menggunakan fallback default sopan dan memberi tahu bahwa owner akan segera mengonfirmasi secara personal.</p></div></div>
                </section>
            </div>

            <footer className="bg-[#0d131d] border border-[#1b2533] rounded-xl px-5 py-3.5 flex items-center justify-between">
                <button onClick={resetDefaults} className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-[#172030]">Reset ke Default</button>
                <button onClick={() => showNotice('Aturan AI berhasil disimpan (demo)')} className="inline-flex items-center gap-2 px-4 py-2 bg-[#5e6ad2] hover:bg-[#525dc0] text-white rounded-lg text-xs font-semibold shadow"><Check className="w-4 h-4" />Simpan Aturan &amp; Terapkan</button>
            </footer>
        </div>
    );
}

function SettingNumber({ label, hint, value, setValue, unit, description, safe }) {
    return <div className="space-y-1.5"><div className="flex justify-between items-center text-xs"><label className="font-medium text-slate-200">{label}</label>{hint && <span className={`text-[10px] font-mono ${safe ? 'text-emerald-400' : 'text-slate-400'}`}>{hint}</span>}</div><div className="relative rounded-lg bg-[#080d14] border border-[#243245] focus-within:border-[#5e6ad2]"><input type="number" value={value} onChange={(event) => setValue(event.target.value)} className="w-full bg-transparent text-sm font-medium text-white px-3 py-2 pr-10 focus:outline-none border-0" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">{unit}</span></div>{description && <p className="text-[11px] text-slate-400">{description}</p>}</div>;
}

function Toggle({ enabled, onClick }) {
    return <button aria-pressed={enabled} onClick={onClick} className={`w-10 h-6 rounded-full p-0.5 transition-colors relative flex items-center shrink-0 ${enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}><span className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform block ${enabled ? 'translate-x-4' : 'translate-x-0'}`} /></button>;
}

function FaqCard({ faq, onEdit, onRemove }) {
    return <div className="bg-[#080d14] border border-[#1b2533] rounded-lg p-3.5 space-y-2"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-2 min-w-0"><span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase bg-[#111824] text-slate-400 border border-[#243245] shrink-0">{faq.category}</span><h4 className="text-xs font-bold text-slate-100">{faq.question}</h4></div><div className="flex items-center gap-2 text-slate-500 shrink-0"><button onClick={onEdit} className="hover:text-slate-300" title="Edit FAQ"><Pencil className="w-3.5 h-3.5" /></button><button onClick={onRemove} className="hover:text-red-400" title="Hapus FAQ"><Trash2 className="w-3.5 h-3.5" /></button></div></div><p className="text-xs text-slate-400 leading-relaxed">{faq.answer}</p></div>;
}

function CheckingDMPage({ showNotice }) {
    const [channel, setChannel] = useState('WhatsApp');
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [sortNewest, setSortNewest] = useState(true);
    const [selectedConversation, setSelectedConversation] = useState(null);

    const filteredConversations = useMemo(() => {
        const result = conversations.filter((conversation) => {
            const matchesChannel = channel === 'WhatsApp';
            const matchesFilter = filter === 'all'
                || (filter === 'attention' && conversation.status === 'attention')
                || (filter === 'ai' && conversation.status === 'ai');
            const haystack = `${conversation.name} ${conversation.phone} ${conversation.message}`.toLowerCase();
            return matchesChannel && matchesFilter && haystack.includes(search.toLowerCase());
        });
        return sortNewest ? result : [...result].reverse();
    }, [channel, filter, search, sortNewest]);

    if (selectedConversation) {
        return <ConversationModal
            conversation={selectedConversation}
            close={() => setSelectedConversation(null)}
            showNotice={showNotice}
        />;
    }

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold text-white tracking-tight">WhatsApp Inbox</h1>
                        <ChannelPill active={channel === 'WhatsApp'} onClick={() => setChannel('WhatsApp')} label="WhatsApp" count="18" icon={MessageCircle} />
                        <ChannelPill active={channel === 'Instagram'} onClick={() => { setChannel('Instagram'); showNotice('Instagram DM demo akan tersedia berikutnya'); }} label="Instagram DM" count="14" icon={Instagram} />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Pantau semua obrolan pelanggan dan status penanganan autopilot.</p>
                </div>
                <div className="bg-[#121927] border border-slate-800/70 rounded-xl px-4 py-2 flex items-center gap-3 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-400"><MessageCircle className="w-4 h-4" /></div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-xs"><span className="flex items-center gap-1 font-medium text-slate-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />WhatsApp Business</span><span className="flex items-center gap-1 text-emerald-400 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Terhubung</span></div>
                        <span className="text-xs text-slate-400 mt-0.5 font-mono">+62 812-8899-7700</span>
                    </div>
                </div>
            </div>

            <div className="bg-[#101726] border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs text-slate-300 shadow-sm">
                <div className="flex items-center gap-2.5"><BotMessageSquare className="w-4 h-4 text-slate-400" /><span>Autopilot Aktif: <strong className="font-semibold text-slate-200">83% percakapan hari ini ditangani mandiri tanpa intervensi manual.</strong></span></div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium"><Check className="w-3.5 h-3.5" /><span>Latency respon rata-rata: 2.1 detik</span></div>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                    <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} label="Semua" count="18" />
                    <FilterPill active={filter === 'attention'} onClick={() => setFilter('attention')} label="Perlu Perhatian" count="3" danger />
                    <FilterPill active={filter === 'ai'} onClick={() => setFilter('ai')} label="Dijawab AI" count="15" />
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="relative flex-1 md:w-72"><Search className="absolute inset-y-0 left-0 my-auto ml-3 w-3.5 h-3.5 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-[#121927] border border-slate-800/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" placeholder="Cari nama pembeli, nomor HP, atau pesan..." /></div>
                    <button onClick={() => setSortNewest((value) => !value)} className="bg-[#121927] border border-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap"><ArrowDownUp className="w-3.5 h-3.5 text-slate-400" />Urutkan: {sortNewest ? 'Terbaru' : 'Terlama'}</button>
                </div>
            </div>

            <div className="space-y-2.5">
                {filteredConversations.map((conversation) => <ConversationCard key={conversation.name} conversation={conversation} onClick={() => setSelectedConversation(conversation)} />)}
                {!filteredConversations.length && <div className="bg-[#101726] border border-slate-800/80 rounded-xl p-8 text-center text-sm text-slate-400">Tidak ada percakapan yang cocok.</div>}
            </div>

            <footer className="bg-[#101726] border border-slate-800/80 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 mt-1">
                <div className="flex items-center gap-2.5 text-xs text-slate-300"><Activity className="w-4 h-4 text-slate-400 shrink-0" /><p>Total 18 percakapan aktif hari ini • <span className="text-emerald-400 font-medium">15 selesai otomatis</span> oleh TokoPilot AI • <span className="text-rose-400 font-medium">3 memerlukan konfirmasi</span> Anda</p></div>
                <button onClick={() => showNotice('Log harian berhasil disiapkan (demo)')} className="shrink-0 bg-[#162032] hover:bg-slate-700/60 border border-slate-700/60 text-slate-200 text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-2"><Download className="w-3.5 h-3.5" />Download Log Harian</button>
            </footer>
        </>
    );
}

function ConversationModal({ conversation, close, showNotice }) {
    const [draft, setDraft] = useState('');
    const [messages, setMessages] = useState(conversation.name === 'Siti Rahma' ? conversationMessages : [
        { side: 'customer', label: `${conversation.name} (Pembeli)`, time: conversation.time, text: conversation.message },
    ]);

    const sendReply = () => {
        const text = draft.trim();
        if (!text) return;
        setMessages((current) => [...current, { side: 'owner', time: '12:36', text }]);
        setDraft('');
        showNotice('Pesan terkirim (demo mode)');
    };

    return <div className="fixed inset-y-0 left-0 right-0 md:left-[280px] z-40 h-screen bg-[#070c18] text-slate-200 flex overflow-hidden font-sans">
        <aside className="hidden">
            <div><div className="h-14 px-5 flex items-center gap-2.5"><Layers3 className="w-6 h-6 text-emerald-400" /><span className="font-bold text-white tracking-tight text-lg">TokoPilot</span></div><nav className="px-3 py-3 space-y-1.5 text-sm"><button onClick={close} className="block w-full text-left px-3 py-2 text-slate-400 hover:text-slate-200 font-medium">Overview</button><button className="block w-full text-left px-3.5 py-2 bg-[#6172e8] text-white font-medium rounded-lg">Checking DM Chat</button><div className="pt-2 pb-1 px-3"><div className="border-t border-[#162236]" /></div><button onClick={() => showNotice('AI Settings demo')} className="block w-full text-left px-3 py-2 text-slate-400 hover:text-slate-200 font-medium">AI Settings</button></nav></div>
            <div className="p-4 border-t border-[#121c2e]/60"><div className="flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span><span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase">Agent Active</span></div><p className="text-xs text-slate-300 font-medium mt-1">Toko Batik &amp; Kopi</p></div>
        </aside>
        <main className="flex-1 flex flex-col min-w-0 bg-[#070c18] overflow-hidden">
            <header className="h-14 border-b border-[#121c2e] px-6 flex items-center justify-between shrink-0"><div className="flex items-center gap-2 text-slate-300 text-sm font-medium"><Sparkles className="w-4 h-4 text-emerald-400" /><span className="text-slate-200 text-xs">UMKM Commerce Cockpit</span></div><div className="flex items-center gap-3"><div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0d1728] border border-[#1b283f] text-xs text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /><span className="text-[12px]">Toko Batik &amp; Kopi Nusantara</span></div><CircleUserRound className="w-8 h-8 p-1.5 rounded-full bg-[#1e293b] border border-[#2b3a51] text-slate-300" /></div></header>
            <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden min-h-0">
                <section className="mb-5 shrink-0"><div className="flex items-center gap-2.5"><h1 className="text-xl font-bold text-white tracking-tight">WhatsApp Live Inbox</h1><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-[#0d2222] text-emerald-400 border border-emerald-800/40 uppercase"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Cloud API Connected</span></div><p className="text-xs text-slate-400 mt-1">Kelola dialog pelanggan secara otonom atau lakukan intervensi manual tanpa jeda sesi.</p><div className="flex items-center gap-3 mt-3"><InboxMetric label="AI Handling" value="94.2%" icon={BotMessageSquare} green /><InboxMetric label="Eskalasi Manual" value="3 Chat" icon={TriangleAlert} /></div></section>
                <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                    <aside className="hidden lg:flex w-80 flex-col bg-[#09101c] rounded-xl border border-[#152135] overflow-hidden shrink-0">
                        <div className="p-3 border-b border-[#152135]/60">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                <input className="w-full bg-[#050912] text-xs text-slate-200 placeholder-slate-500 rounded-lg pl-8 pr-3 py-2 border border-[#18263c] focus:outline-none focus:border-indigo-500" placeholder="Cari nomor, nama pelanggan..." />
                            </div>
                            <div className="flex items-center gap-1.5 mt-2.5 text-xs">
                                <button className="px-3 py-1 rounded text-slate-400 text-[11px]">Semua</button>
                                <button className="px-2.5 py-0.5 rounded-full bg-[#2a131b] text-rose-300 text-[11px] border border-rose-900/50">Perhatian <span className="bg-rose-500 text-white rounded-full px-1">3</span></button>
                                <button className="px-3 py-1 rounded text-slate-400 text-[11px]">Otonom</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-[#152135]/40">
                            {conversations.map((item) => <button key={item.name} onClick={() => item.name === conversation.name ? null : showNotice(`Membuka ${item.name} (demo)`)} className={`w-full p-3 text-left hover:bg-[#0d1728] ${item.name === conversation.name ? 'bg-[#111a2c]/60 border-l-2 border-indigo-500' : ''}`}>
                                <div className="flex items-start gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-[#1a2538] text-slate-300 text-xs font-semibold flex items-center justify-center shrink-0">{item.initials}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between"><span className="text-xs font-semibold text-white truncate">{item.name}</span><span className="text-[10px] text-slate-400">{item.time}</span></div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">{item.phone}</div>
                                        <div className="text-xs text-slate-300 truncate mt-1">{item.message}</div>
                                        <div className="mt-2 text-[10px]">{item.status === 'attention' ? <span className="text-rose-300">↗ Nego Ekstrem (-24%)</span> : item.status === 'paused' ? <span className="text-slate-400">AI Dijeda (Manual)</span> : <span className="text-emerald-400">✓ AI Dijawab Otomatis</span>}</div>
                                    </div>
                                </div>
                            </button>)}
                        </div>
                    </aside>
                    <section className="flex-1 flex flex-col bg-[#09101c] rounded-xl border border-[#152135] overflow-hidden min-w-0"><header className="p-3.5 border-b border-[#152135] flex items-center justify-between bg-[#0b1220]/70 shrink-0"><div className="flex items-center gap-3"><div className="relative"><div className="w-9 h-9 rounded-full bg-rose-600/90 text-white font-bold text-xs flex items-center justify-center">{conversation.initials}</div><span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0b1220]" /></div><div><div className="text-sm font-bold text-white leading-tight">{conversation.name}</div><div className="text-xs text-slate-400 mt-0.5">{conversation.phone}</div></div></div><div className="flex items-center gap-2"><span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#2a131b] text-rose-300 border border-rose-900/50"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Eskalasi Nego</span><span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0f2520] text-emerald-400 border border-emerald-800/40"><MessageCircle className="w-3.5 h-3.5" />WhatsApp</span></div></header><div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs"><div className="flex justify-center my-1"><span className="px-3 py-0.5 rounded-full bg-[#101a2d] text-slate-400 text-[11px] border border-[#19263e]">Hari ini, 24 Oktober 2024</span></div>{messages.map((message, index) => <MessageLog key={`${message.time}-${index}`} message={message} />)}<div className="flex items-center justify-center my-3 text-[11px] text-slate-400"><span className="flex items-center gap-1.5 bg-[#0f1827] px-3 py-1 rounded-full border border-[#1a283e]"><PauseCircle className="w-3.5 h-3.5" />TokoPilot AI dijeda — Menunggu balasan manual Anda...</span></div></div><footer className="p-3 bg-[#080e1a] border-t border-[#152135]"><div className="flex items-center justify-between px-2.5 pb-2 text-[11px]"><div className="flex items-center gap-1.5 text-emerald-400 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="hidden md:inline">Mode Manual Aktif — Anda sedang membalas langsung pelanggan via WhatsApp Cloud API.</span></div><button onClick={() => showNotice('AI diaktifkan kembali (demo)')} className="text-slate-400 hover:text-white transition font-medium text-xs">Kembalikan ke AI</button></div><div className="bg-[#0b1220] rounded-xl border border-[#1a283e] p-2 flex items-center gap-2"><button onClick={() => showNotice('Lampiran tersedia pada integrasi berikutnya')} className="p-1.5 text-slate-400 hover:text-slate-200"><Paperclip className="w-4 h-4" /></button><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendReply()} className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-400 focus:outline-none border-0 px-1 py-1" placeholder={`Ketik balasan manual ke ${conversation.name}...`} /><button onClick={sendReply} className="flex items-center gap-1.5 px-4 py-2 bg-[#6172e8] hover:bg-[#5263d9] text-white text-xs font-semibold rounded-lg shadow"><span>Kirim Pesan</span><Send className="w-3.5 h-3.5" /></button></div></footer></section>
                </div>
            </div>
        </main>
    </div>;
}

function InboxMetric({ label, value, icon: Icon, green = false }) {
    return <div className="flex items-center gap-3 px-3.5 py-2 rounded-lg bg-[#0b1220] border border-[#152033]"><div className={`w-7 h-7 rounded-md flex items-center justify-center ${green ? 'bg-emerald-950/60 border border-emerald-700/40 text-emerald-400' : 'bg-rose-950/60 border border-rose-700/40 text-rose-400'}`}><Icon className="w-4 h-4" /></div><div><div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</div><div className="text-base font-bold text-white tracking-tight leading-none mt-0.5">{value}</div></div></div>;
}

function MessageLog({ message }) {
    if (message.side === 'alert') return <div className="w-full my-2 bg-[#221019] border border-rose-900/60 rounded-xl p-3 flex items-start gap-3"><TriangleAlert className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" /><div><div className="flex items-center gap-2"><span className="font-bold text-rose-300 text-xs tracking-wide uppercase">AI Guardrail Truncated</span><span className="bg-rose-950 text-rose-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-800/60">-24.1% Tawaran</span></div><p className="text-[11px] text-rose-200/90 leading-normal mt-1">{message.text}</p></div></div>;
    const outgoing = message.side === 'ai' || message.side === 'owner';
    return <div className={`flex flex-col ${outgoing ? 'items-end ml-auto' : 'items-start'} max-w-lg`}><span className={`text-[11px] mb-1 ${outgoing ? 'mr-1' : 'ml-1'} text-slate-400`}>{outgoing ? <><span className={`${message.side === 'ai' ? 'bg-[#1e2348] text-[#9ba7ff]' : 'bg-emerald-950 text-emerald-300'} px-2 py-0.5 rounded text-[10px] font-semibold mr-1.5`}>{message.side === 'ai' ? 'TokoPilot AI' : 'Hendra (Owner)'}</span>{message.time} • {message.side === 'ai' ? 'Otomatis' : 'Manual Takeover'}</> : <>{message.label} <span>{message.time}</span></>}</span><div className={`${outgoing ? 'bg-[#121a2d] border-[#233352]' : 'bg-[#131d2f] border-[#1d2b42]'} text-slate-200 px-4 py-2.5 rounded-2xl ${outgoing ? 'rounded-tr-sm' : 'rounded-tl-sm'} border shadow-sm leading-relaxed`}>{message.text}</div></div>;
}

function ChannelPill({ active, onClick, label, count, icon: Icon }) {
    return <button onClick={onClick} className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition ${active ? 'bg-[#5364d9] text-white shadow-sm' : 'bg-transparent border border-slate-700/60 text-slate-300 hover:bg-slate-800/40'}`}><Icon className="w-3.5 h-3.5" /><span>{label}</span><span className="text-[11px] opacity-80">({count})</span></button>;
}

function FilterPill({ active, onClick, label, count, danger = false }) {
    return <button onClick={onClick} className={`${active ? 'bg-[#5364d9] text-white' : 'text-slate-300 hover:bg-slate-800/40'} text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition`}><span>{label}</span><span className={danger ? 'bg-rose-700 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center' : 'text-xs text-slate-500 font-normal'}>{count}</span></button>;
}

function ConversationCard({ conversation, onClick }) {
    const attention = conversation.status === 'attention';
    const paused = conversation.status === 'paused';
    return <button onClick={onClick} className={`relative w-full text-left bg-[#101726] hover:bg-[#131b2c] border border-slate-800/80 rounded-xl p-4 transition duration-150 ${attention ? 'border-l-4 border-l-indigo-500' : ''}`}>
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
                <div className="relative shrink-0"><div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center text-sm font-semibold text-slate-300">{conversation.initials}</div>{conversation.unread && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-rose-500 border-2 border-[#101726] rounded-full" />}</div>
                <div className="space-y-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><h2 className="text-sm font-semibold text-white">{conversation.name}</h2><span className="text-xs text-slate-500 font-mono">{conversation.phone}</span></div><p className="text-xs text-slate-300 leading-relaxed font-normal truncate">{`“${conversation.message}”`}</p>{conversation.tag && <div className="pt-1"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e2433] border border-slate-700/50 text-[11px] text-slate-300 font-medium"><HelpCircle className="w-3 h-3 text-slate-400" />{conversation.tag}</span></div>}</div>
            </div>
            <div className="flex items-center gap-3 shrink-0"><span className="text-xs text-slate-500 font-medium">{conversation.time}</span><StatusBadge status={conversation.status} /></div>
        </div>
    </button>;
}

function StatusBadge({ status }) {
    if (status === 'attention') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#36161a] text-[#f87171] border border-red-500/20"><TriangleAlert className="w-3 h-3" />Perlu Perhatian</span>;
    if (status === 'paused') return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1e2738] text-slate-300 border border-slate-700/50"><PauseCircle className="w-3 h-3" />AI Dijeda (Manual)</span>;
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0b2920] text-[#34d399] border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />Dijawab AI</span>;
}

function NavItem({ label, active, onClick, icon: Icon }) {
    return <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left font-medium text-sm transition-colors ${active ? 'bg-[#5962e9] text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-[#10192e]'}`}><Icon className="w-4 h-4" />{label}</button>;
}

function MetricCard({ label, value, detail, icon: Icon }) {
    return <div className="bg-[#0e1728] border border-[#18253b] rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
        <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">{label}</span>
            <div className="w-8 h-8 rounded-lg bg-[#142036] flex items-center justify-center text-slate-400 border border-[#21304b]"><Icon className="w-4 h-4" /></div>
        </div>
        <div className="mt-2 space-y-1"><div className="text-3xl font-extrabold text-white tracking-tight">{value}</div><div className="flex items-center text-xs font-semibold text-emerald-400 gap-1"><Check className="w-3 h-3" /><span>{detail}</span></div></div>
    </div>;
}

function ActivityRow({ activity }) {
    const Icon = activity.icon;
    const colorStyles = {
        blue: 'bg-[#16233b] text-[#558af6]',
        green: 'bg-[#0d2a26] text-[#10b981]',
        red: 'bg-[#33181f] text-[#f87171]',
    };
    return <div className="flex items-center justify-between text-xs py-1 hover:bg-[#131d31]/50 rounded-lg px-2 -mx-2 transition-colors gap-3">
        <div className="flex items-center gap-3 min-w-0"><div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorStyles[activity.color]}`}><Icon className="w-4 h-4" /></div><div className="flex items-center gap-2 min-w-0"><span className="font-semibold text-slate-200 shrink-0">{activity.type}</span><span className={`${activity.color === 'red' ? 'text-red-300' : 'text-slate-400'} truncate`}>{activity.text}</span></div></div>
        <span className="text-slate-500 font-medium shrink-0">{activity.time}</span>
    </div>;
}

function ChannelRow({ channel }) {
    const Icon = channel.icon;
    return <div className="bg-[#121c2e] border border-[#1c2a42] rounded-xl p-3 flex items-start justify-between text-xs gap-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0"><div className="w-7 h-7 rounded-lg bg-[#17243c] flex items-center justify-center text-slate-300 shrink-0"><Icon className="w-4 h-4" /></div><span className="font-semibold text-white truncate">{channel.name}</span></div>
        <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 min-w-0 text-right"><span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[11px] whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Connected</span><span className="text-slate-500 text-[10px]">·</span><span className="text-slate-400 text-[11px] truncate max-w-[90px]">{channel.synced}</span></div>
    </div>;
}

createRoot(document.getElementById('app')).render(<App />);
