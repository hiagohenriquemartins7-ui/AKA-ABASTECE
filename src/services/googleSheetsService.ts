import { db } from '../db/db';
import { Abastecimento, User } from '../types';

export const googleSheetsService = {
  async getSpreadsheetId(): Promise<string | null> {
    const setting = await db.settings.get('spreadsheet_id');
    return setting?.value || null;
  },

  async setSpreadsheetId(id: string) {
    await db.settings.put({ key: 'spreadsheet_id', value: id });
  },

  async getProxyUrl(): Promise<string | null> {
    const setting = await db.settings.get('google_proxy_url');
    return setting?.value || null;
  },

  async setProxyUrl(url: string) {
    await db.settings.put({ key: 'google_proxy_url', value: url });
  },

  async exportToSheets(data: any[]) {
    const proxyUrl = await db.settings.get('google_proxy_url');
    
    if (proxyUrl?.value) {
      // Direct integration via Apps Script (No Login Required)
      const values = data.map((item: any) => [
        item.id,
        item.data,
        item.obra_id,
        item.obra_nome,
        item.equipamento_id,
        item.equipamento_nome,
        item.equipamento_tipo,
        item.medicao_inicial,
        item.litros,
        item.combustivel,
        item.preco_litro,
        item.valor_total,
        item.consumo_medio_calculado,
        item.custo_por_unidade,
        item.responsavel,
        item.nf,
        item.requisicao,
        item.observacoes,
        new Date().toISOString()
      ]);

      try {
        await fetch(proxyUrl.value, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'export', records: values })
        });
        // With no-cors we can't read the response, so we assume success if no error thrown
        return { success: true };
      } catch (err) {
        console.error('Apps Script Export Error:', err);
        throw new Error('Falha ao enviar dados para o Script. Verifique a URL.');
      }
    }

    // Fallback to OAuth (requires connection)
    const tokens = localStorage.getItem('google_tokens');
    const spreadsheetId = await this.getSpreadsheetId();
    
    if (!tokens) throw new Error('Google account not connected');
    
    const response = await fetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens: JSON.parse(tokens),
        spreadsheetId,
        data
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    
    if (!spreadsheetId && result.spreadsheetId) {
      await this.setSpreadsheetId(result.spreadsheetId);
    }
    
    return result;
  },

  async importFromSheets(user: User) {
    const proxyUrl = await db.settings.get('google_proxy_url');
    
    let remoteData = [];

    if (proxyUrl?.value) {
      // Direct integration via Apps Script
      const response = await fetch(proxyUrl.value);
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error('A URL do Script não retornou um JSON válido. Verifique se foi implantado como "Qualquer pessoa".');
      }
      
      if (!result.success) throw new Error('Erro ao buscar dados do script');
      
      // Map rows (excluding header)
      const rows = result.data.slice(1);
      remoteData = rows.map((row: any) => ({
        id: row[0],
        data: row[1],
        obra_id: row[2],
        obra_nome: row[3],
        equipamento_id: row[4],
        equipamento_nome: row[5],
        equipamento_tipo: row[6],
        medicao_inicial: Number(row[7]),
        litros: Number(row[8]),
        combustivel: row[9],
        preco_litro: Number(row[10]),
        valor_total: Number(row[11]),
        consumo_medio_calculado: Number(row[12]),
        custo_por_unidade: Number(row[13]),
        responsavel: row[14],
        nf: row[15],
        requisicao: row[16],
        observacoes: row[17],
      }));
    } else {
      // OAuth flow
      const tokens = localStorage.getItem('google_tokens');
      const spreadsheetId = await this.getSpreadsheetId();
      
      if (!tokens) throw new Error('Google account not connected');
      if (!spreadsheetId) throw new Error('Spreadsheet ID not configured');
      
      const response = await fetch('/api/sheets/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: JSON.parse(tokens),
          spreadsheetId
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      remoteData = result.data;
    }

    // Filter data if user is an OPERADOR
    if (user.role === 'OPERADOR') {
      remoteData = remoteData.filter((item: any) => user.obras_permitidas.includes(item.obra_id));
    }

    let importedCount = 0;

    // Use a transaction for better performance and consistency
    await db.transaction('rw', db.abastecimentos, async () => {
      for (const item of remoteData) {
        const exists = await db.abastecimentos.get(item.id);
        if (!exists) {
          await db.abastecimentos.add({
            ...item,
            sync_status: 'SYNCED',
            created_at: new Date().toISOString()
          });
          importedCount++;
        }
      }
    });

    return importedCount;
  }
};
