import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { parseExcelWorkbook } from '../utils/excelParser';
import { NoShowRecord } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (records: NoShowRecord[], fileName: string, detectedColumns: Record<string, string>) => void;
  onDownloadTemplate: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
  onDownloadTemplate,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ count: number; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = async (file: File) => {
    setError(null);
    setSuccessInfo(null);
    setIsLoading(true);

    try {
      const allowedExts = ['.xlsx', '.xls', '.csv'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedExts.includes(fileExt)) {
        throw new Error('Formato inválido. Por favor envie um arquivo com extensão .xlsx, .xls ou .csv.');
      }

      const buffer = await file.arrayBuffer();
      const { records, totalRows, detectedColumns } = parseExcelWorkbook(buffer);

      if (records.length === 0) {
        throw new Error('O arquivo não contém linhas de dados válidas.');
      }

      setSuccessInfo({ count: records.length, name: file.name });
      setTimeout(() => {
        onDataLoaded(records, file.name, detectedColumns);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Falha ao processar a planilha. Verifique a estrutura do arquivo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#DA291C] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-white/20">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Upload de Base Excel</h3>
              <p className="text-xs text-red-100">Planilha de Casos de Não Comparecimento (No-Show)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#DA291C] bg-red-50/70 scale-[1.01]'
                : 'border-slate-300 hover:border-[#DA291C] hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processFile(e.target.files[0]);
                }
              }}
            />

            <div className="w-12 h-12 rounded-full bg-red-50 text-[#DA291C] mx-auto flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 stroke-[2]" />
            </div>

            <p className="text-sm font-bold text-slate-800">
              Arraste e solte sua planilha Excel aqui
            </p>
            <p className="text-xs text-slate-500 mt-1">
              ou clique para selecionar do computador (.xlsx, .xls, .csv)
            </p>

            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#DA291C]" />
              Suporta formato nativo Claro Operações
            </div>
          </div>

          {/* Loading status */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 py-2">
              <div className="w-4 h-4 border-2 border-[#DA291C] border-t-transparent rounded-full animate-spin" />
              Lendo abas, cabeçalhos e linhas da planilha...
            </div>
          )}

          {/* Success state */}
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

          {/* Guidance / Template Link */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <span>Colunas Mapeadas Automaticamente:</span>
              <button
                onClick={onDownloadTemplate}
                className="text-[#DA291C] hover:underline font-semibold flex items-center gap-1 text-[11px]"
              >
                <Download className="w-3 h-3" />
                Baixar Modelo .xlsx
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Mês, Cidade, Origem, Técnico, UN, Tipo OS, TP_FECHAMENTO_OS, Data Agenda, Código Baixa, REGRA FINAL, Área, TEC1, Status Geoloc, OBJETIVO_URA, STATUS_LIGACAO e Node.
            </p>
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
        </div>

      </div>
    </div>
  );
};
