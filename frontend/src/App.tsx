import { NavLink, Route, Routes } from 'react-router-dom';
import { KanbanPage } from './features/kanban/KanbanPage';
import { InstagramAccountsPage } from './features/instagram/InstagramAccountsPage';
import { WhatsAppPage } from './features/whatsapp/WhatsAppPage';

const navigation = [
    { to: '/', label: 'WhatsApp' },
    { to: '/kanban', label: 'Kanban' },
    { to: '/instagram/accounts', label: 'Instagram' },
];

function PlaceholderPage({ title, description }: { title: string; description: string }) {
    return (
        <main>
            <p className="eyebrow">Migration foundation</p>
            <h1>{title}</h1>
            <p className="description">{description}</p>
        </main>
    );
}

export function App() {
    return (
        <div className="app-shell">
            <header className="topbar">
                <strong>HackNation</strong>
                <nav aria-label="Workspace navigation">
                    {navigation.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => (isActive ? 'active' : undefined)}
                            end={item.to === '/'}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </header>
            <Routes>
                <Route
                    path="/"
                    element={<WhatsAppPage />}
                />
                <Route
                    path="/kanban"
                    element={<KanbanPage />}
                />
                <Route
                    path="/instagram/accounts"
                    element={<InstagramAccountsPage />}
                />
            </Routes>
        </div>
    );
}
