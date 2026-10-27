import React from 'react';
import { NoShowRecord } from '../types';
import { isGeolocIrregular, isUraImprodutiva } from '../utils/excelParser';
import { AlertCircle, MapPin, UserX, Navigation, PhoneOff, Layers, Users } from 'lucide-react';

interface KpiMetricsProps {
  records: NoShowRecord[];
  totalBaseCount: number;
}

export const KpiMetrics: React.FC<KpiMetricsProps> = ({ records, totalBaseCount }) => {
  const total = records.length;

  // Unique counts
  const distinctCities = new Set(records.map((r) => r.cidade)).size;
  const distinctTechs = new Set(records.map((r) => r.tecnico)).size;
  const distinctNodes = new Set(records.map((r) => r.node)).size;

  // Geoloc irregular: specifically considers status "SEM PADRAO" and "SEM GEO"
  const irregularGeolocCount = records.filter((r) => isGeolocIrregular(r.statusGeoloc)).length;
  const geolocIrregularRate = total > 0 ? Math.round((irregularGeolocCount / total) * 100) : 0;

  // URA Improdutiva: soma de vazios, insucesso e (-) na coluna OBJETIVO_URA_2 dividido pelo total (ex: 449/585)
  const uraImprodutivaCount = records.filter(isUraImprodutiva).length;
  const uraImprodutivaRate = total > 0
    ? ((uraImprodutivaCount / total) * 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0,00';

  // TEC1 Impact Analysis: user requested to consider ONLY "SEM PADRAO"
  const tec1SemPadrao = records.filter((r) => {
    const t = (r.tec1 || '').toUpperCase().trim();
    return t === 'SEM PADRAO' || t === 'SEM_PADRAO';
  }).length;
  const tec1ImpactCount = tec1SemPadrao;
  const tec1ImpactRate = total > 0 ? Math.round((tec1ImpactCount / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
      
      {/* Total No-Shows */}
      <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total No-Shows</span>
          <div className="p-1.5 rounded-md bg-red-50 text-[#DA291C]">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
          {total.toLocaleString('pt-BR')}
        </div>
        <p className="text-[10px] text-slate-500 mt-1 truncate">
          {totalBaseCount > 0 ? `${Math.round((total / totalBaseCount) * 100)}% da base carregada` : 'Ordens auditadas'}
        </p>
      </div>

      {/* Cidades Afetadas */}
      <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cidades</span>
          <div className="p-1.5 rounded-md bg-slate-100 text-slate-700">
            <MapPin className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
          {distinctCities}
        </div>
        <p className="text-[10px] text-slate-500 mt-1 truncate">
          Municípios com ocorrência
        </p>
      </div>

      {/* Técnicos Ofensores */}
      <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Técnicos</span>
          <div className="p-1.5 rounded-md bg-orange-50 text-orange-600">
            <UserX className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
          {distinctTechs}
        </div>
        <p className="text-[10px] text-slate-500 mt-1 truncate">
          Colaboradores ofensores
        </p>
      </div>

      {/* Impacto TEC1 (Requested in top view) */}
      <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Impacto TEC1</span>
          <div className="p-1.5 rounded-md bg-rose-50 text-[#DA291C]">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold font-mono text-[#DA291C] tabular-nums">{tec1ImpactRate}%</span>
          <span className="text-[11px] font-mono text-slate-500 tabular-nums">({tec1ImpactCount})</span>
        </div>
        <p
          className="text-[10px] text-slate-500 mt-1 truncate"
          title={`Casos Sem Padrão: ${tec1SemPadrao}`}
        >
          Sem Padrão: {tec1SemPadrao} casos
        </p>
      </div>

      {/* Geolocalização Irregular */}
      <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Geoloc Irregular</span>
          <div className="p-1.5 rounded-md bg-amber-50 text-amber-600">
            <Navigation className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold font-mono text-amber-700 tabular-nums">{geolocIrregularRate}%</span>
          <span className="text-[11px] font-mono text-slate-500 tabular-nums">({irregularGeolocCount})</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1 truncate" title="Status Sem Padrão e Sem Geo">
          Sem Padrão e Sem Geo
        </p>
      </div>

      {/* URA Improdutiva */}
      <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">URA Improdutiva</span>
          <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
            <PhoneOff className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold font-mono text-blue-700 tabular-nums">{uraImprodutivaRate}%</span>
          <span className="text-[11px] font-mono text-slate-500 tabular-nums">({uraImprodutivaCount})</span>
        </div>
        <p
          className="text-[10px] text-slate-500 mt-1 truncate"
          title={`URA Improdutiva (OBJETIVO_URA_2): ${uraImprodutivaCount} de ${total} ordens (${uraImprodutivaRate}%) com status Vazio, Insucesso ou (-)`}
        >
          Vazio, Insucesso e (-)
        </p>
      </div>

      {/* Nodes Afetados */}
      <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nodes Afetados</span>
          <div className="p-1.5 rounded-md bg-red-50 text-[#DA291C]">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
          {distinctNodes}
        </div>
        <p className="text-[10px] text-slate-500 mt-1 truncate">
          Nós de rede impactados
        </p>
      </div>

    </div>
  );
};
