export type SyncStatus = 'PENDING' | 'SYNCED' | 'ERROR';
export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'EQUIPAMENTO' | 'ABASTECIMENTO';
export type MedicaoTipo = 'KM' | 'HORIMETRO';

export interface Obra {
  id: string;
  nome: string;
  localizacao: string;
  status: 'Ativo' | 'Inativo';
  created_at: string;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  password?: string;
  role: 'MASTER' | 'OPERADOR';
  obras_permitidas: string[]; // IDs of Obras
  created_at: string;
}

export interface Equipamento {
  id: string;
  obra_id: string;
  nome: string;
  tipo: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  tipo_medicao: MedicaoTipo;
  combustivel_padrao: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Abastecimento {
  id: string;
  obra_id: string;
  equipamento_id: string;
  data: string;
  medicao_inicial: number;
  medicao_anterior?: number; // Added for tracking
  medicao_final: number;
  litros: number;
  combustivel: string;
  preco_litro: number;
  valor_total: number;
  consumo_medio_calculado: number;
  custo_por_unidade: number;
  responsavel: string;
  nf: string;
  requisicao: string;
  observacoes: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at?: string;
  last_updated_by?: string;
}

export interface SyncQueueItem {
  id?: number;
  entity_type: EntityType;
  entity_id: string;
  action_type: ActionType;
  payload_json: string;
  retry_count: number;
  last_attempt?: string;
  status: SyncStatus;
}
