import React, { useState, useMemo, useEffect } from 'react';
import { FilterState, NoShowRecord } from './types';
import {
  generateSampleData,
  downloadTemplateExcel,
  EXPECTED_COLUMNS,
  parseDateInfo,
  isRecordMatchingFilters,
} from './utils/excelParser';
import { Header } from './components/Header';
import { KpiMetrics } from './components/KpiMetrics';
import { FiltersPanel } from './components/FiltersPanel';
import { ChartsSection } from './components/ChartsSection';
import { AnalyticsTable } from './components/AnalyticsTable';
import { UploadModal } from './components/UploadModal';
import { ColumnMappingModal } from './components/ColumnMappingModal';
import { GitHubLoadModal } from './components/GitHubLoadModal';
import { HostingerConfigModal } from './components/HostingerConfigModal';
import { FcaSection } from './components/FcaSection';
import { CheckCircle2, ShieldCheck, LayoutDashboard, FileText, Database, Upload, FileSpreadsheet, ArrowUp } from 'lucide-react';

const INITIAL_FILTERS: FilterState = {
  contrato: [],
  mes: [],
  cidade: [],
  origem: [],
  tecnico: [],
  un: [],
  tipoOs: [],
  itemVerb: [],
  tpFechamentoOs: [],
  dataAgendaStart: '',
  dataAgendaEnd: '',
  baixa: [],
  regraFinal: [],
  area: [],
  tec1: [],
  statusGeoloc: [],
  objetivoUra: [],
  statusLigacao: [],
  node: [],
  descJanela: [],
  dia: [],
  semana: [],
  search: '',
};

