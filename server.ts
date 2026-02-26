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
          properties: { title: "AbastecePro - Dados de Abastecimento" },
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
            ["UUID", "Data", "Equipamento", "Tipo", "Medição", "Litros", "Combustível", "Preço/Litro", "Valor Total", "Consumo Médio", "Custo por Unidade", "Responsável", "NF", "Requisição", "Observações", "Data Sync"]
          ],
        },
      });
    }

    // 2. Append data
    const values = data.map((item: any) => [
      item.id,
      item.data,
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

    res.json({ success: true, spreadsheetId: targetId });
  } catch (error: any) {
    console.error("Sheets sync error:", error);
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
