import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Fuel, Calendar, CheckCircle2, Clock, AlertCircle, Edit2, Trash2, Download, Upload } from 'lucide-react';
import { format } from 'date-fns';
import AbastecimentoForm from './AbastecimentoForm';
import { Abastecimento, User } from '../types';
import { exportToExcel, importFromExcel } from '../services/dataService';
import { syncEngine } from '../services/syncEngine';
import ConfirmationModal from './ConfirmationModal';

interface Props {
  user: User;
}

export default function AbastecimentosList({ user }: Props) {
  const obras = useLiveQuery(() => db.obras.toArray()) || [];
  const abastecimentos = useLiveQuery(async () => {
    if (user.role === 'MASTER') return db.abastecimentos.orderBy('data').reverse().toArray();
    return db.abastecimentos.where('obra_id').anyOf(user.obras_permitidas).reverse().sortBy('data');
  }, [user]) || [];
  
  const equipamentos = useLiveQuery(() => db.equipamentos.toArray()) || [];
  const [editingItem, setEditingItem] = useState<Abastecimento | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getEquipName = (id: string) => equipamentos.find(e => e.id === id)?.nome || 'N/A';
  const getObraName = (id: string) => obras.find(o => o.id === id)?.nome || 'N/A';

  const handleDelete = async () => {
    if (!deleteId) return;
    
    await db.abastecimentos.delete(deleteId);
    
    // Add to sync queue for deletion
    await syncEngine.addToQueue({
      entity_type: 'ABASTECIMENTO',
      entity_id: deleteId,
      action_type: 'DELETE',
      payload_json: JSON.stringify({ id: deleteId })
    });

    setDeleteId(null);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const data = await importFromExcel(file);
        alert(`Importação concluída: ${data.length} registros processados.`);
      } catch (err) {
        alert('Erro na importação');
      }
    }
  };

  if (abastecimentos.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 mb-4">
          <Fuel size={32} />
        </div>
        <h3 className="text-xl font-bold text-stone-900">Nenhum abastecimento</h3>
        <p className="text-stone-500 mt-2 max-w-xs">Registre o primeiro abastecimento para começar o controle.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <label className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-all cursor-pointer">
          <Upload size={16} /> Importar Base
          <input type="file" className="hidden" accept=".xlsx,.csv" onChange={handleImport} />
        </label>
        <button 
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-all"
        >
          <Download size={16} /> Exportar Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500">Data</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500">Obra</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500">Equipamento</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500">KM ANTERIOR</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500">KM ATUAL</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500">Litros</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500">NF</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500">Requisição</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500">Consumo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500">Responsável</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {abastecimentos.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-stone-400" />
                      <span className="text-sm font-medium text-stone-700">{format(new Date(item.data), 'dd/MM/yyyy')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-stone-600">{getObraName(item.obra_id)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-stone-900">{getEquipName(item.equipamento_id)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-stone-400 italic">{item.medicao_anterior || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-stone-600">{item.medicao_inicial}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-stone-600">{item.litros} L</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-stone-600">{item.nf || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-stone-600">{item.requisicao || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-emerald-600">{item.consumo_medio_calculado.toFixed(2)} km/L</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-stone-600">{item.responsavel}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setEditingItem(item)}
                        className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setDeleteId(item.id)}
                        className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="flex items-center gap-1">
                        {item.sync_status === 'SYNCED' ? (
                          <CheckCircle2 size={14} className="text-emerald-500" />
                        ) : item.sync_status === 'PENDING' ? (
                          <Clock size={14} className="text-amber-500" />
                        ) : (
                          <AlertCircle size={14} className="text-rose-500" />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingItem && (
        <AbastecimentoForm 
          user={user}
          initialData={editingItem} 
          onClose={() => setEditingItem(null)} 
        />
      )}

      <ConfirmationModal 
        isOpen={!!deleteId}
        title="Excluir Lançamento"
        message="Tem certeza que deseja excluir este lançamento de abastecimento? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
