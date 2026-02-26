import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { User } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Fuel, Lock, Mail, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Create a master user if none exists
    const initMaster = async () => {
      const users = await db.users.toArray();
      if (users.length === 0) {
        const masterUser: User = {
          id: uuidv4(),
          nome: 'Administrador Master',
          email: 'master@akaabastece.com',
          password: 'admin', // Simple for demo
          role: 'MASTER',
          obras_permitidas: [], // Master sees all
          created_at: new Date().toISOString()
        };
        await db.users.add(masterUser);
      }
    };
    initMaster();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = await db.users.where('email').equals(email).first();
    
    if (user && user.password === password) {
      onLogin(user);
    } else {
      setError('E-mail ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-white rounded-[40px] shadow-2xl shadow-stone-200/50 p-8 md:p-12"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-rose-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-rose-600/30 mb-6 rotate-3 overflow-hidden">
            <Fuel size={40} />
          </div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight italic">AKA ABASTECE</h1>
          <p className="text-stone-500 font-medium mt-2">Gestão Inteligente de Abastecimento</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400 ml-4">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
              <input 
                type="email"
                required
                className="w-full pl-12 pr-4 py-4 bg-stone-100 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400 ml-4">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
              <input 
                type="password"
                required
                className="w-full pl-12 pr-4 py-4 bg-stone-100 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-2">
              <Lock size={16} />
              {error}
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-stone-900 text-white py-5 rounded-3xl font-bold text-lg hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/20 active:scale-[0.98]"
          >
            Entrar no Sistema
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-stone-100 text-center">
          <p className="text-stone-400 text-sm font-medium">
            Acesso Master: <span className="text-stone-600">master@akaabastece.com / admin</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
