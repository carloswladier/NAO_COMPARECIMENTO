import { FcaItem, HostingerDbConfig } from '../types';

const LOCAL_STORAGE_KEY = 'claro_noshow_fca_records';

export interface HostingerStatusResponse {
  connected: boolean;
  message: string;
  config?: {
    host: string;
    port: number;
    database: string;
    user: string;
    hasPassword: boolean;
  } | null;
}

// Helper to get from localStorage
function getLocalFcas(): FcaItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler localStorage FCA:', e);
  }
  return [];
}

// Helper to save to localStorage
function saveLocalFcas(fcas: FcaItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fcas));
  } catch (e) {
    console.error('Erro ao salvar localStorage FCA:', e);
  }
}

export const fcaApi = {
  // Fetch all FCAs (tries API, falls back to localStorage)
  async getFcas(): Promise<{ data: FcaItem[]; source: 'hostinger' | 'local' }> {
    try {
      const res = await fetch('/api/fca');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // Sync to localStorage as backup
          saveLocalFcas(json.data);
          return { data: json.data, source: json.source || 'local' };
        }
      }
    } catch (err) {
      console.warn('API /api/fca indisponível, usando fallback local:', err);
    }

    return { data: getLocalFcas(), source: 'local' };
  },

  // Save or update an FCA
  async saveFca(fca: Partial<FcaItem> & { tecnico: string; un: string; fato: string }): Promise<{
    data: FcaItem;
    source: 'hostinger' | 'local';
    message: string;
  }> {
    const isUpdate = Boolean(fca.id);
    const endpoint = isUpdate ? `/api/fca/${fca.id}` : '/api/fca';
    const method = isUpdate ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fca),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          // Update localStorage mirror
          const localList = getLocalFcas().filter((i) => i.id !== json.data.id);
          localList.unshift(json.data);
          saveLocalFcas(localList);

          return {
            data: json.data,
            source: json.source || 'local',
            message: json.message || (json.source === 'hostinger' ? 'Salvo no Hostinger MySQL' : 'Salvo localmente'),
          };
        }
      }
    } catch (err) {
      console.warn('Erro ao chamar API de gravação FCA:', err);
    }

    // Fallback: save to localStorage directly
    const currentList = getLocalFcas();
    const now = new Date().toISOString();
    let savedItem: FcaItem;

    if (isUpdate && fca.id) {
      const existing = currentList.find((i) => i.id === fca.id);
      savedItem = {
        ...(existing || {}),
        ...fca,
        id: fca.id,
        tecnico: fca.tecnico,
        un: fca.un,
        mes: fca.mes || '',
        dataFato: fca.dataFato || now.split('T')[0],
        fato: fca.fato,
        causa: fca.causa || '',
        acao: fca.acao || '',
        prazo: fca.prazo || '',
        responsavel: fca.responsavel || '',
        status: fca.status || 'Pendente',
        evidencias: fca.evidencias || [],
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      const filtered = currentList.filter((i) => i.id !== fca.id);
      filtered.unshift(savedItem);
      saveLocalFcas(filtered);
    } else {
      savedItem = {
        id: `fca_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tecnico: fca.tecnico,
        un: fca.un,
        mes: fca.mes || '',
        contrato: fca.contrato || '',
        dataFato: fca.dataFato || now.split('T')[0],
        fato: fca.fato,
        causa: fca.causa || '',
        acao: fca.acao || '',
        prazo: fca.prazo || '',
        responsavel: fca.responsavel || '',
        status: fca.status || 'Pendente',
        evidencias: fca.evidencias || [],
        createdAt: now,
        updatedAt: now,
      };
      currentList.unshift(savedItem);
      saveLocalFcas(currentList);
    }

    return {
      data: savedItem,
      source: 'local',
      message: 'Salvo localmente no navegador (Conecte ao Hostinger para sincronização em nuvem).',
    };
  },

  // Delete an FCA
  async deleteFca(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/fca/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const list = getLocalFcas().filter((i) => i.id !== id);
          saveLocalFcas(list);
          return true;
        }
      }
    } catch (err) {
      console.warn('Erro ao chamar API de exclusão FCA:', err);
    }

    const list = getLocalFcas().filter((i) => i.id !== id);
    saveLocalFcas(list);
    return true;
  },

  // Get Hostinger Connection Status
  async getHostingerStatus(): Promise<HostingerStatusResponse> {
    try {
      const res = await fetch('/api/hostinger/status');
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Erro ao consultar status Hostinger:', err);
    }

    return {
      connected: false,
      message: 'Servidor local ativo. Configure as credenciais do Hostinger MySQL.',
      config: null,
    };
  },

  // Test and save Hostinger Config
  async saveHostingerConfig(config: HostingerDbConfig): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/hostinger/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, message: json.message };
      } else {
        return { success: false, message: json.error || 'Falha ao conectar ao banco Hostinger.' };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro de rede ao conectar com o servidor.' };
    }
  },
};
