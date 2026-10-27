import React, { useState, useMemo } from 'react';
import { FilterState, NoShowRecord } from '../types';
import { isRecordMatchingFilters } from '../utils/excelParser';
import {
  Filter,
  X,
  ChevronDown,
  Search,
  RotateCcw,
  CheckSquare,
  Square,
  Calendar,
} from 'lucide-react';

interface FiltersPanelProps {
  records: NoShowRecord[];
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onResetFilters: () => void;
}

interface FilterDef {
  field: keyof FilterState;
  label: string;
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  records,
  filters,
  onFilterChange,
  onResetFilters,
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');

  // Extract unique sorted options with count for each field, filtered dynamically by all OTHER active criteria (cascading/faceted)
  const optionsMap = useMemo(() => {
    const map: Record<string, { value: string; count: number }[]> = {};

    const fields: (keyof NoShowRecord)[] = [
      'mes',
      'cidade',
      'origem',
      'tecnico',
      'un',
      'tipoOs',
      'tpFechamentoOs',
      'baixa',
      'regraFinal',
      'area',
      'tec1',
      'statusGeoloc',
      'objetivoUra',
      'statusLigacao',
      'node',
      'descJanela',
    ];

    fields.forEach((field) => {
      // Filter records by all other active criteria (excluding this field)
      const relevantRecords = records.filter((r) =>
        isRecordMatchingFilters(r, filters, field as keyof FilterState)
      );

      const counts: Record<string, number> = {};
      relevantRecords.forEach((r) => {
        const val = String(r[field] || 'NÃO INFORMADO').trim();
        counts[val] = (counts[val] || 0) + 1;
      });

      // Keep any currently selected value in the list so user can always see/uncheck it
      const selected = (filters[field as keyof FilterState] as string[]) || [];
      selected.forEach((selVal) => {
        if (counts[selVal] === undefined) {
          counts[selVal] = 0;
        }
      });

      map[field] = Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return a.value.localeCompare(b.value);
        });
    });

