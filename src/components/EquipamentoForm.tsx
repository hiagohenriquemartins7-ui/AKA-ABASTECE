import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { syncEngine } from '../services/syncEngine';

import { Equipamento } from '../types';

interface Props {
  onClose: () => void;
  initialData?: Equipamento;
}

export default function EquipamentoForm({ onClose, initialData }: Props) {
  const obras = useLiveQuery(() => db.obras.where('status').equals('Ativo').toArray()) || [];
  
  const [formData, setFormData] = useState({
    nome: initialData?.nome || '',
    obra_id: initialData?.obra_id || '',
    tipo: initialData?.tipo || 'Caminhão',
    placa: initialData?.placa || '',
    marca: initialData?.marca || '',
    modelo: initialData?.modelo || '',
    ano: initialData?.ano || new Date().getFullYear(),
    tipo_medicao: initialData?.tipo_medicao || 'KM' as const,
    combustivel_padrao: initialData?.combustivel_padrao || 'Diesel',
    status: initialData?.status || 'Ativo'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.obra_id) {
      alert('Selecione uma obra');
      return;
    }
    
    const id = initialData?.id || uuidv4();
    const now = new Date().toISOString();
    
    const equipData = {
      id,
      ...formData,
      created_at: initialData?.created_at || now,
      updated_at: now
    };

    if (initialData) {
      await db.equipamentos.put(equipData);
      await syncEngine.addToQueue({
        entity_type: 'EQUIPAMENTO',
        entity_id: id,
        action_type: 'UPDATE',
        payload_json: JSON.stringify(equipData)
      });
    } else {
      await db.equipamentos.add(equipData);
      await syncEngine.addToQueue({
        entity_type: 'EQUIPAMENTO',
        entity_id: id,
        action_type: 'CREATE',
        payload_json: JSON.stringify(equipData)
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <h3 className="text-xl font-bold text-stone-900">
            {initialData ? 'Editar Equipamento' : 'Novo Equipamento'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Nome/Identificação</label>
              <input 
                type="text"
                required
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Caminhão 01"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Obra</label>
              <select 
                required
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.obra_id}
                onChange={e => setFormData({ ...formData, obra_id: e.target.value })}
              >
                <option value="">Selecione a Obra...</option>
                {obras.map(o => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Tipo</label>
              <select 
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.tipo}
                onChange={e => setFormData({ ...formData, tipo: e.target.value })}
              >
                <option value="Caminhão">Caminhão</option>
                <option value="Escavadeira">Escavadeira</option>
                <option value="Gerador">Gerador</option>
                <option value="Pá Carregadeira">Pá Carregadeira</option>
                <option value="Veículo Leve">Veículo Leve</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Placa/Série</label>
              <input 
                type="text"
                required
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.placa}
                onChange={e => setFormData({ ...formData, placa: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Marca</label>
              <input 
                type="text"
                required
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.marca}
                onChange={e => setFormData({ ...formData, marca: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Ano</label>
              <input 
                type="number"
                required
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.ano}
                onChange={e => setFormData({ ...formData, ano: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Tipo Medição</label>
              <select 
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.tipo_medicao}
                onChange={e => setFormData({ ...formData, tipo_medicao: e.target.value as any })}
              >
                <option value="KM">Quilometragem (KM)</option>
                <option value="HORIMETRO">Horímetro (H)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Combustível Padrão</label>
              <select 
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.combustivel_padrao}
                onChange={e => setFormData({ ...formData, combustivel_padrao: e.target.value })}
              >
                <option value="Diesel">Diesel</option>
                <option value="Diesel S10">Diesel S10</option>
                <option value="Diesel S500">Diesel S500</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Gasolina Aditivada">Gasolina Aditivada</option>
                <option value="Etanol">Etanol</option>
                <option value="Etanol Aditivado">Etanol Aditivado</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all shadow-lg"
            >
              {initialData ? 'Salvar Alterações' : 'Cadastrar Equipamento'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
