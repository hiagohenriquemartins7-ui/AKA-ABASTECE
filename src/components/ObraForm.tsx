import React, { useState } from 'react';
import { db } from '../db/db';
import { v4 as uuidv4 } from 'uuid';
import { X } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onClose: () => void;
}

export default function ObraForm({ onClose }: Props) {
  const [formData, setFormData] = useState({
    nome: '',
    localizacao: '',
    status: 'Ativo' as const
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = uuidv4();
    const newObra = {
      id,
      ...formData,
      created_at: new Date().toISOString()
    };

    await db.obras.add(newObra);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <h3 className="text-xl font-bold text-stone-900">Nova Obra</h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Nome da Obra</label>
            <input 
              type="text"
              required
              className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
              value={formData.nome}
              onChange={e => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Obra Centro"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Localização</label>
            <input 
              type="text"
              required
              className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
              value={formData.localizacao}
              onChange={e => setFormData({ ...formData, localizacao: e.target.value })}
              placeholder="Cidade/Estado ou Endereço"
            />
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all shadow-lg"
            >
              Cadastrar Obra
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
