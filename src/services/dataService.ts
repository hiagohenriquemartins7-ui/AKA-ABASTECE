import * as XLSX from 'xlsx';
import { db } from '../db/db';
import { format } from 'date-fns';

export const exportToExcel = async () => {
  const abastecimentos = await db.abastecimentos.toArray();
  const equipamentos = await db.equipamentos.toArray();
  const obras = await db.obras.toArray();

  const data = abastecimentos.map(a => {
    const equip = equipamentos.find(e => e.id === a.equipamento_id);
    const obra = obras.find(o => o.id === a.obra_id);
    return {
      'Data': format(new Date(a.data), 'dd/MM/yyyy'),
      'Obra': obra?.nome || 'N/A',
      'Equipamento': equip?.nome || 'N/A',
      'KM ANTERIOR': a.medicao_anterior || 0,
      'KM ATUAL': a.medicao_inicial,
      'LITROS': a.litros,
      'NF': a.nf || '',
      'REQUISICAO': a.requisicao || '',
      'CONSUMO': a.consumo_medio_calculado.toFixed(2),
      'RESPONSAVEL': a.responsavel,
      // Hidden fields for internal use
      'ID': a.id,
      'Preço/Litro': a.preco_litro,
      'Valor Total': a.valor_total,
      'Observações': a.observacoes,
      'Última Atualização': a.updated_at ? format(new Date(a.updated_at), 'dd/MM/yyyy HH:mm') : 'N/A',
      'Atualizado por': a.last_updated_by || 'N/A'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Abastecimentos');
  
  XLSX.writeFile(workbook, `AbastecePro_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

export const importFromExcel = async (file: File) => {
  return new Promise<any[]>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // We need to map these back to our database structure
        // This is a simplified import for the demo
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
