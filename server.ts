import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Support large payload for base64 photo evidences
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const FCA_FILE = path.join(DATA_DIR, 'fca_records.json');
const HOSTINGER_CONFIG_FILE = path.join(DATA_DIR, 'hostinger_config.json');

// Initialize local JSON files if they don't exist
if (!fs.existsSync(FCA_FILE)) {
  fs.writeFileSync(FCA_FILE, JSON.stringify([], null, 2), 'utf-8');
}

interface HostingerConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
}

let hostingerPool: mysql.Pool | null = null;
let hostingerConnected = false;
let hostingerStatusMessage = 'Banco Hostinger não configurado. Utilizando armazenamento local seguro.';

function loadHostingerConfig(): HostingerConfig | null {
  if (process.env.HOSTINGER_DB_HOST && process.env.HOSTINGER_DB_NAME && process.env.HOSTINGER_DB_USER) {
    return {
      host: process.env.HOSTINGER_DB_HOST,
      port: Number(process.env.HOSTINGER_DB_PORT) || 3306,
      database: process.env.HOSTINGER_DB_NAME,
      user: process.env.HOSTINGER_DB_USER,
      password: process.env.HOSTINGER_DB_PASSWORD || '',
    };
  }

  if (fs.existsSync(HOSTINGER_CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(HOSTINGER_CONFIG_FILE, 'utf-8'));
      if (data && data.host && data.database && data.user) {
        return data;
      }
    } catch (e) {
      console.error('Erro ao ler hostinger_config.json:', e);
    }
  }
  return null;
}

async function initHostingerPool(config: HostingerConfig): Promise<boolean> {
  try {
    if (hostingerPool) {
      await hostingerPool.end().catch(() => {});
      hostingerPool = null;
    }

    hostingerPool = mysql.createPool({
      host: config.host,
      port: config.port || 3306,
      user: config.user,
      password: config.password || '',
      database: config.database,
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 7000,
      queueLimit: 0,
    });

    // Test connection
    const connection = await hostingerPool.getConnection();
    await connection.ping();

    // Create table if not exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS fca_actions (
        id VARCHAR(64) PRIMARY KEY,
        tecnico VARCHAR(100) NOT NULL,
        un VARCHAR(100) NOT NULL,
        mes VARCHAR(50),
        contrato VARCHAR(100),
        data_fato VARCHAR(50),
        fato TEXT,
        causa TEXT,
        acao TEXT,
        prazo VARCHAR(50),
        responsavel VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Pendente',
        evidencias_json LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    connection.release();
    hostingerConnected = true;
    hostingerStatusMessage = `Conectado com sucesso ao Hostinger MySQL (${config.host} / ${config.database})`;
    console.log('[Hostinger MySQL] Conexão estabelecida e tabela fca_actions validada.');
    return true;
  } catch (err: any) {
    hostingerConnected = false;
    hostingerStatusMessage = `Falha na conexão Hostinger MySQL: ${err.message || 'Erro de rede/credenciais'}. Modo local ativo.`;
    console.warn('[Hostinger MySQL] Aviso de conexão:', err.message);
    return false;
  }
}

// Auto connect on startup if config is present
const initialConfig = loadHostingerConfig();
if (initialConfig) {
  initHostingerPool(initialConfig).catch(() => {});
}

