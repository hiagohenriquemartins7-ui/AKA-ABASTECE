import Dexie, { type Table } from 'dexie';
import type { Equipamento, Abastecimento, SyncQueueItem, Obra, User } from '../types';

export class AppDatabase extends Dexie {
  equipamentos!: Table<Equipamento>;
  abastecimentos!: Table<Abastecimento>;
  obras!: Table<Obra>;
  users!: Table<User>;
  syncQueue!: Table<SyncQueueItem>;
  settings!: Table<{ key: string, value: any }>;

  constructor() {
    super('AbasteceProDB');
    this.version(3).stores({
      equipamentos: 'id, obra_id, nome, placa, status',
      abastecimentos: 'id, obra_id, equipamento_id, data, sync_status',
      obras: 'id, nome, status',
      users: 'id, email, role',
      syncQueue: '++id, entity_type, entity_id, status',
      settings: 'key'
    });
  }
}

export const db = new AppDatabase();
