import React from 'react';
import { Upload, Download, RefreshCw, SlidersHorizontal, FileSpreadsheet, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  fileName?: string;
  totalRecords: number;
  filteredCount: number;
  onOpenUpload: () => void;
  onDownloadTemplate: () => void;
  onLoadSample: () => void;
  onOpenMapping: () => void;
  onOpenGitHub: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  fileName,
  totalRecords,
  filteredCount,
  onOpenUpload,
  onDownloadTemplate,
  onLoadSample,
  onOpenMapping,
  onOpenGitHub,
}) => {
  return (
    <header className="bg-[#DA291C] text-white shadow-md border-b border-[#B31B10]">
      {/* Top Banner with Brand Identity */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand & Wordmark */}
          <div className="flex items-center gap-3.5">
            {/* Claro Symbol SVG */}
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
              <svg viewBox="0 0 100 100" className="w-7 h-7 text-[#DA291C] fill-current">
                <circle cx="50" cy="50" r="46" fill="#DA291C" />
                <path
                  d="M50 18 C32.3 18 18 32.3 18 50 C18 67.7 32.3 82 50 82 C67.7 82 82 67.7 82 50 C82 32.3 67.7 18 50 18 Z M50 25 C63.8 25 75 36.2 75 50 C75 63.8 63.8 75 50 75 C36.2 75 25 63.8 25 50 C25 36.2 36.2 25 50 25 Z"
                  fill="#FFFFFF"
                />
                <circle cx="50" cy="50" r="14" fill="#FFFFFF" />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight">Claro</span>
                <span className="text-white/60 font-light">|</span>
                <h1 className="text-base font-bold text-white tracking-tight">
                  Gestão Operacional de Campo: Diagnóstico de Não Comparecimento (No-Show)
                </h1>
              </div>
              <p className="text-xs text-red-100/90 font-normal mt-0.5">
                Auditoria de Ordens de Serviço, Ofensores de Baixa, Geolocalização e Contato URA
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenGitHub}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 whitespace-nowrap"
              title="Carregar arquivo Excel diretamente de um link ou repositório do GitHub"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Carregar do GitHub
            </button>

            <button
              onClick={onOpenMapping}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 whitespace-nowrap"
              title="Verificar correspondência das colunas da planilha"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Colunas Excel
            </button>

            <button
              onClick={onDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 whitespace-nowrap"
              title="Baixar planilha Excel com as colunas A a AL configuradas"
            >
              <Download className="w-3.5 h-3.5" />
              Planilha Modelo (.xlsx)
            </button>

            <button
              onClick={onLoadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 whitespace-nowrap"
              title="Recarregar base com dados de exemplo de operações Claro"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Carregar Amostra
            </button>

            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-md bg-white text-[#DA291C] hover:bg-red-50 shadow-sm transition-all whitespace-nowrap transform active:scale-95"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              Upload Arquivo Excel
            </button>
          </div>
        </div>

        {/* Status Line */}
        <div className="mt-3 pt-2.5 border-t border-white/15 flex flex-wrap items-center justify-between text-xs text-red-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-3.5 h-3.5 text-white/80" />
            <span>Origem dos Dados:</span>
            <strong className="text-white font-semibold">
              {fileName ? fileName : 'Nenhum arquivo carregado'}
            </strong>
          </div>

          <div className="flex items-center gap-3">
            <span>
              Total na Base: <strong className="text-white font-mono">{totalRecords.toLocaleString('pt-BR')}</strong> casos
            </span>
            <span>·</span>
            <span>
              Filtrados no Dashboard: <strong className="text-yellow-300 font-mono">{filteredCount.toLocaleString('pt-BR')}</strong> casos
            </span>
            {filteredCount < totalRecords && (
              <span className="bg-yellow-400 text-red-950 font-bold px-2 py-0.5 rounded text-[11px]">
                Filtros Ativos
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