export default function App() {
  const [records, setRecords] = useState<NoShowRecord[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [columnMappingOpen, setColumnMappingOpen] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [hostingerModalOpen, setHostingerModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fca'>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Monitor page scroll to display scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 250) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // Initialize detected columns from standard definitions
  const [detectedColumns, setDetectedColumns] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    EXPECTED_COLUMNS.forEach((col) => {
      init[col.field] = col.label;
    });
    return init;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter application pipeline
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => isRecordMatchingFilters(rec, filters));
  }, [records, filters]);

  // Click on chart bar or table item to toggle filter
  const handleSelectFilter = (field: keyof FilterState, value: string) => {
    if (field === 'search') {
      setFilters((prev) => ({
        ...prev,
        search: prev.search === value ? '' : value,
      }));
      return;
    }

    if (field === 'dataAgendaStart' || field === 'dataAgendaEnd') {
      setFilters((prev) => ({
        ...prev,
        [field]: prev[field] === value ? '' : value,
      }));
      return;
    }

    setFilters((prev) => {
      const currentValues = Array.isArray(prev[field]) ? (prev[field] as string[]) : [];
      const exists = currentValues.includes(value);
      const newValues = exists
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];

      return {
        ...prev,
        [field]: newValues,
      };
    });
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    showToast('Filtros restaurados para o padrão.');
  };

  const handleDataLoaded = (
    newRecords: NoShowRecord[],
    newFileName: string,
    newDetectedCols: Record<string, string>
  ) => {
    setRecords(newRecords);
    setFileName(newFileName);
    setDetectedColumns(newDetectedCols);
    setFilters(INITIAL_FILTERS);
    showToast(`Planilha ${newFileName} carregada com sucesso (${newRecords.length} registros).`);
  };

  const handleDownloadTemplate = () => {
    downloadTemplateExcel(records);
    showToast('Planilha modelo baixada em seu computador.');
  };

  const handleLoadSample = () => {
    const sample = generateSampleData();
    setRecords(sample);
    setFileName('Base_Amostra_Claro_NoShow.xlsx');
    setFilters(INITIAL_FILTERS);
    showToast('Base de demonstração Claro recarregada.');
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-slate-800 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header with Claro Identity */}
      <Header
        fileName={fileName}
        totalRecords={records.length}
        filteredCount={filteredRecords.length}
        onOpenUpload={() => setUploadModalOpen(true)}
        onDownloadTemplate={handleDownloadTemplate}
        onLoadSample={handleLoadSample}
        onOpenMapping={() => setColumnMappingOpen(true)}
        onOpenGitHub={() => setGithubModalOpen(true)}
      />

      {/* Navigation Tabs Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <nav className="flex space-x-2 py-2" aria-label="Abas de Navegação">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-red-50 text-[#DA291C] shadow-xs ring-1 ring-[#DA291C]/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Operacional</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                  activeTab === 'dashboard' ? 'bg-[#DA291C] text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {filteredRecords.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('fca')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'fca'
                    ? 'bg-red-50 text-[#DA291C] shadow-xs ring-1 ring-[#DA291C]/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Plano de Ação FCA (Fato · Causa · Ação)</span>
                <span className="text-[10px] bg-purple-100 text-[#673DE6] px-1.5 py-0.2 rounded font-semibold border border-purple-200">
                  Hostinger MySQL
                </span>
              </button>
            </nav>

            {/* Quick button to configure Hostinger database */}
            <button
              onClick={() => setHostingerModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:text-[#673DE6] hover:bg-purple-50 transition-colors border border-slate-200 hover:border-purple-200"
              title="Configurar conexão remota com banco de dados MySQL na Hostinger"
            >
              <Database className="w-3.5 h-3.5 text-[#673DE6]" />
              <span>Banco Hostinger</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {activeTab === 'dashboard' ? (
          records.length === 0 ? (
            /* Empty State: Initial load without dummy data */
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-8 sm:p-12 text-center max-w-2xl mx-auto my-8">
              <div className="w-16 h-16 rounded-full bg-red-50 text-[#DA291C] mx-auto flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8 stroke-[1.8]" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Nenhuma Base Operacional Carregada
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
                O painel foi inicializado sem dados fictícios. Para visualizar as métricas, gráficos operacionais e analítico de No-Show, carregue sua planilha Excel ou importe direto do GitHub.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#DA291C] hover:bg-[#B31B10] text-white font-bold text-xs shadow-sm transition-all"
                >
                  <Upload className="w-4 h-4" />
                  Carregar Planilha Excel (.xlsx, .csv)
                </button>

                <button
                  onClick={() => setGithubModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-all"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  Carregar do GitHub
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
                <button
                  onClick={handleDownloadTemplate}
                  className="hover:text-[#DA291C] hover:underline"
                >
                  Baixar planilha modelo (.xlsx)
                </button>
                <span>·</span>
                <button
                  onClick={handleLoadSample}
                  className="hover:text-[#DA291C] hover:underline"
                >
                  Carregar base demo para testes
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* KPI Metrics */}
              <KpiMetrics
                records={filteredRecords}
                totalBaseCount={records.length}
              />

              {/* Filters Panel with all requested columns */}
              <FiltersPanel
                records={records}
                filters={filters}
                onFilterChange={setFilters}
                onResetFilters={handleResetFilters}
              />

              {/* Charts Section: Volume por Mês, Semanas, Dias e rankings operacionais */}
              <ChartsSection
                records={filteredRecords}
                onSelectFilter={handleSelectFilter}
                activeFilters={filters}
              />

              {/* Espaço dos Dados do Analítico */}
              <AnalyticsTable
                records={filteredRecords}
              />
            </>
          )
        ) : (
          /* FCA Management Section */
          <FcaSection
            records={records}
            onOpenHostingerConfig={() => setHostingerModalOpen(true)}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#DA291C]" />
            <span className="font-semibold text-slate-700">Claro Brasil</span>
            <span>·</span>
            <span>Painel de Qualidade e Governança de Ordens de Serviço de Campo</span>
          </div>
          <div className="text-slate-400">
            Filtros configurados: Mês, Cidade, Origem, Técnico, UN, Tipo OS, TP_FECHAMENTO_OS, Data Agenda, Código Baixa, REGRA FINAL, Área, TEC1, Status Geoloc, OBJETIVO_URA, STATUS_LIGACAO e Node
          </div>
        </div>
      </footer>

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onDataLoaded={handleDataLoaded}
        onDownloadTemplate={handleDownloadTemplate}
      />

      {/* Column Mapping Modal */}
      <ColumnMappingModal
        isOpen={columnMappingOpen}
        onClose={() => setColumnMappingOpen(false)}
        detectedColumns={detectedColumns}
        onDownloadTemplate={handleDownloadTemplate}
      />

      {/* GitHub Load Modal */}
      <GitHubLoadModal
        isOpen={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        onDataLoaded={handleDataLoaded}
      />

      {/* Hostinger Config Modal */}
      <HostingerConfigModal
        isOpen={hostingerModalOpen}
        onClose={() => setHostingerModalOpen(false)}
        onConfigSaved={() => showToast('Configurações do banco Hostinger salvas com sucesso.')}
      />

      {/* Botão Flutuante Voltar ao Topo */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          title="Voltar ao topo da página"
          aria-label="Voltar ao topo"
          className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-[#DA291C] hover:bg-[#B31B10] text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-red-200 flex items-center justify-center group cursor-pointer animate-fade-in"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}

    </div>
  );
}
