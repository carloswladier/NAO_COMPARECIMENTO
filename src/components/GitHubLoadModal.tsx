import React, { useState } from 'react';
import { X, GitBranch, Download, AlertCircle, CheckCircle, ExternalLink, Globe, FileSpreadsheet } from 'lucide-react';
import { parseExcelWorkbook } from '../utils/excelParser';
import { NoShowRecord } from '../types';

interface GitHubLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (records: NoShowRecord[], fileName: string, detectedColumns: Record<string, string>) => void;
}

export const GitHubLoadModal: React.FC<GitHubLoadModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
}) => {
  const [gitHubUrl, setGitHubUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ count: number; name: string } | null>(null);

  if (!isOpen) return null;

  // Example public links
  const sampleLinks = [
    {
      name: 'Base Claro No-Show (Amostra no GitHub)',
      url: 'https://raw.githubusercontent.com/carloswladier/bases-claro/main/Base_Amostra_Claro_NoShow.xlsx',
    },
    {
      name: 'Base Homologação Operacional',
      url: 'https://raw.githubusercontent.com/carloswladier/bases-claro/main/Homologacao_NoShow_Operacoes.xlsx',
    },
  ];

  const handleLoadFromUrl = async (targetUrl: string) => {
    const raw = targetUrl.trim();
    if (!raw) {
      setError('Por favor informe a URL do arquivo no GitHub.');
      return;
    }

    setError(null);
    setSuccessInfo(null);
    setIsLoading(true);

    try {
      // Convert standard github.com/.../blob/... to raw.githubusercontent.com/...
      let cleanUrl = raw;
      if (cleanUrl.includes('github.com') && cleanUrl.includes('/blob/')) {
        cleanUrl = cleanUrl
          .replace('github.com', 'raw.githubusercontent.com')
          .replace('/blob/', '/');
      }

      // Extract file name
      let fileName = 'arquivo_github.xlsx';
      try {
        const urlObj = new URL(cleanUrl);
        const segments = urlObj.pathname.split('/');
        const last = segments[segments.length - 1];
        if (last && (last.endsWith('.xlsx') || last.endsWith('.xls') || last.endsWith('.csv'))) {
          fileName = decodeURIComponent(last);
        }
      } catch (e) {}

      let buffer: ArrayBuffer | null = null;

      // First attempt: direct fetch from raw github URL
      try {
        const response = await fetch(cleanUrl, { mode: 'cors' });
        if (response.ok) {
          buffer = await response.arrayBuffer();
        }
      } catch (corsErr) {
        console.warn('Tentativa direta no GitHub falhou (CORS), acionando proxy do backend...');
      }

      // Second attempt: backend proxy endpoint if direct fetch failed
      if (!buffer) {
        const proxyRes = await fetch(`/api/github-fetch?url=${encodeURIComponent(cleanUrl)}`);
        if (!proxyRes.ok) {
          const errData = await proxyRes.json().catch(() => null);
          throw new Error(
            errData?.error || `Falha ao baixar arquivo do GitHub (HTTP ${proxyRes.status}). Verifique se o link é público e válido.`
          );
        }
        buffer = await proxyRes.arrayBuffer();
      }

      if (!buffer || buffer.byteLength === 0) {
        throw new Error('O arquivo recebido do GitHub está vazio.');
      }

      // Parse Excel workbook
      const { records, detectedColumns } = parseExcelWorkbook(buffer);

      if (records.length === 0) {
        throw new Error('Nenhum registro operacional válido foi identificado na planilha carregada do GitHub.');
      }

      setSuccessInfo({ count: records.length, name: fileName });

      setTimeout(() => {
        onDataLoaded(records, `GitHub: ${fileName}`, detectedColumns);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar e processar o arquivo do GitHub.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-full bg-white/10 text-white">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Carregar Planilha Direto do GitHub</h3>
              <p className="text-xs text-slate-400">Importação automática via URL de repositório público ou raw</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* Input field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              URL do Arquivo Excel no GitHub (.xlsx, .xls ou .csv)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="https://github.com/usuario/repositorio/blob/main/base.xlsx"
                value={gitHubUrl}
                onChange={(e) => setGitHubUrl(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-[#DA291C] focus:ring-1 focus:ring-[#DA291C] font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Cole o link direto do repositório ou o link do botão "Raw" no GitHub.
            </p>
          </div>

          {/* Quick preset links */}
          <div>
            <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
              Exemplos e Repositórios Pré-configurados:
            </span>
            <div className="space-y-1.5">
              {sampleLinks.map((sample) => (
                <button
                  key={sample.name}
                  type="button"
                  onClick={() => {
                    setGitHubUrl(sample.url);
                    handleLoadFromUrl(sample.url);
                  }}
                  className="w-full text-left p-2 rounded border border-slate-200 hover:border-[#DA291C] hover:bg-red-50/50 transition-colors flex items-center justify-between text-xs group"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#DA291C] shrink-0" />
                    <span className="font-semibold text-slate-800 group-hover:text-[#DA291C] truncate">
                      {sample.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                    Carregar agora →
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Loading status */}
          {isLoading && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center gap-2 text-xs font-semibold text-slate-700">
              <div className="w-4 h-4 border-2 border-[#DA291C] border-t-transparent rounded-full animate-spin" />
              Baixando arquivo do GitHub e processando dados analíticos...
            </div>
          )}

          {/* Success message */}
          {successInfo && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-2 text-xs text-emerald-800 font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Sucesso! <strong>{successInfo.count}</strong> registros carregados de{' '}
                <em>{successInfo.name}</em>.
              </span>
            </div>
          )}

          {/* Error alert */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-50 p-2.5 rounded-md text-[11px] text-slate-500 border border-slate-200">
            <strong>Dica de integração contínua:</strong> Você pode manter a planilha atualizada no GitHub e sincronizar o painel com apenas um clique a qualquer momento.
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Cancelar
          </button>

          <button
            onClick={() => handleLoadFromUrl(gitHubUrl)}
            disabled={isLoading || !gitHubUrl.trim()}
            className="px-4 py-1.5 text-xs font-bold rounded-md bg-[#DA291C] hover:bg-[#B31B10] text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            {isLoading ? 'Carregando...' : 'Carregar do GitHub'}
          </button>
        </div>

      </div>
    </div>
  );
};
