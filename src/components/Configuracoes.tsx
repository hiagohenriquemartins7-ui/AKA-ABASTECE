import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Settings, 
  Database, 
  FileSpreadsheet, 
  Save, 
  RefreshCw, 
  Download, 
  Upload, 
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { googleSheetsService } from '../services/googleSheetsService';
import { exportToExcel } from '../services/dataService';
import { User } from '../types';

interface Props {
  user: User;
}

export default function Configuracoes({ user }: Props) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const abastecimentos = useLiveQuery(() => db.abastecimentos.toArray()) || [];

  useEffect(() => {
    const loadSettings = async () => {
      const id = await googleSheetsService.getSpreadsheetId();
      if (id) setSpreadsheetId(id);
      
      const url = await googleSheetsService.getProxyUrl();
      if (url) setProxyUrl(url);
      
      const tokens = localStorage.getItem('google_tokens');
      setIsConnected(!!tokens);
    };
    loadSettings();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        localStorage.setItem('google_tokens', JSON.stringify(event.data.tokens));
        setIsConnected(true);
        setMessage({ type: 'success', text: 'Conta Google conectada com sucesso!' });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch('/api/auth/url');
      const { url } = await response.json();
      window.open(url, 'google_oauth', 'width=600,height=700');
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao iniciar conexão com Google' });
    }
  };

  const handleDisconnectGoogle = () => {
    localStorage.removeItem('google_tokens');
    setIsConnected(false);
    setMessage({ type: 'success', text: 'Conta Google desconectada.' });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Extract ID from URL if user pasted a full URL
      let id = spreadsheetId;
      if (spreadsheetId.includes('/d/')) {
        id = spreadsheetId.split('/d/')[1].split('/')[0];
      }
      
      await googleSheetsService.setSpreadsheetId(id);
      await googleSheetsService.setProxyUrl(proxyUrl);
      setSpreadsheetId(id);
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro ao salvar: ' + error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportFromSheets = async () => {
    setIsSyncing(true);
    setMessage(null);
    try {
      const count = await googleSheetsService.importFromSheets(user);
      setMessage({ type: 'success', text: `${count} novos registros importados da planilha!` });
    } catch (error: any) {
      if (error.message === 'Google account not connected') {
        setMessage({ type: 'error', text: 'Sua conta Google não está conectada. Use o campo "URL do Script" para exportar sem login.' });
      } else {
        setMessage({ type: 'error', text: 'Erro na importação: ' + error.message });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportToSheets = async () => {
    setIsSyncing(true);
    setMessage(null);
    try {
      // Prepare data for export
      const equipamentos = await db.equipamentos.toArray();
      const obras = await db.obras.toArray();
      const dataToExport = abastecimentos.map(item => ({
        ...item,
        obra_nome: obras.find(o => o.id === item.obra_id)?.nome || 'N/A',
        equipamento_nome: equipamentos.find(e => e.id === item.equipamento_id)?.nome || 'N/A',
        equipamento_tipo: equipamentos.find(e => e.id === item.equipamento_id)?.tipo || 'N/A'
      }));

      await googleSheetsService.exportToSheets(dataToExport);
      setMessage({ type: 'success', text: 'Dados exportados para a planilha com sucesso!' });
    } catch (error: any) {
      if (error.message === 'Google account not connected') {
        setMessage({ type: 'error', text: 'Sua conta Google não está conectada. Use o campo "URL do Script" para exportar sem login.' });
      } else {
        setMessage({ type: 'error', text: 'Erro na exportação: ' + error.message });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportToExcelLocal = () => {
    exportToExcel();
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <FileSpreadsheet size={20} />
            </div>
            <h3 className="text-xl font-bold text-stone-900">Integração Google Sheets</h3>
          </div>
          
          {isConnected ? (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold">
              <CheckCircle2 size={14} /> Conta Conectada
              <button 
                onClick={handleDisconnectGoogle}
                className="ml-2 text-stone-400 hover:text-rose-600 transition-colors"
                title="Desconectar"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleConnectGoogle}
              className="bg-white border border-stone-200 text-stone-700 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-stone-50 transition-all flex items-center gap-2 shadow-sm"
            >
              <Database size={14} /> Conectar Google
            </button>
          )}
        </div>
        
        <div className="p-6 space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500 ml-1">ID ou URL da Planilha (Modo Login)</label>
              <div className="flex gap-3">
                <input 
                  type="text"
                  className="flex-1 px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-sm"
                  value={spreadsheetId}
                  onChange={e => setSpreadsheetId(e.target.value)}
                  placeholder="Ex: 1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500 ml-1">URL do Script de Integração (Modo Sem Login)</label>
              <div className="flex gap-3">
                <input 
                  type="text"
                  className="flex-1 px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-sm"
                  value={proxyUrl}
                  onChange={e => setProxyUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                />
              </div>
              <button 
                type="button"
                onClick={() => setShowScript(!showScript)}
                className="text-[10px] text-emerald-600 font-bold hover:underline mt-1 ml-1"
              >
                {showScript ? 'Ocultar Instruções' : 'Como obter esta URL?'}
              </button>
            </div>

            {showScript && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3"
              >
                <p className="text-xs text-stone-600 leading-relaxed">
                  Para exportar e importar <strong>sem precisar de login</strong>, siga estes passos:
                </p>
                <ol className="text-xs text-stone-600 list-decimal ml-4 space-y-1">
                  <li>Na sua planilha, vá em <strong>Extensões &gt; Apps Script</strong>.</li>
                  <li>Cole o código de integração (disponível no suporte).</li>
                  <li>Clique em <strong>Implantar &gt; Nova implantação</strong>.</li>
                  <li>Tipo: <strong>App da Web</strong> | Quem pode acessar: <strong>Qualquer pessoa</strong>.</li>
                  <li>Copie a URL gerada e cole no campo acima.</li>
                </ol>
              </motion.div>
            )}

            <div className="pt-2">
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full bg-stone-900 text-white px-6 py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
              >
                <Save size={20} />
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>

          {spreadsheetId && (
            <div className="flex flex-wrap gap-3 pt-4">
              <a 
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-lg transition-all"
              >
                <ExternalLink size={16} /> Abrir Planilha
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <RefreshCw size={20} />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Sincronização de Dados</h3>
          </div>
          <p className="text-sm text-stone-500">
            Atualize os dados locais com as informações da planilha ou envie seus lançamentos atuais.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <button 
              onClick={handleImportFromSheets}
              disabled={isSyncing || (!spreadsheetId && !proxyUrl)}
              className="w-full flex items-center justify-center gap-2 bg-stone-100 text-stone-700 py-3 rounded-xl font-bold hover:bg-stone-200 transition-all disabled:opacity-50"
            >
              <Download size={18} />
              Importar da Planilha
            </button>
            <button 
              onClick={handleExportToSheets}
              disabled={isSyncing || (!spreadsheetId && !proxyUrl)}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              <Upload size={18} />
              Exportar para Planilha
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <FileText size={20} />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Exportação Local</h3>
          </div>
          <p className="text-sm text-stone-500">
            Gere um arquivo Excel (.xlsx) com todos os lançamentos cadastrados no dispositivo.
          </p>
          <div className="pt-2">
            <button 
              onClick={handleExportToExcelLocal}
              className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/20"
            >
              <FileSpreadsheet size={18} />
              Baixar Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 font-bold ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </motion.div>
      )}
    </div>
  );
}
