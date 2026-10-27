import React, { useState, useMemo } from 'react';
import { NoShowRecord, AggregatedItem, FilterState } from '../types';
import { parseDateInfo, getRecordWeekInfo, parseMesReference } from '../utils/excelParser';
import {
  BarChart3,
  MapPin,
  AlertTriangle,
  UserX,
  Layers,
  Building2,
  Table as TableIcon,
  ChevronRight,
  Filter,
  Compass,
  Calendar,
  CalendarDays,
  Clock,
  Share2,
} from 'lucide-react';

interface ChartsSectionProps {
  records: NoShowRecord[];
  onSelectFilter: (field: keyof FilterState, value: string) => void;
  activeFilters: FilterState;
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  records,
  onSelectFilter,
  activeFilters,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'cidade' | 'baixa' | 'tecnico' | 'node' | 'un' | 'area'>('all');
  const [viewMode, setViewMode] = useState<'bars' | 'table'>('bars');

  const total = records.length;

  // Helper to aggregate by field and compute percentage
  const aggregateBy = (field: keyof NoShowRecord, limit?: number): AggregatedItem[] => {
    if (total === 0) return [];
    const counts: Record<string, number> = {};
    records.forEach((r) => {
      const val = String(r[field] || 'NÃO INFORMADO').trim();
      counts[val] = (counts[val] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Number(((count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    return limit ? sorted.slice(0, limit) : sorted;
  };

  // 1. Gráfico por Cidade (volume de casos)
  const cityData = useMemo(() => aggregateBy('cidade'), [records, total]);

  // 1.1 Gráfico de Volume por Mês (Competência Operacional)
  // Conforme solicitado: se no mês de agosto houver casos do mês de julho favor considerar esses casos para o mês de agosto e mantenha essa mesma lógica conforme o analítico.
  const monthData = useMemo(() => {
    if (total === 0) return [];
    const map: Record<string, { count: number; sortKey: number; label: string }> = {};

    records.forEach((r) => {
      // No analítico, a competência é primariamente r.mes (que já absorve casos agendados no final do mês anterior)
      let mesLabel = String(r.mes || '').trim().toUpperCase();
      let sortKey = 0;

      if (mesLabel) {
        const parsed = parseMesReference(mesLabel);
        if (parsed) {
          sortKey = parsed.year * 12 + parsed.month;
        }
      } else if (r.datAgenda) {
        const parsedDate = parseDateInfo(r.datAgenda);
        if (parsedDate) {
          const mNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
          mesLabel = `${mNames[parsedDate.month - 1]}/${parsedDate.year}`;
          sortKey = parsedDate.year * 12 + parsedDate.month;
        }
      }

      if (!mesLabel) mesLabel = 'MÊS NÃO INFORMADO';

      if (!map[mesLabel]) {
        map[mesLabel] = { count: 0, sortKey, label: mesLabel };
      }
      map[mesLabel].count += 1;
    });

    return Object.values(map)
      .sort((a, b) => (a.sortKey !== b.sortKey ? a.sortKey - b.sortKey : a.label.localeCompare(b.label)))
      .map((item) => ({
        name: item.label,
        count: item.count,
        percentage: Number(((item.count / total) * 100).toFixed(1)),
        subLabel: 'Competência',
      }));
  }, [records, total]);

  // 2. Top 15 Código de Baixa Ofensor
  const top15Baixa = useMemo(() => aggregateBy('baixa', 15), [records, total]);

  // 3. Top 15 Técnico Ofensor com Detalhamento Mensal
  const top15Tecnico = useMemo(() => {
    if (total === 0) return [];
    const counts: Record<string, { total: number; monthly: Record<string, number> }> = {};

    records.forEach((r) => {
      const tech = String(r.tecnico || 'NÃO INFORMADO').trim();
      let mes = String(r.mes || '').trim().toUpperCase();
      if (!mes && r.datAgenda) {
        const p = parseDateInfo(r.datAgenda);
        if (p) {
          const mNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
          mes = `${mNames[p.month - 1]}/${p.year}`;
        }
      }
      if (!mes) mes = 'SEM MÊS';

      if (!counts[tech]) {
        counts[tech] = { total: 0, monthly: {} };
      }
      counts[tech].total += 1;
      counts[tech].monthly[mes] = (counts[tech].monthly[mes] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        count: data.total,
        percentage: Number(((data.total / total) * 100).toFixed(1)),
        monthlyBreakdown: data.monthly,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [records, total]);

  // 3.1 Técnicos agrupados por mês (para exibição 'um abaixo do outro' quando múltiplos meses existirem)
  const techsByMonth = useMemo(() => {
    const monthGroups: Record<string, { sortKey: number; records: NoShowRecord[] }> = {};

    records.forEach((r) => {
      let mes = String(r.mes || '').trim().toUpperCase();
      if (!mes && r.datAgenda) {
        const p = parseDateInfo(r.datAgenda);
        if (p) {
          const mNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
          mes = `${mNames[p.month - 1]}/${p.year}`;
        }
      }
      if (!mes) mes = 'SEM MÊS';

      if (!monthGroups[mes]) {
        let sortKey = 0;
        const parsed = parseMesReference(mes);
        if (parsed) sortKey = parsed.year * 12 + parsed.month;
        monthGroups[mes] = { sortKey, records: [] };
      }
      monthGroups[mes].records.push(r);
    });

    const sortedMonths = Object.entries(monthGroups)
      .sort((a, b) => (a[1].sortKey !== b[1].sortKey ? a[1].sortKey - b[1].sortKey : a[0].localeCompare(b[0])));

    return sortedMonths.map(([mesName, group]) => {
      const monthTotal = group.records.length;
      const techCounts: Record<string, number> = {};
      group.records.forEach((r) => {
        const t = String(r.tecnico || 'NÃO INFORMADO').trim();
        techCounts[t] = (techCounts[t] || 0) + 1;
      });

      const items: AggregatedItem[] = Object.entries(techCounts)
        .map(([name, count]) => ({
          name,
          count,
          percentage: Number(((count / monthTotal) * 100).toFixed(1)),
          subLabel: mesName,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      return {
        month: mesName,
        total: monthTotal,
        items,
      };
    });
  }, [records]);

  // 4. Top 15 Node Ofensor
  const top15Node = useMemo(() => aggregateBy('node', 15), [records, total]);

  // 5. Top 15 UN
  const top15UN = useMemo(() => aggregateBy('un', 15), [records, total]);

  // 6. Volume de Casos por Área (Coluna Z)
  const areaData = useMemo(() => aggregateBy('area', 15), [records, total]);

  // 6.1 Volume por Origem do Registro (SPEECH, TNPS QUALTRICS, MANIFESTO, TNPS, etc.)
  const origemData = useMemo(() => aggregateBy('origem', 15), [records, total]);

  // 7. Volume por Janela de Atendimento (DESC_JANELA)
  const janelaData = useMemo(() => {
    if (total === 0) return [];
    const counts: Record<string, number> = {};
    records.forEach((r) => {
      const val = (r.descJanela || 'vazio').trim() || 'vazio';
      counts[val] = (counts[val] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Number(((count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);
  }, [records, total]);

  // 7. Volume de Casos por Dia (DAT_AGENDA) - ordenado cronologicamente
  const dailyData = useMemo(() => {
    if (total === 0) return [];
    const dayMap: Record<string, { label: string; count: number; sortKey: string; dayNum: number }> = {};

    records.forEach((r) => {
      const parsed = parseDateInfo(r.datAgenda);
      if (parsed) {
        const key = parsed.fullDateKey;
        if (!dayMap[key]) {
          dayMap[key] = { label: parsed.dayLabel, count: 0, sortKey: key, dayNum: parsed.day };
        }
        dayMap[key].count += 1;
      }
    });

    return Object.values(dayMap)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((item) => ({
        name: item.label,
        count: item.count,
        percentage: Number(((item.count / total) * 100).toFixed(1)),
        subLabel: `Dia ${item.dayNum}`,
      }));
  }, [records, total]);

  // 8. Gráfico de Semanas: S1 (1 a 7 e contratos anteriores), S2 (8 a 14), S3 (15 a 21), S4 (22 a 28) e S5 (29 a 30 ou 29 a 31)
  // Conforme solicitado: contratos com data da agenda do mês anterior são contabilizados na S1.
  const weekData = useMemo(() => {
    if (total === 0) return [];

    let s1 = 0;
    let s2 = 0;
    let s3 = 0;
    let s4 = 0;
    let s5 = 0;
    let maxDayFound = 0;
    let hasMonth30 = false;
    let hasMonth31 = false;

    records.forEach((r) => {
      const weekInfo = getRecordWeekInfo(r.datAgenda, r.mes, activeFilters.mes);
      if (weekInfo) {
        const parsed = parseDateInfo(r.datAgenda);
        if (parsed) {
          if (!weekInfo.isPreviousMonthCarryover && parsed.day > maxDayFound) {
            maxDayFound = parsed.day;
          }
          const dim = new Date(parsed.year, parsed.month, 0).getDate();
          if (dim === 30) hasMonth30 = true;
          if (dim === 31) hasMonth31 = true;
        }

        if (weekInfo.weekNumber === 1) s1++;
        else if (weekInfo.weekNumber === 2) s2++;
        else if (weekInfo.weekNumber === 3) s3++;
        else if (weekInfo.weekNumber === 4) s4++;
        else if (weekInfo.weekNumber === 5) s5++;
      }
    });

    const s5Label = hasMonth30 && !hasMonth31 ? 'S5 (Dias 29 a 30)' : 'S5 (Dias 29 a 31)';

    const result: AggregatedItem[] = [
      {
        name: 'S1 (Dias 1 a 7)',
        count: s1,
        percentage: Number(((s1 / total) * 100).toFixed(1)),
        subLabel: 'Dias 1 a 7',
      },
      {
        name: 'S2 (Dias 8 a 14)',
        count: s2,
        percentage: Number(((s2 / total) * 100).toFixed(1)),
        subLabel: 'Dias 8 a 14',
      },
      {
        name: 'S3 (Dias 15 a 21)',
        count: s3,
        percentage: Number(((s3 / total) * 100).toFixed(1)),
        subLabel: 'Dias 15 a 21',
      },
      {
        name: 'S4 (Dias 22 a 28)',
        count: s4,
        percentage: Number(((s4 / total) * 100).toFixed(1)),
        subLabel: 'Dias 22 a 28',
      },
    ];

    // Incluir S5 quando o mês houver a 5ª semana
    const monthHasWeek5 = s5 > 0 || maxDayFound >= 29 || hasMonth30 || hasMonth31;

    if (monthHasWeek5) {
      result.push({
        name: s5Label,
        count: s5,
        percentage: Number(((s5 / total) * 100).toFixed(1)),
        subLabel: hasMonth30 && !hasMonth31 ? 'Dias 29 a 30' : 'Dias 29 a 31',
      });
    }

    return result;
  }, [records, total, activeFilters.mes]);

  // Render a horizontal bar component
  const renderBarChart = (
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    data: AggregatedItem[],
    filterField: keyof FilterState,
    maxItemsToShow: number = 15,
    onItemClick?: (item: AggregatedItem) => void
  ) => {
    const maxCount = data.length > 0 ? Math.max(...data.map((d) => d.count)) : 1;
    const items = data.slice(0, maxItemsToShow);
    const rawVal = activeFilters[filterField];
    const activeValues: string[] = Array.isArray(rawVal)
      ? rawVal
      : typeof rawVal === 'string' && rawVal
      ? [rawVal]
      : [];

    const handleClick = (item: AggregatedItem) => {
      if (onItemClick) {
        onItemClick(item);
      } else {
        onSelectFilter(filterField, item.name);
      }
    };

    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-red-50 text-[#DA291C]">
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
              <p className="text-[11px] text-slate-500">{subtitle}</p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-medium text-slate-400 tabular-nums">
            {items.length} itens
          </span>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Nenhum registro para os filtros selecionados
          </div>
        ) : viewMode === 'bars' ? (
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {items.map((item, index) => {
              const isSelected = activeValues.includes(item.name);
              const barPercent = Math.max(4, Math.round((item.count / maxCount) * 100));

              return (
                <div
                  key={`${item.name}-${index}`}
                  onClick={() => handleClick(item)}
                  className={`group cursor-pointer p-1.5 rounded transition-colors ${
                    isSelected ? 'bg-red-50 ring-1 ring-[#DA291C]' : 'hover:bg-slate-50'
                  }`}
                  title={`Clique para filtrar por: ${item.name}`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="text-[10px] font-mono text-slate-400 font-bold w-5 shrink-0">
                        #{index + 1}
                      </span>
                      <span
                        className={`truncate text-xs ${
                          isSelected ? 'font-bold text-[#DA291C]' : 'font-medium text-slate-800'
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.subLabel && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          · {item.subLabel}
                        </span>
                      )}
                    </div>

                      <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
                        <span className="font-bold text-slate-900 tabular-nums">{item.count}</span>
                        <span className="text-[11px] text-slate-500 w-12 text-right tabular-nums">
                          ({item.percentage}%)
                        </span>
                      </div>
                    </div>

                    {/* Monthly Breakdown Chips if present (e.g. AGO: 10, SET: 8, OUT: 5) */}
                    {item.monthlyBreakdown && Object.keys(item.monthlyBreakdown).length > 1 && (
                      <div className="flex items-center gap-1 mb-1.5 flex-wrap pl-7">
                        {Object.entries(item.monthlyBreakdown).map(([m, c]) => (
                          <span
                            key={m}
                            className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono border border-slate-200"
                          >
                            <strong className="text-slate-900">{m.split('/')[0]}:</strong> {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Progress Bar with Claro Red Tone */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          index === 0
                            ? 'bg-[#DA291C]'
                            : index < 3
                            ? 'bg-[#EE3B30]'
                            : index < 7
                            ? 'bg-rose-500'
                            : 'bg-rose-400'
                        }`}
                        style={{ width: `${barPercent}%` }}
                      />
                    </div>
                  </div>
                );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto flex-1 max-h-[380px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[11px] border-b border-slate-100">
                <tr>
                  <th className="py-2 px-2.5 font-semibold w-10">#</th>
                  <th className="py-2 px-2.5 font-semibold">Nome / Período</th>
                  <th className="py-2 px-2.5 font-semibold text-right w-16">Casos</th>
                  <th className="py-2 px-2.5 font-semibold text-right w-16">% Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {items.map((item, index) => (
                  <tr
                    key={item.name}
                    onClick={() => handleClick(item)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-2 px-2.5 text-slate-400">#{index + 1}</td>
                    <td className="py-2 px-2.5 font-sans font-medium text-slate-800 truncate max-w-[200px]">
                      {item.name} {item.subLabel ? `(${item.subLabel})` : ''}
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold text-slate-900 tabular-nums">
                      {item.count}
                    </td>
                    <td className="py-2 px-2.5 text-right text-slate-500 tabular-nums">
                      {item.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Hint */}
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#DA291C]" />
            Clique em qualquer barra para filtrar
          </span>
          {activeValues.length > 0 && (
            <span className="text-[#DA291C] font-semibold">
              {activeValues.length} selecionado(s)
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mb-6">
      {/* Section Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[#DA291C] text-white">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Gráficos de Concentração e Evolução Temporal de No-Show
            </h2>
            <p className="text-xs text-slate-500">
              Análise diária, semanas do mês (S1 a S5) e rankings operacionais (Cidades, Baixas, Técnicos, Nodes, UNs e Áreas)
            </p>
          </div>
        </div>

        {/* View Mode Toggle: Bars vs Table */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
          <button
            onClick={() => setViewMode('bars')}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
              viewMode === 'bars'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gráficos de Barra
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tabela Ranking
          </button>
        </div>
      </div>

      {/* 1. Grid of Temporal Evolution Charts (3 cards: Mês, Semana, Dia) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* 1.1 Gráfico de Volume por Mês (Competência) */}
        <div>
          {renderBarChart(
            'Volume de Casos por Mês (Competência)',
            'Distribuição mensal (casos de meses anteriores absorvidos no ciclo)',
            <Calendar className="w-4 h-4" />,
            monthData,
            'mes',
            12
          )}
        </div>

        {/* 1.2 Gráfico de Semanas do Mês (S1 a S5) */}
        <div>
          {renderBarChart(
            'Volume por Semanas do Mês (S1 a S5)',
            'Ciclo: S1 (1 a 7 e contratos anteriores), S2, S3, S4 e S5',
            <CalendarDays className="w-4 h-4" />,
            weekData,
            'semana',
            5
          )}
        </div>

        {/* 1.3 Gráfico de Volume por Dia (DAT_AGENDA) */}
        <div>
          {renderBarChart(
            'Volume de Casos por Dia (DAT_AGENDA)',
            'Distribuição cronológica diária das ocorrências de no-show',
            <Clock className="w-4 h-4" />,
            dailyData,
            'dia',
            31
          )}
        </div>
      </div>

      {/* Grid of Operational Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* 2. Gráfico de Barras por Cidade */}
        <div className="lg:col-span-2">
          {renderBarChart(
            'Volume de Casos de Não Comparecimento por Cidade',
            'Distribuição geográfica dos no-shows técnicos registrados no período',
            <MapPin className="w-4 h-4" />,
            cityData,
            'cidade',
            12
          )}
        </div>

        {/* 3. Top 15 Código de Baixa Ofensor */}
        <div>
          {renderBarChart(
            'Top 15 Códigos de Baixa Ofensor',
            'Principais motivos e justificativas apontadas para o não atendimento',
            <AlertTriangle className="w-4 h-4" />,
            top15Baixa,
            'baixa',
            15
          )}
        </div>

        {/* 4. Top 15 Técnico Ofensor (Geral Consolidado) */}
        <div>
          {renderBarChart(
            'Top 15 Técnicos Ofensores',
            'Colaboradores com maior recorrência de não comparecimento no período',
            <UserX className="w-4 h-4" />,
            top15Tecnico,
            'tecnico',
            15
          )}
        </div>

        {/* 4.1 Quando houver múltiplos meses: Volume por Mês dos Técnicos (um abaixo do outro) */}
        {techsByMonth.length > 1 && (
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-red-50 text-[#DA291C]">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Volume por Mês dos Técnicos Ofensores (Impacto Mensal - Um abaixo do outro)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Detalhamento dos colaboradores impactados em cada mês da operação ({techsByMonth.map((m) => m.month).join(', ')})
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-red-50 text-[#DA291C] rounded-full border border-red-200 self-start sm:self-auto">
                {techsByMonth.length} meses selecionados
              </span>
            </div>

            {/* Cards de cada mês empilhados um abaixo do outro */}
            <div className="space-y-3.5">
              {techsByMonth.map((group) => (
                <div key={group.month} className="bg-slate-50/70 rounded-lg p-3.5 border border-slate-200">
                  <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#DA291C]" />
                      Top Técnicos no Mês de {group.month}
                    </span>
                    <span className="text-xs font-mono text-slate-600 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                      Total do Mês: <strong className="text-slate-900">{group.total}</strong> casos
                    </span>
                  </div>

                  {/* Barras do mês */}
                  <div className="space-y-1.5">
                    {group.items.slice(0, 10).map((tItem, tIdx) => {
                      const isSel = activeFilters.tecnico.includes(tItem.name);
                      const maxMonthCount = group.items[0]?.count || 1;
                      const barW = Math.max(4, Math.round((tItem.count / maxMonthCount) * 100));

                      return (
                        <div
                          key={`${group.month}-${tItem.name}`}
                          onClick={() => onSelectFilter('tecnico', tItem.name)}
                          className={`p-1.5 rounded cursor-pointer transition-colors ${
                            isSel ? 'bg-red-50 ring-1 ring-[#DA291C]' : 'hover:bg-white'
                          }`}
                          title={`Filtrar por técnico ${tItem.name}`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className="text-[10px] font-mono text-slate-400 font-bold w-5 shrink-0">
                                #{tIdx + 1}
                              </span>
                              <span className={`truncate text-xs ${isSel ? 'font-bold text-[#DA291C]' : 'font-semibold text-slate-800'}`}>
                                {tItem.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
                              <span className="font-bold text-slate-900">{tItem.count}</span>
                              <span className="text-[11px] text-slate-500 w-12 text-right">
                                ({tItem.percentage}%)
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#DA291C] transition-all duration-300"
                              style={{ width: `${barW}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Top 15 Node Ofensor */}
        <div>
          {renderBarChart(
            'Top 15 Nodes Ofensores de Rede',
            'Pontos de distribuição de rede com maior reincidência de cancelamentos',
            <Layers className="w-4 h-4" />,
            top15Node,
            'node',
            15
          )}
        </div>

        {/* 6. Top 15 UN */}
        <div>
          {renderBarChart(
            'Top 15 Unidades de Negócio - UN',
            'Regionais operacionais com maior volume acumulado de ordens pendentes',
            <Building2 className="w-4 h-4" />,
            top15UN,
            'un',
            15
          )}
        </div>

        {/* 7. Volume de Casos por Área (Coluna Z) */}
        <div>
          {renderBarChart(
            'Volume de Casos por Área (Coluna Z)',
            'Distribuição e concentração de no-shows por divisão operacional de campo',
            <Compass className="w-4 h-4" />,
            areaData,
            'area',
            15
          )}
        </div>

        {/* 8. Janela de Atendimento (DESC_JANELA) */}
        <div>
          {renderBarChart(
            'Janela de Atendimento (DESC_JANELA)',
            'Distribuição dos no-shows por período e janela de agendamento (branco = vazio)',
            <Clock className="w-4 h-4" />,
            janelaData,
            'descJanela',
            15
          )}
        </div>

        {/* 9. Volume por Origem do Registro (SPEECH, TNPS QUALTRICS, MANIFESTO, etc.) */}
        <div>
          {renderBarChart(
            'Volume por Origem do Registro',
            'Distribuição dos no-shows por canal e origem de captura da ocorrência',
            <Share2 className="w-4 h-4" />,
            origemData,
            'origem',
            15
          )}
        </div>

      </div>
    </div>
  );
};