// Helper to read local JSON
function getLocalFcas(): any[] {
  try {
    if (fs.existsSync(FCA_FILE)) {
      return JSON.parse(fs.readFileSync(FCA_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Erro ao ler FCA local:', err);
  }
  return [];
}

// Helper to write local JSON
function saveLocalFcas(fcas: any[]) {
  try {
    fs.writeFileSync(FCA_FILE, JSON.stringify(fcas, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar FCA local:', err);
  }
}

// ================= API ROUTES =================

// 1. GET /api/fca - List all FCAs
app.get('/api/fca', async (req, res) => {
  try {
    if (hostingerConnected && hostingerPool) {
      try {
        const [rows] = await hostingerPool.query(
          'SELECT * FROM fca_actions ORDER BY created_at DESC'
        );
        const mapped = (rows as any[]).map((r) => {
          let evidencias = [];
          try {
            evidencias = r.evidencias_json ? JSON.parse(r.evidencias_json) : [];
          } catch (e) {}
          return {
            id: r.id,
            tecnico: r.tecnico,
            un: r.un,
            mes: r.mes || '',
            contrato: r.contrato || '',
            dataFato: r.data_fato || '',
            fato: r.fato || '',
            causa: r.causa || '',
            acao: r.acao || '',
            prazo: r.prazo || '',
            responsavel: r.responsavel || '',
            status: r.status || 'Pendente',
            evidencias,
            createdAt: r.created_at || new Date().toISOString(),
            updatedAt: r.updated_at || new Date().toISOString(),
          };
        });
        // Sync local mirror
        saveLocalFcas(mapped);
        return res.json({ success: true, source: 'hostinger', data: mapped });
      } catch (dbErr: any) {
        console.warn('Erro ao consultar Hostinger MySQL, usando fallback local:', dbErr.message);
      }
    }

    const localList = getLocalFcas();
    return res.json({ success: true, source: 'local', data: localList });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST /api/fca - Create new FCA
app.post('/api/fca', async (req, res) => {
  try {
    const fca = req.body;
    if (!fca.tecnico || !fca.un || !fca.fato) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios: técnico, UN e fato.' });
    }

    const newId = fca.id || `fca_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id: newId,
      tecnico: fca.tecnico,
      un: fca.un,
      mes: fca.mes || '',
      contrato: fca.contrato || '',
      dataFato: fca.dataFato || new Date().toISOString().split('T')[0],
      fato: fca.fato,
      causa: fca.causa || '',
      acao: fca.acao || '',
      prazo: fca.prazo || '',
      responsavel: fca.responsavel || '',
      status: fca.status || 'Pendente',
      evidencias: fca.evidencias || [],
      createdAt: fca.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let savedToHostinger = false;
    if (hostingerConnected && hostingerPool) {
      try {
        await hostingerPool.query(
          `INSERT INTO fca_actions (
            id, tecnico, un, mes, contrato, data_fato, fato, causa, acao, prazo, responsavel, status, evidencias_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            tecnico = VALUES(tecnico),
            un = VALUES(un),
            mes = VALUES(mes),
            contrato = VALUES(contrato),
            data_fato = VALUES(data_fato),
            fato = VALUES(fato),
            causa = VALUES(causa),
            acao = VALUES(acao),
            prazo = VALUES(prazo),
            responsavel = VALUES(responsavel),
            status = VALUES(status),
            evidencias_json = VALUES(evidencias_json)`,
          [
            record.id,
            record.tecnico,
            record.un,
            record.mes,
            record.contrato,
            record.dataFato,
            record.fato,
            record.causa,
            record.acao,
            record.prazo,
            record.responsavel,
            record.status,
            JSON.stringify(record.evidencias),
          ]
        );
        savedToHostinger = true;
      } catch (dbErr: any) {
        console.warn('Erro ao inserir no Hostinger MySQL:', dbErr.message);
      }
    }

    // Always mirror in local JSON
    const localList = getLocalFcas().filter((item) => item.id !== record.id);
    localList.unshift(record);
    saveLocalFcas(localList);

    return res.json({
      success: true,
      data: record,
      source: savedToHostinger ? 'hostinger' : 'local',
      message: savedToHostinger ? 'FCA gravado no banco de dados Hostinger.' : 'FCA salvo localmente.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. PUT /api/fca/:id - Update existing FCA
app.put('/api/fca/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fca = req.body;

    const record = {
      ...fca,
      id,
      updatedAt: new Date().toISOString(),
    };

    let savedToHostinger = false;
    if (hostingerConnected && hostingerPool) {
      try {
        await hostingerPool.query(
          `UPDATE fca_actions SET
            tecnico = ?, un = ?, mes = ?, contrato = ?, data_fato = ?, fato = ?,
            causa = ?, acao = ?, prazo = ?, responsavel = ?, status = ?, evidencias_json = ?
          WHERE id = ?`,
          [
            record.tecnico,
            record.un,
            record.mes || '',
            record.contrato || '',
            record.dataFato || '',
            record.fato || '',
            record.causa || '',
            record.acao || '',
            record.prazo || '',
            record.responsavel || '',
            record.status || 'Pendente',
            JSON.stringify(record.evidencias || []),
            id,
          ]
        );
        savedToHostinger = true;
      } catch (dbErr: any) {
        console.warn('Erro ao atualizar no Hostinger MySQL:', dbErr.message);
      }
    }

    const localList = getLocalFcas();
    const idx = localList.findIndex((item) => item.id === id);
    if (idx !== -1) {
      localList[idx] = record;
    } else {
      localList.unshift(record);
    }
    saveLocalFcas(localList);

    return res.json({
      success: true,
      data: record,
      source: savedToHostinger ? 'hostinger' : 'local',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. DELETE /api/fca/:id - Delete FCA
app.delete('/api/fca/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (hostingerConnected && hostingerPool) {
      try {
        await hostingerPool.query('DELETE FROM fca_actions WHERE id = ?', [id]);
      } catch (dbErr: any) {
        console.warn('Erro ao deletar no Hostinger MySQL:', dbErr.message);
      }
    }

    const localList = getLocalFcas().filter((item) => item.id !== id);
    saveLocalFcas(localList);

    return res.json({ success: true, message: 'FCA excluído com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. GET /api/hostinger/status - Check connection status
app.get('/api/hostinger/status', (req, res) => {
  const currentConfig = loadHostingerConfig();
  return res.json({
    connected: hostingerConnected,
    message: hostingerStatusMessage,
    config: currentConfig
      ? {
          host: currentConfig.host,
          port: currentConfig.port,
          database: currentConfig.database,
          user: currentConfig.user,
          hasPassword: Boolean(currentConfig.password),
        }
      : null,
  });
});

// 6. POST /api/hostinger/config - Test and save Hostinger credentials
app.post('/api/hostinger/config', async (req, res) => {
  try {
    const { host, port, database, user, password } = req.body;
    if (!host || !database || !user) {
      return res.status(400).json({
        success: false,
        error: 'Host, Banco de Dados e Usuário são obrigatórios.',
      });
    }

    const testConfig: HostingerConfig = {
      host: host.trim(),
      port: Number(port) || 3306,
      database: database.trim(),
      user: user.trim(),
      password: password !== undefined ? password : '',
    };

    const connected = await initHostingerPool(testConfig);

    if (connected) {
      // Save to config file
      fs.writeFileSync(HOSTINGER_CONFIG_FILE, JSON.stringify(testConfig, null, 2), 'utf-8');

      // Sync any existing local FCAs to Hostinger MySQL table
      const localFcas = getLocalFcas();
      if (localFcas.length > 0 && hostingerPool) {
        for (const record of localFcas) {
          try {
            await hostingerPool.query(
              `INSERT INTO fca_actions (
                id, tecnico, un, mes, contrato, data_fato, fato, causa, acao, prazo, responsavel, status, evidencias_json
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                tecnico = VALUES(tecnico),
                un = VALUES(un),
                mes = VALUES(mes),
                contrato = VALUES(contrato),
                data_fato = VALUES(data_fato),
                fato = VALUES(fato),
                causa = VALUES(causa),
                acao = VALUES(acao),
                prazo = VALUES(prazo),
                responsavel = VALUES(responsavel),
                status = VALUES(status),
                evidencias_json = VALUES(evidencias_json)`,
              [
                record.id,
                record.tecnico,
                record.un,
                record.mes || '',
                record.contrato || '',
                record.dataFato || '',
                record.fato || '',
                record.causa || '',
                record.acao || '',
                record.prazo || '',
                record.responsavel || '',
                record.status || 'Pendente',
                JSON.stringify(record.evidencias || []),
              ]
            );
          } catch (e) {}
        }
      }

      return res.json({
        success: true,
        connected: true,
        message: 'Conectado com sucesso ao Hostinger MySQL! Tabela fca_actions sincronizada.',
      });
    } else {
      return res.status(400).json({
        success: false,
        connected: false,
        error: hostingerStatusMessage,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. GET /api/github-fetch - Proxy file download from GitHub to avoid client-side CORS issues
app.get('/api/github-fetch', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '').trim();
    if (!rawUrl) {
      return res.status(400).json({ error: 'URL do GitHub é obrigatória.' });
    }

    // Convert github.com/.../blob/... to raw.githubusercontent.com/...
    let finalUrl = rawUrl;
    if (finalUrl.includes('github.com') && finalUrl.includes('/blob/')) {
      finalUrl = finalUrl
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');
    }

    const response = await fetch(finalUrl);
    if (!response.ok) {
      return res.status(response.status).json({
        error: `Falha ao carregar arquivo do GitHub (HTTP ${response.status}: ${response.statusText})`,
      });
    }

    const buffer = await response.arrayBuffer();
    const contentType =
      response.headers.get('content-type') || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'attachment; filename="github_claro_file.xlsx"');
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao buscar arquivo do GitHub' });
  }
});

// ================= VITE DEV OR STATIC PROD =================
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Servidor Claro No-Show rodando em http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar servidor:', err);
});
