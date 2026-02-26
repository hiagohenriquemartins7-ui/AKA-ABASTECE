import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Fuel, DollarSign, Activity, TrendingDown, Download, Upload, Building2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { exportToExcel } from '../services/dataService';
import { User } from '../types';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

interface Props {
  user: User;
}

export default function Dashboard({ user }: Props) {
  const obras = useLiveQuery(() => db.obras.toArray()) || [];
  const abastecimentos = useLiveQuery(async () => {
    if (user.role === 'MASTER') return db.abastecimentos.toArray();
    return db.abastecimentos.where('obra_id').anyOf(user.obras_permitidas).toArray();
  }, [user]) || [];
  
  const equipamentos = useLiveQuery(async () => {
    if (user.role === 'MASTER') return db.equipamentos.toArray();
    return db.equipamentos.where('obra_id').anyOf(user.obras_permitidas).toArray();
  }, [user]) || [];

  const [filterObra, setFilterObra] = useState<string>('all');
  const [filterEquip, setFilterEquip] = useState<string>('all');
  const [filterFuel, setFilterFuel] = useState<string>('all');

  const filteredAbastecimentos = abastecimentos.filter(a => {
    const matchObra = filterObra === 'all' || a.obra_id === filterObra;
    const matchEquip = filterEquip === 'all' || a.equipamento_id === filterEquip;
    const matchFuel = filterFuel === 'all' || a.combustivel === filterFuel;
    return matchObra && matchEquip && matchFuel;
  });

  const filteredEquipamentos = equipamentos.filter(e => {
    return filterObra === 'all' || e.obra_id === filterObra;
  });

  const totalCost = filteredAbastecimentos.reduce((acc, curr) => acc + curr.valor_total, 0);
  const totalLitros = filteredAbastecimentos.reduce((acc, curr) => acc + curr.litros, 0);
  const avgConsumo = filteredAbastecimentos.length > 0 
    ? filteredAbastecimentos.reduce((acc, curr) => acc + curr.consumo_medio_calculado, 0) / filteredAbastecimentos.length 
    : 0;

  // Stats: Consumo Médio por Tipo de Combustível
  const fuelTypes = Array.from(new Set(abastecimentos.map(a => a.combustivel)));
  const consumoByFuel = fuelTypes.map(fuel => {
    const filtered = filteredAbastecimentos.filter(a => a.combustivel === fuel);
    const avg = filtered.length > 0 
      ? filtered.reduce((acc, curr) => acc + curr.consumo_medio_calculado, 0) / filtered.length
      : 0;
    return { name: fuel, value: avg };
  }).filter(d => d.value > 0);

  // Stats: Consumo Médio por Equipamento
  const consumoByEquip = filteredEquipamentos.map(e => {
    const filtered = filteredAbastecimentos.filter(a => a.equipamento_id === e.id);
    const avg = filtered.length > 0 
      ? filtered.reduce((acc, curr) => acc + curr.consumo_medio_calculado, 0) / filtered.length
      : 0;
    return { name: e.nome, value: avg };
  }).filter(d => d.value > 0);

  // Chart Data: Cost per Equipment (filtered)
  const costPerEquip = filteredEquipamentos.map(e => {
    const total = filteredAbastecimentos
      .filter(a => a.equipamento_id === e.id)
      .reduce((acc, curr) => acc + curr.valor_total, 0);
    return { name: e.nome, value: total };
  }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  // Chart Data: Monthly Evolution (filtered)
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(new Date(), i);
    return {
      month: format(d, 'MMM'),
      start: startOfMonth(d),
      end: endOfMonth(d),
      cost: 0
    };
  }).reverse();

  last6Months.forEach(m => {
    m.cost = filteredAbastecimentos
      .filter(a => isWithinInterval(new Date(a.data), { start: m.start, end: m.end }))
      .reduce((acc, curr) => acc + curr.valor_total, 0);
  });

  const kpis = [
    { label: 'Custo Total', value: `R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'Total Litros', value: `${totalLitros.toLocaleString('pt-BR')} L`, icon: Fuel, color: 'bg-blue-500' },
    { label: 'Consumo Médio', value: `${avgConsumo.toFixed(2)} km/L`, icon: Activity, color: 'bg-amber-500' },
    { label: 'Eficiência Geral', value: '94%', icon: TrendingDown, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Filtrar Obra</label>
            <select 
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={filterObra}
              onChange={e => {
                setFilterObra(e.target.value);
                setFilterEquip('all');
              }}
            >
              <option value="all">Todas as Obras</option>
              {obras.filter(o => user.role === 'MASTER' || user.obras_permitidas.includes(o.id)).map(o => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Filtrar Equipamento</label>
            <select 
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={filterEquip}
              onChange={e => setFilterEquip(e.target.value)}
            >
              <option value="all">Todos os Equipamentos</option>
              {filteredEquipamentos.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Filtrar Combustível</label>
            <select 
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={filterFuel}
              onChange={e => setFilterFuel(e.target.value)}
            >
              <option value="all">Todos os Combustíveis</option>
              {fuelTypes.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-all"
          >
            <Download size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
            <div className={`${kpi.color} p-3 rounded-xl text-white`}>
              <kpi.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">{kpi.label}</p>
              <p className="text-xl font-bold text-stone-900">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 mb-6">Evolução de Gastos (6 meses)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last6Months}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c1917', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Line type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 mb-6">Custo por Equipamento</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costPerEquip}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c1917', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 mb-6">Consumo Médio por Combustível</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consumoByFuel}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c1917', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 mb-6">Consumo Médio por Equipamento</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consumoByEquip}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c1917', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
