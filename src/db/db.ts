import Dexie, { type Table } from 'dexie';
import type { Equipamento, Abastecimento, SyncQueueItem, Obra, User } from '../types';

export class AppDatabase extends Dexie {
  equipamentos!: Table<Equipamento>;
  abastecimentos!: Table<Abastecimento>;
  obras!: Table<Obra>;
  users!: Table<User>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('AbasteceProDB');
    this.version(2).stores({
      equipamentos: 'id, obra_id, nome, placa, status',
      abastecimentos: 'id, obra_id, equipamento_id, data, sync_status',
      obras: 'id, nome, status',
      users: 'id, email, role',
      syncQueue: '++id, entity_type, entity_id, status'
    });
  }
}

export const db = new AppDatabase();
