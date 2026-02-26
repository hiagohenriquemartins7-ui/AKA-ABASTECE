import React, { useState, useEffect } from 'react';
import { db } from './db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  LayoutDashboard, 
  Truck, 
  Fuel, 
  Settings, 
  Cloud, 
  CloudOff, 
  RefreshCw,
  Plus,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Building2,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { syncEngine } from './services/syncEngine';
import Dashboard from './components/Dashboard';
import EquipamentosList from './components/EquipamentosList';
import AbastecimentosList from './components/AbastecimentosList';
import AbastecimentoForm from './components/AbastecimentoForm';
import EquipamentoForm from './components/EquipamentoForm';
import ObrasList from './components/ObrasList';
import UsuariosList from './components/UsuariosList';
import Login from './components/Login';
import { User } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('abastecepro_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'equipamentos' | 'abastecimentos' | 'obras' | 'usuarios'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const pendingSyncCount = useLiveQuery(() => db.syncQueue.count()) || 0;

  useEffect(() => {
    syncEngine.start();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      syncEngine.stop();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('abastecepro_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('abastecepro_user');
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await syncEngine.processQueue();
    setIsSyncing(false);
  };

  const handleGoogleLogin = async () => {
    const res = await fetch('/api/auth/url');
    const { url } = await res.json();
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const authWindow = window.open(
      url,
      'google_auth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        localStorage.setItem('google_tokens', JSON.stringify(event.data.tokens));
        window.removeEventListener('message', handleMessage);
        syncEngine.processQueue();
      }
    };
    window.addEventListener('message', handleMessage);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'obras', label: 'Obras', icon: Building2 },
    { id: 'equipamentos', label: 'Equipamentos', icon: Truck },
    { id: 'abastecimentos', label: 'Abastecimentos', icon: Fuel },
    ...(currentUser.role === 'MASTER' ? [{ id: 'usuarios', label: 'Usuários', icon: Users }] : []),
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-stone-200 p-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
            <h1 className="font-bold text-lg tracking-tight">AKA ABASTECE</h1>
          </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-stone-600">
          <Menu size={24} />
        </button>
      </header>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-64 bg-stone-900 text-stone-300 flex flex-col transition-all duration-300 md:relative md:translate-x-0",
              !isSidebarOpen && "hidden md:flex"
            )}
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-stone-900 font-black text-xl">A</div>
                <h1 className="font-bold text-xl text-white tracking-tight">AKA ABASTECE</h1>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-stone-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                    activeTab === item.id 
                      ? "bg-emerald-500/10 text-emerald-400 font-medium" 
                      : "hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon size={20} className={activeTab === item.id ? "text-emerald-400" : "text-stone-500 group-hover:text-stone-300"} />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-stone-800 space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-500">
                  {isOnline ? <Cloud size={14} className="text-emerald-500" /> : <CloudOff size={14} className="text-rose-500" />}
                  {isOnline ? 'Online' : 'Offline'}
                </div>
                {pendingSyncCount > 0 && (
                  <span className="bg-emerald-500 text-stone-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendingSyncCount}
                  </span>
                )}
              </div>
              
              {!localStorage.getItem('google_tokens') ? (
                <button 
                  onClick={handleGoogleLogin}
                  className="w-full py-2 px-4 bg-white text-stone-900 rounded-lg text-sm font-semibold hover:bg-stone-200 transition-colors flex items-center justify-center gap-2"
                >
                  Conectar Google
                </button>
              ) : (
                <button 
                  onClick={handleSyncNow}
                  disabled={isSyncing || !isOnline}
                  className="w-full py-2 px-4 border border-stone-700 text-stone-300 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={16} className={cn(isSyncing && "animate-spin")} />
                  Sincronizar Agora
                </button>
              )}

              <div className="pt-4 border-t border-stone-800">
                <div className="flex items-center gap-3 px-2 mb-4">
                  <div className="w-8 h-8 bg-stone-700 rounded-full flex items-center justify-center text-stone-300 font-bold text-xs uppercase">
                    {currentUser.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{currentUser.nome}</p>
                    <p className="text-[10px] text-stone-500 truncate">{currentUser.role}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-stone-400 hover:text-rose-400 transition-colors text-sm font-medium"
                >
                  <LogOut size={18} /> Sair
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-stone-900 tracking-tight">
                  {navItems.find(i => i.id === activeTab)?.label}
                </h2>
                <p className="text-stone-500 mt-1">
                  {activeTab === 'dashboard' && 'Visão geral da operação e custos.'}
                  {activeTab === 'obras' && 'Gerencie os locais de operação.'}
                  {activeTab === 'equipamentos' && 'Gerencie sua frota e ativos operacionais.'}
                  {activeTab === 'abastecimentos' && 'Registro e controle de consumo de combustível.'}
                  {activeTab === 'usuarios' && 'Controle de acesso e permissões.'}
                </p>
              </div>
              
              <div className="flex gap-3">
                {activeTab === 'equipamentos' && (
                  <button 
                    onClick={() => setShowEquipForm(true)}
                    className="bg-stone-900 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-stone-800 transition-all shadow-sm"
                  >
                    <Plus size={20} /> Novo Equipamento
                  </button>
                )}
                {activeTab === 'abastecimentos' && (
                  <button 
                    onClick={() => setShowFuelForm(true)}
                    className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-sm"
                  >
                    <Plus size={20} /> Novo Abastecimento
                  </button>
                )}
              </div>
            </header>

            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'dashboard' && <Dashboard user={currentUser} />}
              {activeTab === 'obras' && <ObrasList />}
              {activeTab === 'equipamentos' && <EquipamentosList user={currentUser} />}
              {activeTab === 'abastecimentos' && <AbastecimentosList user={currentUser} />}
              {activeTab === 'usuarios' && currentUser.role === 'MASTER' && <UsuariosList />}
            </motion.div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showFuelForm && (
          <AbastecimentoForm user={currentUser} onClose={() => setShowFuelForm(false)} />
        )}
        {showEquipForm && (
          <EquipamentoForm onClose={() => setShowEquipForm(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
