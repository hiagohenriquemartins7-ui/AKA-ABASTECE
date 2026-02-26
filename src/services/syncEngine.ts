import { db } from '../db/db';
import type { SyncQueueItem, Abastecimento, Equipamento } from '../types';

class SyncEngine {
  private isSyncing = false;
  private syncInterval: number | null = null;

  start() {
    if (this.syncInterval) return;
    
    // Check every 30 seconds if online
    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine) {
        this.processQueue();
      }
    }, 30000);

    // Also listen for online event
    window.addEventListener('online', () => this.processQueue());
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async addToQueue(item: Omit<SyncQueueItem, 'retry_count' | 'status'>) {
    await db.syncQueue.add({
      ...item,
      retry_count: 0,
      status: 'PENDING'
    });
    
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;

    try {
      const pendingItems = await db.syncQueue
        .where('status')
        .equals('PENDING')
        .toArray();

      if (pendingItems.length === 0) {
        this.isSyncing = false;
        return;
      }

      const tokens = localStorage.getItem('google_tokens');
      if (!tokens) {
        console.warn('Sync delayed: No Google tokens found');
        this.isSyncing = false;
        return;
      }

      const spreadsheetId = localStorage.getItem('spreadsheet_id');

      // Group by entity type for batching if needed, but for now we'll just process all
      // We'll specifically focus on Abastecimentos for the Google Sheets sync as per requirements
      // We only sync CREATE and UPDATE to Google Sheets for now
      const abastecimentosToSync = pendingItems.filter(i => 
        i.entity_type === 'ABASTECIMENTO' && 
        (i.action_type === 'CREATE' || i.action_type === 'UPDATE')
      );
      
      const deletionsToProcess = pendingItems.filter(i => i.action_type === 'DELETE');
      
      // Process deletions (just remove from queue for now as server doesn't support sheet row deletion yet)
      for (const item of deletionsToProcess) {
        await db.syncQueue.delete(item.id!);
      }

      if (abastecimentosToSync.length > 0) {
        const dataToSync = await Promise.all(
          abastecimentosToSync.map(async (item) => {
            const payload = JSON.parse(item.payload_json) as Abastecimento;
            const equip = await db.equipamentos.get(payload.equipamento_id);
            return {
              ...payload,
              equipamento_nome: equip?.nome || 'N/A',
              equipamento_tipo: equip?.tipo || 'N/A'
            };
          })
        );

        const response = await fetch('/api/sheets/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens: JSON.parse(tokens),
            spreadsheetId,
            data: dataToSync
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.spreadsheetId) {
            localStorage.setItem('spreadsheet_id', result.spreadsheetId);
          }

          // Update local status
          for (const item of abastecimentosToSync) {
            await db.abastecimentos.update(item.entity_id, { sync_status: 'SYNCED' });
            await db.syncQueue.delete(item.id!);
          }
        } else {
          // Handle retry
          for (const item of abastecimentosToSync) {
            const newRetryCount = item.retry_count + 1;
            if (newRetryCount >= 5) {
              await db.syncQueue.update(item.id!, { status: 'ERROR', retry_count: newRetryCount });
              await db.abastecimentos.update(item.entity_id, { sync_status: 'ERROR' });
            } else {
              await db.syncQueue.update(item.id!, { retry_count: newRetryCount, last_attempt: new Date().toISOString() });
            }
          }
        }
      }

      // Process Equipamentos (maybe just local for now or add to another sheet)
      const equipamentosToSync = pendingItems.filter(i => i.entity_type === 'EQUIPAMENTO');
      for (const item of equipamentosToSync) {
        // For now, we just mark them as synced locally since the primary sync is for fueling
        await db.syncQueue.delete(item.id!);
      }

    } catch (error) {
      console.error('Sync process error:', error);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