    return map;
  }, [records, filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.mes.length) count += filters.mes.length;
    if (filters.cidade.length) count += filters.cidade.length;
    if (filters.origem.length) count += filters.origem.length;
    if (filters.tecnico.length) count += filters.tecnico.length;
    if (filters.un.length) count += filters.un.length;
    if (filters.tipoOs.length) count += filters.tipoOs.length;
    if (filters.tpFechamentoOs.length) count += filters.tpFechamentoOs.length;
    if (filters.baixa.length) count += filters.baixa.length;
    if (filters.regraFinal.length) count += filters.regraFinal.length;
    if (filters.area.length) count += filters.area.length;
    if (filters.tec1.length) count += filters.tec1.length;
    if (filters.statusGeoloc.length) count += filters.statusGeoloc.length;
    if (filters.objetivoUra.length) count += filters.objetivoUra.length;
    if (filters.statusLigacao.length) count += filters.statusLigacao.length;
    if (filters.node.length) count += filters.node.length;
    if (filters.descJanela?.length) count += filters.descJanela.length;
    if (filters.dia?.length) count += filters.dia.length;
    if (filters.semana?.length) count += filters.semana.length;
    if (filters.dataAgendaStart) count += 1;
    if (filters.dataAgendaEnd) count += 1;
    if (filters.search) count += 1;
    return count;
  }, [filters]);

  const toggleFilterValue = (field: keyof FilterState, value: string) => {
    const currentValues = (filters[field] as string[]) || [];
    const exists = currentValues.includes(value);
    const newValues = exists
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    onFilterChange({
      ...filters,
      [field]: newValues,
    });
  };

  const clearField = (field: keyof FilterState) => {
    onFilterChange({
      ...filters,
      [field]: [],
    });
  };

  // Group 1: Core operational filters (requested + core)
  const group1Filters: FilterDef[] = [
    { field: 'mes', label: 'Mês' },
    { field: 'cidade', label: 'Cidade' },
    { field: 'un', label: 'UN' },
    { field: 'tecnico', label: 'Técnico' },
    { field: 'baixa', label: 'Código Baixa' },
    { field: 'regraFinal', label: 'REGRA FINAL' },
    { field: 'origem', label: 'ORIGEM' },
  ];

  // Group 2: Requested operational & audit filters (without Node)
  const group2Filters: FilterDef[] = [
    { field: 'tpFechamentoOs', label: 'TP_FECHAMENTO_OS' },
    { field: 'area', label: 'AREA' },
    { field: 'statusLigacao', label: 'STATUS_LIGACAO' },
    { field: 'objetivoUra', label: 'OBJETIVO_URA_2' },
    { field: 'descJanela', label: 'DESC_JANELA' },
    { field: 'tec1', label: 'TEC1' },
    { field: 'statusGeoloc', label: 'Status Geoloc' },
    { field: 'tipoOs', label: 'Tipo OS' },
  ];

  // Friendly display names for active tags without parentheses
  const fieldLabelsClean: Record<string, string> = {
    mes: 'Mês',
    cidade: 'Cidade',
    un: 'UN',
    tecnico: 'Técnico',
    baixa: 'Código Baixa',
    regraFinal: 'REGRA FINAL',
    origem: 'ORIGEM',
    tpFechamentoOs: 'TP_FECHAMENTO_OS',
    area: 'AREA',
    statusLigacao: 'STATUS_LIGACAO',
    objetivoUra: 'OBJETIVO_URA_2',
    descJanela: 'DESC_JANELA',
    tec1: 'TEC1',
    statusGeoloc: 'Status Geoloc',
    tipoOs: 'Tipo OS',
    node: 'Node',
    dia: 'Dia',
    semana: 'Semana',
  };

  const renderDropdown = (fieldKey: keyof FilterState, label: string, alignRight = false) => {
    const selectedList = (filters[fieldKey] as string[]) || [];
    const allOptions = optionsMap[fieldKey as string] || [];
    const isOpen = activeDropdown === fieldKey;

    const filteredOptions = allOptions.filter((opt) =>
      opt.value.toLowerCase().includes(dropdownSearch.toLowerCase())
    );

    return (
      <div className="relative w-full min-w-0" key={fieldKey as string}>
        <button
          type="button"
          onClick={() => {
            setActiveDropdown(isOpen ? null : (fieldKey as string));
            setDropdownSearch('');
          }}
          title={`${label}${selectedList.length > 0 ? ` (${selectedList.length} selecionado${selectedList.length > 1 ? 's' : ''})` : ''}`}
          className={`w-full h-[34px] flex items-center justify-between gap-1 px-2.5 py-1.5 text-[11px] xl:text-xs rounded-md border text-left transition-colors ${
            selectedList.length > 0
              ? 'bg-red-50/90 border-[#DA291C] text-[#DA291C] font-bold shadow-xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <span className="truncate">{label}</span>

          <div className="flex items-center gap-1 shrink-0 ml-0.5">
            {selectedList.length > 0 && (
              <span className="bg-[#DA291C] text-white text-[9.5px] font-bold px-1.5 py-0.2 rounded-full font-mono leading-none">
                {selectedList.length}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                isOpen ? 'rotate-180 text-[#DA291C]' : ''
              }`}
            />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setActiveDropdown(null)}
            />
            <div className={`absolute ${alignRight ? 'right-0' : 'left-0'} top-full mt-1 w-64 sm:w-72 bg-white rounded-md shadow-xl border border-slate-200 z-50 p-2 text-xs`}>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800">{label}</span>
                <div className="flex items-center gap-2">
                  {fieldKey === 'baixa' && (() => {
                    const allVals = allOptions.map((o) => o.value);
                    const isAllSelected = allVals.length > 0 && allVals.every((v) => selectedList.includes(v));
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          onFilterChange({
                            ...filters,
                            [fieldKey]: isAllSelected ? [] : allVals,
                          });
                        }}
                        className="text-[11px] text-[#DA291C] hover:underline font-semibold"
                      >
                        {isAllSelected ? 'Desmarcar' : 'Todos'}
                      </button>
                    );
                  })()}
                  {selectedList.length > 0 && (
                    <button
                      onClick={() => clearField(fieldKey)}
                      className="text-[11px] text-slate-500 hover:text-[#DA291C] hover:underline font-medium"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Search inside dropdown */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={dropdownSearch}
                  onChange={(e) => setDropdownSearch(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-[#DA291C]"
                  autoFocus
                />
              </div>

              {/* Option List */}
              <div className="max-h-56 overflow-y-auto space-y-0.5">
                {/* Opção "Todos" no filtro Código Baixa */}
                {fieldKey === 'baixa' && allOptions.length > 0 && (!dropdownSearch || 'todos'.includes(dropdownSearch.toLowerCase())) && (() => {
                  const allVals = allOptions.map((o) => o.value);
                  const isAllSelected = allVals.length > 0 && allVals.every((v) => selectedList.includes(v));
                  const totalBaixasCount = allOptions.reduce((acc, cur) => acc + cur.count, 0);

                  return (
                    <button
                      key="option-todos-baixa"
                      type="button"
                      onClick={() => {
                        onFilterChange({
                          ...filters,
                          [fieldKey]: isAllSelected ? [] : allVals,
                        });
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors border-b border-slate-100 mb-1 ${
                        isAllSelected
                          ? 'bg-red-50 text-[#DA291C] font-bold'
                          : 'hover:bg-slate-100 text-slate-800 font-semibold'
                      }`}
                      title="Selecionar todos os códigos de baixa"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {isAllSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span className="truncate">Todos</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 tabular-nums font-normal">
                        {totalBaixasCount}
                      </span>
                    </button>
                  );
                })()}
                {filteredOptions.length === 0 ? (
                  <p className="text-slate-400 text-center py-3 text-[11px]">
                    Nenhuma opção encontrada
                  </p>
                ) : (
                  filteredOptions.map((opt) => {
                    const isChecked = selectedList.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleFilterValue(fieldKey, opt.value)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
                          isChecked
                            ? 'bg-red-50 text-[#DA291C] font-semibold'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          )}
                          <span className="truncate">{opt.value}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0 tabular-nums">
                          {opt.count}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs mb-6 p-4">
      {/* Top Filter Bar: Title, Search, Reset */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-red-50 text-[#DA291C]">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900">Filtros da Operação</span>
            <span className="text-xs text-slate-500 ml-2 hidden sm:inline">
              Refine a análise pelos critérios operacionais da planilha
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar OS, Técnico, Cidade..."
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-[#DA291C] focus:ring-1 focus:ring-[#DA291C]"
            />
            {filters.search && (
              <button
                onClick={() => onFilterChange({ ...filters, search: '' })}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Reset button */}
          {activeFilterCount > 0 && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-[#DA291C] hover:bg-red-50 rounded-md border border-slate-200 transition-colors"
              title="Limpar todos os filtros ativos"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar Todos
            </button>
          )}
        </div>
      </div>

      {/* Row 1: Data Início + Data Fim + Group 1 Filters (9 items total) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-2 mb-2">
        {/* Data Início */}
        <div className="w-full min-w-0">
          <div
            className={`w-full h-[34px] flex items-center gap-1 px-2 py-0.5 text-[11px] xl:text-xs rounded-md border transition-colors ${
              filters.dataAgendaStart
                ? 'bg-red-50/90 border-[#DA291C] text-[#DA291C] font-semibold shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
            title="Data de Início da Agenda"
          >
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${filters.dataAgendaStart ? 'text-[#DA291C]' : 'text-slate-400'}`} />
            <div className="flex flex-col min-w-0 flex-1 justify-center leading-none">
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider leading-none">Início</span>
              <input
                type="date"
                aria-label="Data Início"
                value={filters.dataAgendaStart}
                onChange={(e) => onFilterChange({ ...filters, dataAgendaStart: e.target.value })}
                className="bg-transparent text-[11px] xl:text-xs text-slate-700 focus:outline-none w-full min-w-0 cursor-pointer font-medium p-0 m-0 border-0 leading-tight"
                title="Data Início"
              />
            </div>
            {filters.dataAgendaStart && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, dataAgendaStart: '' })}
                className="text-slate-400 hover:text-[#DA291C] shrink-0 p-0.5"
                title="Limpar Data Início"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Data Fim */}
        <div className="w-full min-w-0">
          <div
            className={`w-full h-[34px] flex items-center gap-1 px-2 py-0.5 text-[11px] xl:text-xs rounded-md border transition-colors ${
              filters.dataAgendaEnd
                ? 'bg-red-50/90 border-[#DA291C] text-[#DA291C] font-semibold shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
            title="Data de Fim da Agenda"
          >
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${filters.dataAgendaEnd ? 'text-[#DA291C]' : 'text-slate-400'}`} />
            <div className="flex flex-col min-w-0 flex-1 justify-center leading-none">
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider leading-none">Fim</span>
              <input
                type="date"
                aria-label="Data Fim"
                value={filters.dataAgendaEnd}
                onChange={(e) => onFilterChange({ ...filters, dataAgendaEnd: e.target.value })}
                className="bg-transparent text-[11px] xl:text-xs text-slate-700 focus:outline-none w-full min-w-0 cursor-pointer font-medium p-0 m-0 border-0 leading-tight"
                title="Data Fim"
              />
            </div>
            {filters.dataAgendaEnd && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, dataAgendaEnd: '' })}
                className="text-slate-400 hover:text-[#DA291C] shrink-0 p-0.5"
                title="Limpar Data Fim"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {group1Filters.map((f, idx) => renderDropdown(f.field, f.label, idx >= 3))}
      </div>

      {/* Row 2: Group 2 Filters without Node (8 items total) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2 border-t border-slate-100">
        {group2Filters.map((f, idx) => renderDropdown(f.field, f.label, idx >= 4))}
      </div>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Filtros aplicados:</span>

          {filters.search && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              Busca: "{filters.search}"
              <X
                className="w-3 h-3 cursor-pointer hover:text-red-600"
                onClick={() => onFilterChange({ ...filters, search: '' })}
              />
            </span>
          )}

          {filters.dataAgendaStart && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-red-50 text-[#DA291C] px-2 py-0.5 rounded border border-red-200 font-mono">
              <strong>De:</strong> {(() => {
                const parts = filters.dataAgendaStart.split('-');
                return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : filters.dataAgendaStart;
              })()}
              <X
                className="w-3 h-3 cursor-pointer hover:text-red-700"
                onClick={() => onFilterChange({ ...filters, dataAgendaStart: '' })}
              />
            </span>
          )}

          {filters.dataAgendaEnd && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-red-50 text-[#DA291C] px-2 py-0.5 rounded border border-red-200 font-mono">
              <strong>Até:</strong> {(() => {
                const parts = filters.dataAgendaEnd.split('-');
                return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : filters.dataAgendaEnd;
              })()}
              <X
                className="w-3 h-3 cursor-pointer hover:text-red-700"
                onClick={() => onFilterChange({ ...filters, dataAgendaEnd: '' })}
              />
            </span>
          )}

          {Object.entries(filters).map(([key, val]) => {
            if (Array.isArray(val) && val.length > 0) {
              const label = fieldLabelsClean[key] || key.toUpperCase();
              return val.map((item) => (
                <span
                  key={`${key}-${item}`}
                  className="inline-flex items-center gap-1 text-[11px] bg-red-50 text-[#DA291C] px-2 py-0.5 rounded border border-red-200"
                >
                  <strong className="font-semibold">{label}:</strong> {item}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-800"
                    onClick={() => toggleFilterValue(key as keyof FilterState, item)}
                  />
                </span>
              ));
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
};
