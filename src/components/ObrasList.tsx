import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Building2, MapPin, Plus } from 'lucide-react';
import ObraForm from './ObraForm';

export default function ObrasList() {
  const obras = useLiveQuery(() => db.obras.toArray()) || [];
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-stone-900">Obras</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus size={20} /> Nova Obra
        </button>
      </div>

      {obras.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 mb-4">
            <Building2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-stone-900">Nenhuma obra cadastrada</h3>
          <p className="text-stone-500 mt-2 max-w-xs">Cadastre as obras para gerenciar os equipamentos por local.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {obras.map((obra) => (
            <div key={obra.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-stone-100 rounded-2xl text-stone-600 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                  <Building2 size={24} />
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  obra.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'
                }`}>
                  {obra.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-1">{obra.nome}</h3>
              <div className="flex items-center gap-1.5 text-stone-500 text-sm">
                <MapPin size={14} />
                {obra.localizacao}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <ObraForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
