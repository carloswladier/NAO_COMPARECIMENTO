import React from 'react';
import { EXPECTED_COLUMNS } from '../utils/excelParser';
import { X, SlidersHorizontal, CheckCircle2, Download, Info } from 'lucide-react';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectedColumns: Record<string, string>;
  onDownloadTemplate: () => void;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  onClose,
  detectedColumns,
  onDownloadTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#DA291C] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-white/20">
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Mapeamento de Colunas Excel</h3>
              <p className="text-xs text-red-100">
                Correspondência entre as colunas da planilha e os filtros do painel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            O sistema faz a leitura inteligente procurando tanto o cabeçalho oficial quanto a letra correspondente (Coluna A a AL).
          </span>
        </div>

        {/* Body list of columns */}
        <div className="p-4 overflow-y-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px] uppercase border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Coluna Padrão</th>
                <th className="py-2.5 px-3">Filtro / Dimensão</th>
                <th className="py-2.5 px-3">Coluna Identificada</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {EXPECTED_COLUMNS.map((col) => {
                const detectedName = detectedColumns[col.field] || `Coluna ${col.excelLetter}`;
                return (
                  <tr key={col.field} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                        Coluna {col.excelLetter}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      <div>{col.label}</div>
                      <span className="text-[10px] text-slate-400">{col.description}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {detectedName}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Ativo
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#DA291C] hover:bg-red-50 rounded border border-red-200"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar Modelo Pré-configurado
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded"
          >
            Concluir
          </button>
        </div>

      </div>
    </div>
  );
};
