import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Google OAuth Setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/auth/callback`
);

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

// API Routes
app.get("/api/auth/url", (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ 
      error: "Configuração do Google incompleta no servidor. Faltam GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET." 
    });
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
  res.json({ url: authUrl });
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    // In a real app, you'd store this in a secure session/cookie
    // For this demo, we'll send it back to the client to store in localStorage (not ideal for production but works for PWA demo)
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Autenticação concluída. Esta janela fechará automaticamente.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    res.status(500).send("Authentication failed");
  }
});

// Proxy for Google Sheets API to avoid CORS and keep tokens on server if needed
// But for simplicity in this PWA, we'll let the client handle tokens for now, 
// or provide a simple proxy if they want to use the server.
app.post("/api/sheets/sync", async (req, res) => {
  const { tokens, spreadsheetId, data } = req.body;
  if (!tokens) return res.status(401).json({ error: "No tokens provided" });

  try {
    oauth2Client.setCredentials(tokens);
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    // 1. Check if spreadsheet exists, if not create or use provided
    let targetId = spreadsheetId;
    if (!targetId) {
      const response = await sheets.spreadsheets.create({
        requestBody: {
          properties: { title: "AKA ABASTECE - Dados de Abastecimento" },
        },
      });
      targetId = response.data.spreadsheetId;
      
      // Add headers
      await sheets.spreadsheets.values.append({
        spreadsheetId: targetId,
        range: "Sheet1!A1",
        valueInputOption: "RAW",
        requestBody: {
          values: [
            ["UUID", "Data", "Obra ID", "Obra Nome", "Equipamento ID", "Equipamento Nome", "Tipo", "Medição", "Litros", "Combustível", "Preço/Litro", "Valor Total", "Consumo Médio", "Custo por Unidade", "Responsável", "NF", "Requisição", "Observações", "Data Sync"]
          ],
        },
      });
    }

    // 2. Get existing IDs to avoid duplicates
    const existingDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: targetId,
      range: "Sheet1!A:A",
    });
    const existingIds = new Set((existingDataResponse.data.values || []).map(row => row[0]));

    // 3. Filter data to only include new records
    const newRecords = data.filter((item: any) => !existingIds.has(item.id));

    if (newRecords.length > 0) {
      const values = newRecords.map((item: any) => [
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

      await sheets.spreadsheets.values.append({
        spreadsheetId: targetId,
        range: "Sheet1!A2",
        valueInputOption: "RAW",
        requestBody: { values },
      });
    }

    res.json({ success: true, spreadsheetId: targetId, addedCount: newRecords.length });
  } catch (error: any) {
    console.error("Sheets sync error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sheets/fetch", async (req, res) => {
  const { tokens, spreadsheetId } = req.body;
  if (!tokens) return res.status(401).json({ error: "No tokens provided" });
  if (!spreadsheetId) return res.status(400).json({ error: "No spreadsheet ID provided" });

  try {
    oauth2Client.setCredentials(tokens);
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A2:S", // Adjusted range for new columns
    });

    const rows = response.data.values || [];
    // Map rows back to objects
    const data = rows.map(row => ({
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

    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Sheets fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
