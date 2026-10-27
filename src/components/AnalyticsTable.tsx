import React, { useState, useMemo } from 'react';
import { NoShowRecord } from '../types';
import { isGeolocIrregular } from '../utils/excelParser';
import {
  Table as TableIcon,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  MapPin,
  User,
  Radio,
  Calendar,
  Phone,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Helper to display "vazio" for blank, empty or null fields in the analytics
const renderVal = (val: any) => {
  if (val === null || val === undefined) {
    return <span className="text-slate-400 italic font-normal">vazio</span>;
  }
  const s = String(val).trim();
  if (
    !s ||
    s === '-' ||
    s === '—' ||
    s.toLowerCase() === 'vazio' ||
    s.toLowerCase() === 'sem dado' ||
    s.toLowerCase() === 'não informado' ||
    s.toLowerCase() === 'nao informado' ||
    s.toLowerCase() === 'null' ||
    s.toLowerCase() === 'undefined'
  ) {
    return <span className="text-slate-400 italic font-normal">vazio</span>;
  }
  return s;
};

interface AnalyticsTableProps {
  records: NoShowRecord[];
}

export const AnalyticsTable: React.FC<AnalyticsTableProps> = ({ records }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortField, setSortField] = useState<keyof NoShowRecord>('datAgenda');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<NoShowRecord | null>(null);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Available column toggles
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    datAgenda: true,
    contrato: true,
    mes: true,
    cidade: true,
    un: true,
    tecnico: true,
    baixa: true,
    regraFinal: true,
    itemVerb: true,
    descJanela: true,
    node: true,
    statusGeoloc: true,
    statusLigacao: true,
    objetivoUra: true,
    tec1: true,
    tipoOs: false,
    origem: false,
    tpFechamentoOs: false,
    area: false,
  });

  const columnLabels: Record<string, { label: string }> = {
    datAgenda: { label: 'Data Agenda' },
    contrato: { label: 'Contrato' },
    mes: { label: 'Mês' },
    cidade: { label: 'Cidade' },
    un: { label: 'UN' },
    tecnico: { label: 'Técnico' },
    baixa: { label: 'Código Baixa' },
    regraFinal: { label: 'REGRA FINAL' },
    itemVerb: { label: 'ITEM_VERB' },
    descJanela: { label: 'DESC_JANELA' },
    node: { label: 'Node' },
    statusGeoloc: { label: 'Status Geoloc' },
    statusLigacao: { label: 'STATUS_LIGACAO' },
    objetivoUra: { label: 'OBJETIVO_URA_2' },
    tec1: { label: 'TEC1' },
    tipoOs: { label: 'Tipo OS' },
    origem: { label: 'ORIGEM' },
    tpFechamentoOs: { label: 'TP_FECHAMENTO_OS' },
    area: { label: 'Área' },
  };

  // Filter records by local table search
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase();

    return records.filter((rec) => {
      return (
        rec.contrato.toLowerCase().includes(term) ||
        rec.itemVerb.toLowerCase().includes(term) ||
        rec.descJanela.toLowerCase().includes(term) ||
        rec.cidade.toLowerCase().includes(term) ||
        rec.tecnico.toLowerCase().includes(term) ||
        rec.baixa.toLowerCase().includes(term) ||
        rec.un.toLowerCase().includes(term) ||
        rec.node.toLowerCase().includes(term) ||
        rec.tipoOs.toLowerCase().includes(term) ||
        rec.statusGeoloc.toLowerCase().includes(term) ||
        rec.statusLigacao.toLowerCase().includes(term) ||
        rec.objetivoUra.toLowerCase().includes(term) ||
        (rec.tec1 && rec.tec1.toLowerCase().includes(term)) ||
        rec.datAgenda.includes(term) ||
        rec.id.toLowerCase().includes(term)
      );
    });
  }, [records, searchTerm]);

  // Sort records
  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      const valA = String(a[sortField] || '');
      const valB = String(b[sortField] || '');
      const cmp = valA.localeCompare(valB, 'pt-BR', { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [filteredRecords, sortField, sortAsc]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const handleSort = (field: keyof NoShowRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Export filtered analytical dataset to Excel
  const handleExportFiltered = () => {
    if (sortedRecords.length === 0) return;

    const exportVal = (val: any) => {
      if (val === null || val === undefined) return 'vazio';
      const s = String(val).trim();
      if (!s || s === '-' || s.toLowerCase() === 'sem dado' || s.toLowerCase() === 'vazio') return 'vazio';
      return s;
    };

    const exportRows = sortedRecords.map((r, index) => ({
      'Item': index + 1,
      'CONTRATO': exportVal(r.contrato),
      'MÊS': exportVal(r.mes),
      'CIDADE': exportVal(r.cidade),
      'ORIGEM': exportVal(r.origem),
      'TECNICO': exportVal(r.tecnico),
      'UN': exportVal(r.un),
      'TIPO_OS': exportVal(r.tipoOs),
      'ITEM_VERB': exportVal(r.itemVerb),
      'DESC_JANELA': exportVal(r.descJanela),
      'TP_FECHAMENTO_OS': exportVal(r.tpFechamentoOs),
      'DAT_AGENDA': exportVal(r.datAgenda),
      'BAIXA': exportVal(r.baixa),
      'REGRA_FINAL': exportVal(r.regraFinal),
      'AREA': exportVal(r.area),
      'TEC1': exportVal(r.tec1),
      'STATUS_GEOLOC': exportVal(r.statusGeoloc),
      'OBJETIVO_URA_2': exportVal(r.objetivoUra),
      'STATUS_LIGACAO': exportVal(r.statusLigacao),
      'NODE': exportVal(r.node),
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ANALITICO_FILTRADO');
    XLSX.writeFile(wb, `Claro_Analitico_Nao_Comparecimento_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs mb-8">
      
      {/* Header bar of the analytical area */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[#DA291C] text-white">
            <TableIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Espaço dos Dados do Analítico
              </h2>
              <span className="bg-red-50 text-[#DA291C] text-xs font-mono font-bold px-2 py-0.5 rounded">
                {sortedRecords.length.toLocaleString('pt-BR')} registros
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Visão detalhada das ordens de serviço de campo com diagnóstico individual
            </p>
          </div>
        </div>

        {/* Controls: search, columns, export */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Quick Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar no analítico..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-[#DA291C]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Column Toggle Picker */}
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200"
              title="Personalizar colunas visíveis"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              Colunas
            </button>

            {showColumnPicker && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowColumnPicker(false)} />
                <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-md shadow-lg border border-slate-200 z-40 p-3 text-xs">
                  <div className="font-bold text-slate-800 pb-2 mb-2 border-b border-slate-100 flex items-center justify-between">
                    <span>Exibir Colunas</span>
                    <button
                      onClick={() => setShowColumnPicker(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1.5">
                    {Object.entries(columnLabels).map(([key, col]) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={visibleColumns[key] ?? false}
                          onChange={(e) =>
                            setVisibleColumns({ ...visibleColumns, [key]: e.target.checked })
                          }
                          className="rounded text-[#DA291C] focus:ring-[#DA291C]"
                        />
                        <span className="text-slate-700 font-medium">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Export Filtered Data */}
          <button
            onClick={handleExportFiltered}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#DA291C] bg-white hover:bg-red-50 rounded-md border border-slate-200 transition-colors"
            title="Exportar planilha Excel com os registros filtrados"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold select-none">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center text-slate-400">#</th>
              
              {visibleColumns.datAgenda && (
                <th
                  onClick={() => handleSort('datAgenda')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    <span>Data Agenda</span>
                    {sortField === 'datAgenda' ? (
                      sortAsc ? <ArrowUp className="w-3 h-3 text-[#DA291C]" /> : <ArrowDown className="w-3 h-3 text-[#DA291C]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    )}
                  </div>
                </th>
              )}

              {visibleColumns.contrato && (
                <th
                  onClick={() => handleSort('contrato')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 min-w-[120px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Contrato</span>
                    {sortField === 'contrato' && (sortAsc ? <ArrowUp className="w-3 h-3 text-[#DA291C]" /> : <ArrowDown className="w-3 h-3 text-[#DA291C]" />)}
                  </div>
                </th>
              )}

              {visibleColumns.mes && (
                <th
                  onClick={() => handleSort('mes')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    <span>Mês</span>
                    {sortField === 'mes' && (sortAsc ? <ArrowUp className="w-3 h-3 text-[#DA291C]" /> : <ArrowDown className="w-3 h-3 text-[#DA291C]" />)}
                  </div>
                </th>
              )}

              {visibleColumns.cidade && (
                <th
                  onClick={() => handleSort('cidade')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    <span>Cidade</span>
                    {sortField === 'cidade' && (sortAsc ? <ArrowUp className="w-3 h-3 text-[#DA291C]" /> : <ArrowDown className="w-3 h-3 text-[#DA291C]" />)}
                  </div>
                </th>
              )}

              {visibleColumns.un && (
                <th
                  onClick={() => handleSort('un')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    <span>UN</span>
                    {sortField === 'un' && (sortAsc ? <ArrowUp className="w-3 h-3 text-[#DA291C]" /> : <ArrowDown className="w-3 h-3 text-[#DA291C]" />)}
                  </div>
                </th>
              )}

              {visibleColumns.tecnico && (
                <th
                  onClick={() => handleSort('tecnico')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    <span>Técnico</span>
                    {sortField === 'tecnico' && (sortAsc ? <ArrowUp className="w-3 h-3 text-[#DA291C]" /> : <ArrowDown className="w-3 h-3 text-[#DA291C]" />)}
                  </div>
                </th>
              )}

              {visibleColumns.baixa && (
                <th
                  onClick={() => handleSort('baixa')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 min-w-[200px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Código Baixa</span>
                    {sortField === 'baixa' && (sortAsc ? <ArrowUp className="w-3 h-3 text-[#DA291C]" /> : <ArrowDown className="w-3 h-3 text-[#DA291C]" />)}
                  </div>
                </th>
              )}

              {visibleColumns.regraFinal && (
                <th
                  onClick={() => handleSort('regraFinal')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 min-w-[190px]"
                >
                  <div className="flex items-center gap-1">
                    <span>REGRA FINAL</span>
                    {sortField === 'regraFinal' && (sortAsc ? <ArrowUp className="w-3 h-3 text-[#DA291C]" /> : <ArrowDown className="w-3 h-3 text-[#DA291C]" />)}
                  </div>
                </th>
              )}

              {visibleColumns.itemVerb && (
                <th
                  onClick={() => handleSort('itemVerb')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 min-w-[170px]"
                >
                  <div className="flex items-center gap-1">
                    <span>ITEM_VERB</span>
                    {sortField === 'itemVerb' && (sortAsc ? <ArrowUp className="w-3 h-3 text-[#DA291C]" /> : <ArrowDown className="w-3 h-3 text-[#DA291C]" />)}
                  </div>
                </th>
              )}

              {visibleColumns.descJanela && (
                <th
                  onClick={() => handleSort('descJanela')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 min-w-[150px]"
                >
                  <div className="flex items-center gap-1">
                    <span>DESC_JANELA</span>
                    {sortField === 'descJanela' && (sortAsc ? <ArrowUp className="w-3 h-3 text-[#DA291C]" /> : <ArrowDown className="w-3 h-3 text-[#DA291C]" />)}
                  </div>
                </th>
              )}

              {visibleColumns.node && (
                <th
                  onClick={() => handleSort('node')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    <span>Node</span>
                    {sortField === 'node' && (sortAsc ? <ArrowUp className="w-3 h-3 text-[#DA291C]" /> : <ArrowDown className="w-3 h-3 text-[#DA291C]" />)}
                  </div>
                </th>
              )}

              {visibleColumns.statusGeoloc && (
                <th
                  onClick={() => handleSort('statusGeoloc')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    <span>Status Geoloc</span>
                    {sortField === 'statusGeoloc' && (sortAsc ? <ArrowUp className="w-3 h-3 text-[#DA291C]" /> : <ArrowDown className="w-3 h-3 text-[#DA291C]" />)}
                  </div>
                </th>
              )}

              {visibleColumns.statusLigacao && (
                <th
                  onClick={() => handleSort('statusLigacao')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    <span>STATUS_LIGACAO</span>
                    {sortField === 'statusLigacao' && (sortAsc ? <ArrowUp className="w-3 h-3 text-[#DA291C]" /> : <ArrowDown className="w-3 h-3 text-[#DA291C]" />)}
                  </div>
                </th>
              )}

              {visibleColumns.tipoOs && (
                <th className="py-2.5 px-3">Tipo OS</th>
              )}

              {visibleColumns.objetivoUra && (
                <th
                  onClick={() => handleSort('objetivoUra')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    <span>OBJETIVO_URA_2</span>
                    {sortField === 'objetivoUra' && (sortAsc ? <ArrowUp className="w-3 h-3 text-[#DA291C]" /> : <ArrowDown className="w-3 h-3 text-[#DA291C]" />)}
                  </div>
                </th>
              )}

              {visibleColumns.tec1 && (
                <th
                  onClick={() => handleSort('tec1')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    <span>TEC1</span>
                    {sortField === 'tec1' && (sortAsc ? <ArrowUp className="w-3 h-3 text-[#DA291C]" /> : <ArrowDown className="w-3 h-3 text-[#DA291C]" />)}
                  </div>
                </th>
              )}

              {visibleColumns.origem && (
                <th className="py-2.5 px-3">ORIGEM</th>
              )}

              {visibleColumns.tpFechamentoOs && (
                <th className="py-2.5 px-3">TP_FECHAMENTO_OS</th>
              )}

              {visibleColumns.area && (
                <th className="py-2.5 px-3">AREA</th>
              )}

              <th className="py-2.5 px-3 text-right">Ação</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={20} className="py-12 text-center text-slate-400 text-xs">
                  Nenhum registro encontrado para a busca ou filtros selecionados.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((rec, idx) => {
                const rowIndex = (currentPage - 1) * pageSize + idx + 1;
                const isIrreg = isGeolocIrregular(rec.statusGeoloc);

                return (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {rowIndex}
                    </td>

                    {visibleColumns.datAgenda && (
                      <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {renderVal(rec.datAgenda)}
                      </td>
                    )}

                    {visibleColumns.contrato && (
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {renderVal(rec.contrato)}
                      </td>
                    )}

                    {visibleColumns.mes && (
                      <td className="py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {renderVal(rec.mes)}
                      </td>
                    )}

                    {visibleColumns.cidade && (
                      <td className="py-2 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {renderVal(rec.cidade)}
                      </td>
                    )}

                    {visibleColumns.un && (
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {renderVal(rec.un)}
                      </td>
                    )}

                    {visibleColumns.tecnico && (
                      <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {renderVal(rec.tecnico)}
                      </td>
                    )}

                    {visibleColumns.baixa && (
                      <td className="py-2 px-3 text-slate-800 font-medium max-w-[280px] truncate" title={rec.baixa}>
                        <span className="text-[#DA291C] font-semibold">{renderVal(rec.baixa)}</span>
                      </td>
                    )}

                    {visibleColumns.regraFinal && (
                      <td className="py-2 px-3 whitespace-nowrap">
                        {!rec.regraFinal || rec.regraFinal === '-' || rec.regraFinal.toLowerCase() === 'vazio' ? (
                          <span className="text-slate-400 italic font-normal">vazio</span>
                        ) : (
                          <span
                            className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${
                              rec.regraFinal.includes('NO-SHOW')
                                ? 'bg-red-50 text-[#DA291C] border border-red-200'
                                : rec.regraFinal.includes('JUSTIFICADO')
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {rec.regraFinal}
                          </span>
                        )}
                      </td>
                    )}

                    {visibleColumns.itemVerb && (
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap max-w-[190px] truncate" title={rec.itemVerb}>
                        {!rec.itemVerb || rec.itemVerb === '-' || rec.itemVerb.toLowerCase() === 'vazio' ? (
                          <span className="text-slate-400 italic font-normal">vazio</span>
                        ) : (
                          <span className="inline-block bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                            {rec.itemVerb}
                          </span>
                        )}
                      </td>
                    )}

                    {visibleColumns.descJanela && (
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {renderVal(rec.descJanela)}
                      </td>
                    )}

                    {visibleColumns.node && (
                      <td className="py-2 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {renderVal(rec.node)}
                      </td>
                    )}

                    {visibleColumns.statusGeoloc && (
                      <td className="py-2 px-3 whitespace-nowrap">
                        {!rec.statusGeoloc || rec.statusGeoloc === '-' || rec.statusGeoloc.toLowerCase() === 'vazio' ? (
                          <span className="text-slate-400 italic font-normal">vazio</span>
                        ) : (
                          <span
                            className={`inline-block text-[11px] font-medium ${
                              isIrreg ? 'text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200' : 'text-slate-600'
                            }`}
                          >
                            {rec.statusGeoloc}
                          </span>
                        )}
                      </td>
                    )}

                    {visibleColumns.statusLigacao && (
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap max-w-[180px] truncate" title={rec.statusLigacao}>
                        {renderVal(rec.statusLigacao)}
                      </td>
                    )}

                    {visibleColumns.tipoOs && (
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap max-w-[150px] truncate">
                        {renderVal(rec.tipoOs)}
                      </td>
                    )}

                    {visibleColumns.objetivoUra && (
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {renderVal(rec.objetivoUra)}
                      </td>
                    )}

                    {visibleColumns.tec1 && (
                      <td className="py-2 px-3 whitespace-nowrap">
                        {rec.tec1 && rec.tec1.trim() && rec.tec1.trim() !== '-' && rec.tec1.trim().toLowerCase() !== 'vazio' ? (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            rec.tec1.toLowerCase().includes('sem padrao') || rec.tec1.toLowerCase().includes('sem padrão')
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {rec.tec1}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-normal">vazio</span>
                        )}
                      </td>
                    )}

                    {visibleColumns.origem && (
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {renderVal(rec.origem)}
                      </td>
                    )}

                    {visibleColumns.tpFechamentoOs && (
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {renderVal(rec.tpFechamentoOs)}
                      </td>
                    )}

                    {visibleColumns.area && (
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {renderVal(rec.area)}
                      </td>
                    )}

                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedRecord(rec)}
                        className="inline-flex items-center gap-1 text-[11px] text-[#DA291C] hover:text-[#B31B10] font-semibold hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver OS
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span>
            Mostrando{' '}
            <strong className="font-mono text-slate-900">
              {sortedRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </strong>{' '}
            a{' '}
            <strong className="font-mono text-slate-900">
              {Math.min(currentPage * pageSize, sortedRecords.length)}
            </strong>{' '}
            de <strong className="font-mono text-slate-900">{sortedRecords.length}</strong> registros
          </span>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-1">
            <span>Linhas por página:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-slate-200 rounded px-1.5 py-0.5 text-xs bg-white text-slate-800 focus:outline-none"
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Page Nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 font-mono text-slate-700">
            Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal: Detalhes da Ordem de Serviço */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-[#DA291C] text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-red-200 font-semibold">
                  Auditoria de Ordem de Serviço Claro
                </span>
                <h3 className="text-base font-bold">
                  {selectedRecord.id} · {selectedRecord.tipoOs}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              
              {/* Baixa Summary Box */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <span className="text-[11px] font-bold text-[#DA291C] uppercase tracking-wide block mb-1">
                  Motivo da Baixa
                </span>
                <p className="text-sm font-bold text-slate-900">{renderVal(selectedRecord.baixa)}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 mt-2">
                  <p>
                    Tipo de Fechamento: <strong className="text-slate-800">{renderVal(selectedRecord.tpFechamentoOs)}</strong>
                  </p>
                  <span className="text-slate-300">|</span>
                  <p>
                    Regra Final: <strong className="text-[#DA291C]">{renderVal(selectedRecord.regraFinal)}</strong>
                  </p>
                </div>
              </div>

              {/* Grid 2 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Contrato & Serviço */}
                <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold border-b border-slate-100 pb-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#DA291C]" />
                    <span>Contrato & Serviço</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Contrato:</span>{' '}
                    <strong className="font-mono text-slate-900">{renderVal(selectedRecord.contrato)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Item Verbal (ITEM_VERB):</span>{' '}
                    <strong className="text-slate-800">{renderVal(selectedRecord.itemVerb)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Tipo de OS:</span>{' '}
                    <strong className="text-slate-800">{renderVal(selectedRecord.tipoOs)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Origem:</span>{' '}
                    <strong className="text-slate-800">{renderVal(selectedRecord.origem)}</strong>
                  </div>
                </div>

                {/* Localização & Regional */}
                <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold border-b border-slate-100 pb-1.5">
                    <MapPin className="w-4 h-4 text-[#DA291C]" />
                    <span>Regional & Rede</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Cidade:</span>{' '}
                    <strong className="text-slate-800">{renderVal(selectedRecord.cidade)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Unidade de Negócio (UN):</span>{' '}
                    <strong className="text-slate-800">{renderVal(selectedRecord.un)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Área Operacional:</span>{' '}
                    <strong className="text-slate-800">{renderVal(selectedRecord.area)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Node de Rede:</span>{' '}
                    <strong className="font-mono text-slate-800">{renderVal(selectedRecord.node)}</strong>
                  </div>
                </div>

                {/* Colaborador & Agendamento */}
                <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold border-b border-slate-100 pb-1.5">
                    <User className="w-4 h-4 text-[#DA291C]" />
                    <span>Técnico & Equipe</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Técnico Titular:</span>{' '}
                    <strong className="text-slate-800">{renderVal(selectedRecord.tecnico)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Validação TEC1:</span>{' '}
                    <strong className="text-slate-800">{renderVal(selectedRecord.tec1)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Janela de Atendimento (DESC_JANELA):</span>{' '}
                    <strong className="text-slate-800">{renderVal(selectedRecord.descJanela)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Data Agendada:</span>{' '}
                    <strong className="font-mono text-slate-800">{renderVal(selectedRecord.datAgenda)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Mês de Referência:</span>{' '}
                    <strong className="text-slate-800">{renderVal(selectedRecord.mes)}</strong>
                  </div>
                </div>

                {/* URA & Contato */}
                <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold border-b border-slate-100 pb-1.5">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span>Contato com o Cliente & URA</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Objetivo URA (OBJETIVO_URA_2):</span>{' '}
                    <strong className="text-slate-800">{renderVal(selectedRecord.objetivoUra)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Status Ligação:</span>{' '}
                    <p className="font-bold text-blue-700 mt-0.5">{renderVal(selectedRecord.statusLigacao)}</p>
                  </div>
                  <div className="pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Auditoria Geolocalização:</span>
                    <p className="font-bold text-amber-700 mt-0.5">{renderVal(selectedRecord.statusGeoloc)}</p>
                  </div>
                </div>

              </div>

              {/* Raw Properties Table if available */}
              {selectedRecord.raw && Object.keys(selectedRecord.raw).length > 0 && (
                <div className="mt-3">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1.5">
                    Colunas Adicionais do Arquivo Original
                  </span>
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {Object.entries(selectedRecord.raw).map(([key, value]) => (
                          <tr key={key} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-semibold text-slate-600 bg-slate-50 w-1/3">
                              {key}
                            </td>
                            <td className="py-1.5 px-3 text-slate-800">
                              {String(value ?? '—')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded text-xs transition-colors"
              >
                Fechar Detalhes
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
