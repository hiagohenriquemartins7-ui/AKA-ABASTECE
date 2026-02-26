import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { X, Calculator, Info, History } from 'lucide-react';
import { motion } from 'motion/react';
import { syncEngine } from '../services/syncEngine';
import { Abastecimento, User } from '../types';
import { format } from 'date-fns';

interface Props {
  onClose: () => void;
  initialData?: Abastecimento;
  user: User;
}

export default function AbastecimentoForm({ onClose, initialData, user }: Props) {
  const obras = useLiveQuery(async () => {
    if (user.role === 'MASTER') return db.obras.where('status').equals('Ativo').toArray();
    return db.obras.where('id').anyOf(user.obras_permitidas).and(o => o.status === 'Ativo').toArray();
  }, [user]) || [];

  const [formData, setFormData] = useState({
    obra_id: initialData?.obra_id || (user.role === 'OPERADOR' && user.obras_permitidas.length === 1 ? user.obras_permitidas[0] : ''),
    equipamento_id: initialData?.equipamento_id || '',
    data: initialData?.data || new Date().toISOString().split('T')[0],
    medicao_inicial: initialData?.medicao_inicial || 0,
    litros: initialData?.litros || 0,
    combustivel: initialData?.combustivel || 'Diesel',
    preco_litro: initialData?.preco_litro || 0,
    responsavel: initialData?.responsavel || user.nome,
    nf: initialData?.nf || '',
    requisicao: initialData?.requisicao || '',
    observacoes: initialData?.observacoes || ''
  });

  const equipamentos = useLiveQuery(() => 
    formData.obra_id 
      ? db.equipamentos.where('obra_id').equals(formData.obra_id).and(e => e.status === 'Ativo').toArray()
      : []
  , [formData.obra_id]) || [];
  
  const [calculated, setCalculated] = useState({
    medicao_anterior: 0,
    distancia: 0,
    consumo_medio: 0,
    valor_total: 0,
    custo_por_unidade: 0
  });

  useEffect(() => {
    const fetchPreviousMedicao = async () => {
      if (!formData.equipamento_id) return;

      // Find the previous abastecimento for this equipment
      const previous = await db.abastecimentos
        .where('equipamento_id')
        .equals(formData.equipamento_id)
        .and(a => a.data < formData.data || (a.data === formData.data && a.created_at < (initialData?.created_at || new Date().toISOString())))
        .sortBy('data');
      
      const lastAbastecimento = previous.length > 0 ? previous[previous.length - 1] : null;
      const medicao_anterior = lastAbastecimento ? lastAbastecimento.medicao_inicial : 0;

      const distancia = medicao_anterior > 0 ? formData.medicao_inicial - medicao_anterior : 0;
      const valor_total = formData.litros * formData.preco_litro;
      const consumo_medio = formData.litros > 0 && distancia > 0 ? distancia / formData.litros : 0;
      const custo_por_unidade = distancia > 0 ? valor_total / distancia : 0;

      setCalculated({
        medicao_anterior,
        distancia,
        consumo_medio,
        valor_total,
        custo_por_unidade
      });
    };

    fetchPreviousMedicao();
  }, [formData, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.obra_id) return alert('Selecione a obra');
    if (!formData.equipamento_id) return alert('Selecione o equipamento');
    
    const id = initialData?.id || uuidv4();
    const now = new Date().toISOString();

    const abastecimentoData: Abastecimento = {
      id,
      ...formData,
      medicao_anterior: calculated.medicao_anterior,
      medicao_final: 0, // No longer used but kept for type compatibility
      valor_total: calculated.valor_total,
      consumo_medio_calculado: calculated.consumo_medio,
      custo_por_unidade: calculated.custo_por_unidade,
      sync_status: 'PENDING',
      created_at: initialData?.created_at || now,
      updated_at: now,
      last_updated_by: user.email
    };

    if (initialData) {
      await db.abastecimentos.put(abastecimentoData);
      await syncEngine.addToQueue({
        entity_type: 'ABASTECIMENTO',
        entity_id: id,
        action_type: 'UPDATE',
        payload_json: JSON.stringify(abastecimentoData)
      });
    } else {
      await db.abastecimentos.add(abastecimentoData);
      await syncEngine.addToQueue({
        entity_type: 'ABASTECIMENTO',
        entity_id: id,
        action_type: 'CREATE',
        payload_json: JSON.stringify(abastecimentoData)
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div>
            <h3 className="text-xl font-bold text-stone-900">
              {initialData ? 'Editar Abastecimento' : 'Novo Abastecimento'}
            </h3>
            {initialData?.last_updated_by && (
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-stone-500 font-medium">
                <History size={12} />
                Última atualização por {initialData.last_updated_by} em {initialData.updated_at ? format(new Date(initialData.updated_at), 'dd/MM/yyyy HH:mm') : 'N/A'}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Obra</label>
              <select 
                required
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.obra_id}
                onChange={e => setFormData({ ...formData, obra_id: e.target.value, equipamento_id: '' })}
              >
                <option value="">Selecione a Obra...</option>
                {obras.map(o => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Equipamento</label>
              <select 
                required
                disabled={!formData.obra_id}
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                value={formData.equipamento_id}
                onChange={e => setFormData({ ...formData, equipamento_id: e.target.value })}
              >
                <option value="">Selecione...</option>
                {equipamentos.map(e => (
                  <option key={e.id} value={e.id}>{e.nome} ({e.placa})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Data do Abastecimento</label>
              <input 
                type="date"
                required
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.data}
                onChange={e => setFormData({ ...formData, data: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">KM ou HR do Abastecimento</label>
              <div className="relative">
                <input 
                  type="number"
                  required
                  className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={formData.medicao_inicial}
                  onChange={e => setFormData({ ...formData, medicao_inicial: Number(e.target.value) })}
                />
                {calculated.medicao_anterior > 0 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400 bg-white px-2 py-1 rounded-lg border border-stone-100">
                    ANTERIOR: {calculated.medicao_anterior}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Litros</label>
              <input 
                type="number"
                step="0.01"
                required
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.litros}
                onChange={e => setFormData({ ...formData, litros: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Preço por Litro</label>
              <input 
                type="number"
                step="0.01"
                required
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.preco_litro}
                onChange={e => setFormData({ ...formData, preco_litro: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Combustível</label>
              <select 
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.combustivel}
                onChange={e => setFormData({ ...formData, combustivel: e.target.value })}
              >
                <option value="Diesel">Diesel</option>
                <option value="Diesel S10">Diesel S10</option>
                <option value="Diesel S500">Diesel S500</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Gasolina Aditivada">Gasolina Aditivada</option>
                <option value="Etanol">Etanol</option>
                <option value="Etanol Aditivado">Etanol Aditivado</option>
                <option value="Arla 32">Arla 32</option>
              </select>
            </div>
          </div>

          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-emerald-600/70">Distância</span>
              <span className="text-lg font-bold text-emerald-900">{calculated.distancia} km</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-emerald-600/70">Consumo Médio</span>
              <span className="text-lg font-bold text-emerald-900">{calculated.consumo_medio.toFixed(2)} km/L</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-emerald-600/70">Valor Total</span>
              <span className="text-lg font-bold text-emerald-900">R$ {calculated.valor_total.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-emerald-600/70">Custo/KM</span>
              <span className="text-lg font-bold text-emerald-900">R$ {calculated.custo_por_unidade.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">NF (Nota Fiscal)</label>
              <input 
                type="text"
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.nf}
                onChange={e => setFormData({ ...formData, nf: e.target.value })}
                placeholder="Número da Nota Fiscal"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Requisição</label>
              <input 
                type="text"
                className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.requisicao}
                onChange={e => setFormData({ ...formData, requisicao: e.target.value })}
                placeholder="Número da requisição"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Responsável</label>
            <input 
              type="text"
              required
              className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
              value={formData.responsavel}
              onChange={e => setFormData({ ...formData, responsavel: e.target.value })}
              placeholder="Nome do motorista ou operador"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Observações</label>
            <textarea 
              className="w-full px-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
              value={formData.observacoes}
              onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
            >
              Salvar Abastecimento
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
