import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { User as UserIcon, Shield, Plus, Mail, Building2, Lock, Trash2, Edit2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'motion/react';
import ConfirmationModal from './ConfirmationModal';
import { User } from '../types';

export default function UsuariosList() {
  const users = useLiveQuery(() => db.users.toArray()) || [];
  const obras = useLiveQuery(() => db.obras.toArray()) || [];
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // The primary master user is the one with the earliest created_at date
  const primaryMasterId = users.length > 0 
    ? [...users].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0].id 
    : null;

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'OPERADOR' as 'OPERADOR' | 'MASTER',
    obras_permitidas: [] as string[]
  });

  const handleOpenForm = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nome: user.nome,
        email: user.email,
        password: user.password || '',
        role: user.role,
        obras_permitidas: user.obras_permitidas
      });
    } else {
      setEditingUser(null);
      setFormData({ nome: '', email: '', password: '', role: 'OPERADOR', obras_permitidas: [] });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      await db.users.update(editingUser.id, {
        ...formData,
      });
    } else {
      const id = uuidv4();
      await db.users.add({
        id,
        ...formData,
        created_at: new Date().toISOString()
      });
    }
    
    setShowForm(false);
    setEditingUser(null);
    setFormData({ nome: '', email: '', password: '', role: 'OPERADOR', obras_permitidas: [] });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await db.users.delete(deleteId);
    setDeleteId(null);
  };

  const toggleObra = (obraId: string) => {
    setFormData(prev => ({
      ...prev,
      obras_permitidas: prev.obras_permitidas.includes(obraId)
        ? prev.obras_permitidas.filter(id => id !== obraId)
        : [...prev.obras_permitidas, obraId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-stone-900">Usuários</h2>
        <button 
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg"
        >
          <Plus size={20} /> Novo Usuário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((u) => (
          <div key={u.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm relative group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-stone-100 rounded-2xl text-stone-600">
                <UserIcon size={24} />
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  u.role === 'MASTER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {u.role}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenForm(u)}
                    className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                    title="Editar Usuário"
                  >
                    <Edit2 size={16} />
                  </button>
                  {u.id !== primaryMasterId && (
                    <button 
                      onClick={() => setDeleteId(u.id)}
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Excluir Usuário"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-1">{u.nome}</h3>
            <div className="flex items-center gap-1.5 text-stone-500 text-sm mb-4">
              <Mail size={14} />
              {u.email}
            </div>
            
            {u.role === 'OPERADOR' && (
              <div className="pt-4 border-t border-stone-100">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Obras Permitidas</p>
                <div className="flex flex-wrap gap-2">
                  {u.obras_permitidas.length === 0 ? (
                    <span className="text-xs text-stone-400 italic">Nenhuma obra vinculada</span>
                  ) : (
                    u.obras_permitidas.map(oid => {
                      const obra = obras.find(o => o.id === oid);
                      return (
                        <span key={oid} className="bg-stone-100 text-stone-600 px-2 py-1 rounded-lg text-[10px] font-bold">
                          {obra?.nome || 'N/A'}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmationModal 
        isOpen={!!deleteId}
        title="Excluir Usuário"
        message="Tem certeza que deseja excluir este usuário? Esta ação removerá permanentemente o acesso dele ao sistema."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <h3 className="text-xl font-bold text-stone-900">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button 
                onClick={() => {
                  setShowForm(false);
                  setEditingUser(null);
                }} 
                className="p-2 hover:bg-stone-200 rounded-full transition-colors"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Nome Completo</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">E-mail</label>
                <input 
                  type="email" required
                  className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Senha</label>
                <input 
                  type="password" required
                  className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Perfil</label>
                <select 
                  className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                >
                  <option value="OPERADOR">Operador (Acesso restrito)</option>
                  <option value="MASTER">Master (Acesso total)</option>
                </select>
              </div>

              {formData.role === 'OPERADOR' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Obras Permitidas</label>
                  <div className="grid grid-cols-2 gap-2">
                    {obras.map(o => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => toggleObra(o.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all ${
                          formData.obras_permitidas.includes(o.id)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {o.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all shadow-lg"
                >
                  {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
