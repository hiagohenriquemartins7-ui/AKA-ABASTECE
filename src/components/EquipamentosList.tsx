import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Truck, MoreVertical, Settings2, Trash2, Edit2 } from 'lucide-react';
import { User, Equipamento } from '../types';
import { syncEngine } from '../services/syncEngine';
import ConfirmationModal from './ConfirmationModal';
import EquipamentoForm from './EquipamentoForm';

interface Props {
  user: User;
}

export default function EquipamentosList({ user }: Props) {
  const obras = useLiveQuery(() => db.obras.toArray()) || [];
  const equipamentos = useLiveQuery(async () => {
    if (user.role === 'MASTER') return db.equipamentos.toArray();
    return db.equipamentos.where('obra_id').anyOf(user.obras_permitidas).toArray();
  }, [user]) || [];
  
  const [editingEquip, setEditingEquip] = useState<Equipamento | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const getObraName = (id: string) => obras.find(o => o.id === id)?.nome || 'N/A';

  const handleDelete = async () => {
    if (!deleteId) return;
    
    await db.equipamentos.delete(deleteId);
    
    // Add to sync queue for deletion
    await syncEngine.addToQueue({
      entity_type: 'EQUIPAMENTO',
      entity_id: deleteId,
      action_type: 'DELETE',
      payload_json: JSON.stringify({ id: deleteId })
    });

    setDeleteId(null);
  };

  if (equipamentos.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 mb-4">
          <Truck size={32} />
        </div>
        <h3 className="text-xl font-bold text-stone-900">Nenhum equipamento cadastrado</h3>
        <p className="text-stone-500 mt-2 max-w-xs">Comece adicionando os veículos e máquinas da sua frota.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {equipamentos.map((equip) => (
        <div key={equip.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:border-emerald-500/50 transition-all group relative">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-stone-100 rounded-xl text-stone-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Truck size={24} />
            </div>
            <div className="flex gap-1">
              <div className="relative">
                <button 
                  onClick={() => setShowMenu(showMenu === equip.id ? null : equip.id)}
                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                >
                  <MoreVertical size={20} />
                </button>
                
                {showMenu === equip.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-100 py-2 z-10">
                    <button 
                      onClick={() => {
                        setEditingEquip(equip);
                        setShowMenu(null);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 flex items-center gap-2"
                    >
                      <Edit2 size={14} /> Editar Equipamento
                    </button>
                    {user.role === 'MASTER' && (
                      <button 
                        onClick={() => {
                          setDeleteId(equip.id);
                          setShowMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Excluir Equipamento
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-lg text-stone-900">{equip.nome}</h4>
            <p className="text-sm text-stone-500">{equip.marca} {equip.modelo} • {equip.ano}</p>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1">{getObraName(equip.obra_id)}</p>
          </div>

          <div className="mt-6 pt-6 border-t border-stone-100 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Placa</span>
              <span className="text-sm font-mono font-bold text-stone-700">{equip.placa}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Status</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                equip.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {equip.status}
              </span>
            </div>
          </div>
        </div>
      ))}

      {editingEquip && (
        <EquipamentoForm 
          initialData={editingEquip}
          onClose={() => setEditingEquip(null)}
        />
      )}

      <ConfirmationModal 
        isOpen={!!deleteId}
        title="Excluir Equipamento"
        message="Tem certeza que deseja excluir este equipamento? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
