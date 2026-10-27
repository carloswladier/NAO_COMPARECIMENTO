import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Search,
  Database,
  Image as ImageIcon,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Upload,
  X,
  ExternalLink,
  ZoomIn,
  RefreshCw,
  UserCheck,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { FcaItem, FcaEvidence, NoShowRecord } from '../types';
import { fcaApi, HostingerStatusResponse } from '../services/fcaApi';
import { parseDateInfo, parseMesReference } from '../utils/excelParser';

interface FcaSectionProps {
  records: NoShowRecord[];
  onOpenHostingerConfig: () => void;
}

export const FcaSection: React.FC<FcaSectionProps> = ({
  records,
  onOpenHostingerConfig,
}) => {
  const [fcas, setFcas] = useState<FcaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [storageSource, setStorageSource] = useState<'hostinger' | 'local'>('local');
  const [hostingerStatus, setHostingerStatus] = useState<HostingerStatusResponse | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTecnico, setFormTecnico] = useState('');
  const [formUn, setFormUn] = useState('');
  const [formMes, setFormMes] = useState('');
  const [formContrato, setFormContrato] = useState('');
  const [formDataFato, setFormDataFato] = useState(new Date().toISOString().split('T')[0]);
  const [formFato, setFormFato] = useState('');
  const [formCausa, setFormCausa] = useState('');
  const [formAcao, setFormAcao] = useState('');
  const [formPrazo, setFormPrazo] = useState('');
  const [formResponsavel, setFormResponsavel] = useState('');
  const [formStatus, setFormStatus] = useState<FcaItem['status']>('Pendente');
  const [formEvidencias, setFormEvidencias] = useState<FcaEvidence[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterUn, setFilterUn] = useState<string>('all');
  const [filterMes, setFilterMes] = useState<string>('all');

  // Evidence Zoom Modal
  const [zoomImage, setZoomImage] = useState<FcaEvidence | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Distinct Technicians and UNs from loaded records
  const distinctTechs = React.useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.tecnico && r.tecnico !== 'SEM DADO') set.add(r.tecnico);
    });
    return Array.from(set).sort();
  }, [records]);

  const distinctUns = React.useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.un && r.un !== 'Sem dado') set.add(r.un);
    });
    return Array.from(set).sort();
  }, [records]);

  // Distinct Months strictly loaded and formatted according to analytical dataset
  const distinctMonths = React.useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      let m = (r.mes || '').trim().toUpperCase();
      if (!m || m === '-' || m === 'SEM DADO') {
        if (r.datAgenda) {
          const p = parseDateInfo(r.datAgenda);
          if (p) {
            const mNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
            m = `${mNames[p.month - 1]}/${p.year}`;
          }
        }
      }
      if (m && m !== '-' && m !== 'SEM DADO') {
        set.add(m);
      }
    });

    return Array.from(set).sort((a, b) => {
      const pA = parseMesReference(a);
      const pB = parseMesReference(b);
      const keyA = pA ? pA.year * 12 + pA.month : 0;
      const keyB = pB ? pB.year * 12 + pB.month : 0;
      return keyA !== keyB ? keyA - keyB : a.localeCompare(b);
    });
  }, [records]);

  // Helper to test if a record belongs to a reference month
  const isRecordInMonth = (r: NoShowRecord, mesTarget: string) => {
    if (!mesTarget) return true;
    const targetNorm = mesTarget.trim().toUpperCase();
    const rMesNorm = (r.mes || '').trim().toUpperCase();
    if (rMesNorm === targetNorm) return true;

    const parsedTarget = parseMesReference(targetNorm);
    if (!parsedTarget) return false;

    const parsedR = parseMesReference(rMesNorm);
    if (parsedR && parsedR.month === parsedTarget.month && parsedR.year === parsedTarget.year) {
      return true;
    }

    if (r.datAgenda) {
      const pDate = parseDateInfo(r.datAgenda);
      if (pDate && pDate.month === parsedTarget.month && pDate.year === parsedTarget.year) {
        return true;
      }
    }
    return false;
  };

  // Scored records in analytical data for current technician and month
  const scoredRecordsForTechAndMonth = React.useMemo(() => {
    if (!formTecnico.trim()) return [];
    const techClean = formTecnico.trim().toUpperCase();
    return records.filter((r) => {
      const rTech = (r.tecnico || '').trim().toUpperCase();
      if (rTech !== techClean) return false;
      if (formMes) {
        return isRecordInMonth(r, formMes);
      }
      return true;
    });
  }, [records, formTecnico, formMes]);

  // Unique contracts from those scored records
  const scoredContracts = React.useMemo(() => {
    const map = new Map<string, { contrato: string; count: number; sampleRecord: NoShowRecord }>();
    scoredRecordsForTechAndMonth.forEach((r) => {
      const c = (r.contrato || '').trim();
      if (c && c !== '-' && c.toLowerCase() !== 'sem dado') {
        if (!map.has(c)) {
          map.set(c, { contrato: c, count: 1, sampleRecord: r });
        } else {
          map.get(c)!.count += 1;
        }
      }
    });
    return Array.from(map.values());
  }, [scoredRecordsForTechAndMonth]);

  // Load FCAs on mount
  useEffect(() => {
    loadData();
    checkHostingerStatus();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await fcaApi.getFcas();
    setFcas(res.data);
    setStorageSource(res.source);
    setLoading(false);
  };

  const checkHostingerStatus = async () => {
    const st = await fcaApi.getHostingerStatus();
    setHostingerStatus(st);
  };

  // When technician and month are provided, auto-load all scored contracts into formContrato
  const loadContractsForTechAndMonth = (tech: string, mes: string) => {
    const techClean = (tech || '').trim().toUpperCase();
    if (!techClean) return;

    const matched = records.filter((r) => {
      const rTech = (r.tecnico || '').trim().toUpperCase();
      if (rTech !== techClean) return false;
      if (mes) {
        return isRecordInMonth(r, mes);
      }
      return true;
    });

    if (matched.length > 0) {
      // Auto-set UN from analytical data
      const foundUn = matched.find((r) => r.un && r.un !== 'Sem dado')?.un;
      if (foundUn) {
        setFormUn(foundUn);
      }

      // Collect all contracts where this technician was scored in that month
      const contracts = Array.from(
        new Set(
          matched
            .map((r) => (r.contrato || '').trim())
            .filter((c) => c && c !== '-' && c.toLowerCase() !== 'sem dado')
        )
      );

      if (contracts.length === 1) {
        setFormContrato(contracts[0]);
      } else if (contracts.length > 1) {
        setFormContrato(contracts.join(', '));
      }

      // Suggest date from first matched record if available
      if (matched[0].datAgenda) {
        const p = parseDateInfo(matched[0].datAgenda);
        if (p) {
          const pad = (n: number) => String(n).padStart(2, '0');
          setFormDataFato(`${p.year}-${pad(p.month)}-${pad(p.day)}`);
        }
      }
    }
  };

  // When a technician is selected in form
  const handleSelectTecnico = (techName: string) => {
    setFormTecnico(techName);
    const techClean = (techName || '').trim().toUpperCase();
    if (!techClean) return;

    // Check months where this technician has scored records
    const techRecords = records.filter((r) => (r.tecnico || '').trim().toUpperCase() === techClean);
    if (techRecords.length > 0) {
      const techMonths = Array.from(
        new Set(
          techRecords
            .map((r) => (r.mes || '').trim().toUpperCase())
            .filter((m) => m && m !== '-' && m !== 'SEM DADO')
        )
      );

      let targetMonth = formMes;
      // If no month is selected yet or not in this tech's months, auto-select the first available month for this tech
      if (!targetMonth || !techMonths.includes(targetMonth)) {
        if (techMonths.length > 0) {
          targetMonth = techMonths[0];
          setFormMes(targetMonth);
        }
      }

      loadContractsForTechAndMonth(techName, targetMonth);
    }
  };

  // When a month is selected in form
  const handleSelectMes = (mesVal: string) => {
    setFormMes(mesVal);
    if (formTecnico) {
      loadContractsForTechAndMonth(formTecnico, mesVal);
    }
  };

  // Fill Fato description automatically using the analytical summary
  const handleFillFatoSummary = () => {
    if (!scoredRecordsForTechAndMonth.length) return;
    const count = scoredRecordsForTechAndMonth.length;
    const contratosStr = scoredContracts.map((c) => c.contrato).join(', ');
    const baixas = Array.from(new Set(scoredRecordsForTechAndMonth.map((r) => r.baixa).filter(Boolean))).join(', ');
    const regras = Array.from(new Set(scoredRecordsForTechAndMonth.map((r) => r.regraFinal).filter(Boolean))).join(', ');
    const nodes = Array.from(new Set(scoredRecordsForTechAndMonth.map((r) => r.node).filter(Boolean))).join(', ');

    const summary = `Identificado no-show para o técnico ${formTecnico} referente a ${count} ocorrência(s) no mês de ${formMes || 'referência'}: ${contratosStr}. Código(s) de Baixa: ${baixas || 'Não informado'} | Regra Final: ${regras || 'Não informado'} | Node(s): ${nodes || 'Não informado'}.`;
    setFormFato(summary);
  };

  // Photo upload handling (multiple files support)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const newEvidence: FcaEvidence = {
            id: `evi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            dataUrl: reader.result,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          };
          setFormEvidencias((prev) => [...prev, newEvidence]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveEvidence = (id: string) => {
    setFormEvidencias((prev) => prev.filter((e) => e.id !== id));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormTecnico('');
    setFormUn('');
    setFormMes(distinctMonths[0] || '');
    setFormContrato('');
    setFormDataFato(new Date().toISOString().split('T')[0]);
    setFormFato('');
    setFormCausa('');
    setFormAcao('');
    setFormPrazo('');
    setFormResponsavel('');
    setFormStatus('Pendente');
    setFormEvidencias([]);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleEditFca = (item: FcaItem) => {
    setEditingId(item.id);
    setFormTecnico(item.tecnico);
    setFormUn(item.un);
    setFormMes(item.mes || '');
    setFormContrato(item.contrato || '');
    setFormDataFato(item.dataFato || new Date().toISOString().split('T')[0]);
    setFormFato(item.fato);
    setFormCausa(item.causa || '');
    setFormAcao(item.acao || '');
    setFormPrazo(item.prazo || '');
    setFormResponsavel(item.responsavel || '');
    setFormStatus(item.status);
    setFormEvidencias(item.evidencias || []);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteFca = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta tratativa FCA?')) {
      await fcaApi.deleteFca(id);
      loadData();
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTecnico.trim()) {
      setFormError('Por favor informe o Técnico.');
      return;
    }
    if (!formUn.trim()) {
      setFormError('Por favor informe a UN.');
      return;
    }
    if (!formFato.trim()) {
      setFormError('Por favor descreva o Fato ocorrido.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const fcaData = {
      id: editingId || undefined,
      tecnico: formTecnico.trim(),
      un: formUn.trim(),
      mes: formMes.trim(),
      contrato: formContrato.trim(),
      dataFato: formDataFato,
      fato: formFato.trim(),
      causa: formCausa.trim(),
      acao: formAcao.trim(),
      prazo: formPrazo.trim(),
      responsavel: formResponsavel.trim(),
      status: formStatus,
      evidencias: formEvidencias,
    };

    const res = await fcaApi.saveFca(fcaData);
    setSubmitting(false);

    if (res.data) {
      resetForm();
      loadData();
    }
  };

  // Filtered FCA List
  const filteredFcas = React.useMemo(() => {
    return fcas.filter((item) => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (filterUn !== 'all' && item.un !== filterUn) return false;
      if (filterMes !== 'all' && item.mes !== filterMes) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches =
          item.tecnico.toLowerCase().includes(query) ||
          item.un.toLowerCase().includes(query) ||
          item.fato.toLowerCase().includes(query) ||
          item.causa.toLowerCase().includes(query) ||
          item.acao.toLowerCase().includes(query) ||
          (item.contrato && item.contrato.toLowerCase().includes(query)) ||
          (item.responsavel && item.responsavel.toLowerCase().includes(query));
        if (!matches) return false;
      }
      return true;
    });
  }, [fcas, filterStatus, filterUn, filterMes, searchTerm]);

  // Summary counts
  const totalFcas = fcas.length;
  const pendentesCount = fcas.filter((i) => i.status === 'Pendente').length;
  const emAndamentoCount = fcas.filter((i) => i.status === 'Em Andamento').length;
  const concluidosCount = fcas.filter((i) => i.status === 'Concluído').length;
  const comEvidenciaCount = fcas.filter((i) => i.evidencias && i.evidencias.length > 0).length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner with FCA Governance & Hostinger status */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-[#DA291C] shrink-0 mt-0.5">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Gestão de FCA: Fato · Causa · Ação
                </h2>
                <span className="bg-red-100 text-[#DA291C] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Auditoria Operacional
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Metodologia estruturada para tratativa de no-show técnico e reincidências operacionais.
                Registre fatos ocorridos em campo, investigue causas raízes, defina planos de ação e anexe evidências fotográficas.
              </p>
            </div>
          </div>

          {/* Action buttons & Hostinger status */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenHostingerConfig}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors shadow-xs ${
                hostingerStatus?.connected
                  ? 'bg-purple-50 text-[#673DE6] border-purple-200 hover:bg-purple-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="Configurar credenciais do banco MySQL na Hostinger"
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span>
                {hostingerStatus?.connected
                  ? 'Hostinger MySQL Conectado'
                  : 'Configurar Banco Hostinger'}
              </span>
            </button>

            <button
              onClick={() => {
                resetForm();
                setIsFormOpen(!isFormOpen);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-md bg-[#DA291C] hover:bg-[#B31B10] text-white shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isFormOpen ? 'Fechar Formulário' : '+ Novo FCA'}
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-md p-3 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de FCAs</span>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{totalFcas}</div>
            <span className="text-[10px] text-slate-500">Planos registrados</span>
          </div>

          <div className="bg-amber-50/70 rounded-md p-3 border border-amber-100">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pendentes</span>
            <div className="text-xl font-extrabold text-amber-900 mt-0.5">{pendentesCount}</div>
            <span className="text-[10px] text-amber-600">Aguardando início</span>
          </div>

          <div className="bg-blue-50/70 rounded-md p-3 border border-blue-100">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Em Andamento</span>
            <div className="text-xl font-extrabold text-blue-900 mt-0.5">{emAndamentoCount}</div>
            <span className="text-[10px] text-blue-600">Em execução</span>
          </div>

          <div className="bg-emerald-50/70 rounded-md p-3 border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Concluídos</span>
            <div className="text-xl font-extrabold text-emerald-900 mt-0.5">{concluidosCount}</div>
            <span className="text-[10px] text-emerald-600">Ações finalizadas</span>
          </div>

          <div className="bg-purple-50/70 rounded-md p-3 border border-purple-100 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Com Foto / Evidência</span>
            <div className="text-xl font-extrabold text-purple-900 mt-0.5">{comEvidenciaCount}</div>
            <span className="text-[10px] text-purple-600">Fotos anexadas</span>
          </div>
        </div>
      </div>

      {/* Form Drawer / Accordion */}
      {isFormOpen && (
        <div className="bg-white rounded-lg border-2 border-red-200 p-5 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#DA291C] text-white">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {editingId ? 'Editar Plano de Ação FCA' : 'Novo Registro de FCA (Fato, Causa e Ação)'}
              </h3>
            </div>
            <button
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-4">
            
            {/* Row 1: Técnico, UN, Mês, Contrato, Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* Técnico */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Técnico *
                </label>
                <input
                  type="text"
                  list="tech-suggestions"
                  required
                  placeholder="Nome ou Matrícula"
                  value={formTecnico}
                  onChange={(e) => handleSelectTecnico(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-[#DA291C]"
                />
                <datalist id="tech-suggestions">
                  {distinctTechs.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              {/* UN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  UN (Unidade de Negócio) *
                </label>
                <input
                  type="text"
                  list="un-suggestions"
                  required
                  placeholder="ex: MAN-AFLINE"
                  value={formUn}
                  onChange={(e) => setFormUn(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-[#DA291C]"
                />
                <datalist id="un-suggestions">
                  {distinctUns.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>

              {/* Mês de Referência */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mês de Referência
                </label>
                <select
                  value={formMes}
                  onChange={(e) => handleSelectMes(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-[#DA291C] cursor-pointer"
                >
                  <option value="">Selecione o Mês...</option>
                  {distinctMonths.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contrato / OS */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Contrato / OS (Opcional)
                  </label>
                  {scoredContracts.length > 0 && (
                    <span className="text-[10px] font-bold text-[#DA291C]">
                      {scoredContracts.length} no analítico
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="ex: 226532503"
                  value={formContrato}
                  onChange={(e) => setFormContrato(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-[#DA291C]"
                />
              </div>

              {/* Data do Fato */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data do Fato *
                </label>
                <input
                  type="date"
                  required
                  value={formDataFato}
                  onChange={(e) => setFormDataFato(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-[#DA291C]"
                />
              </div>
            </div>

            {/* Painel Informativo: Contratos Pontuados no Analítico */}
            {formTecnico && formMes && (
              <div className="p-3 bg-red-50/70 border border-red-200 rounded-md animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#DA291C]"></span>
                    <span className="text-xs font-bold text-slate-900">
                      Contratos pontuados no analítico ({scoredRecordsForTechAndMonth.length} ocorrência{scoredRecordsForTechAndMonth.length !== 1 ? 's' : ''}):
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Técnico: <strong className="text-slate-800">{formTecnico}</strong> · Mês: <strong className="text-slate-800">{formMes}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {scoredContracts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormContrato(scoredContracts.map((c) => c.contrato).join(', '))}
                        className="text-[11px] font-semibold text-[#DA291C] hover:text-[#B31B10] bg-white px-2 py-0.5 rounded border border-red-200 hover:bg-red-50 transition-colors shadow-2xs"
                      >
                        Carregar todos ({scoredContracts.length})
                      </button>
                    )}
                    {scoredRecordsForTechAndMonth.length > 0 && (
                      <button
                        type="button"
                        onClick={handleFillFatoSummary}
                        className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
                      >
                        Preencher Fato Automático
                      </button>
                    )}
                  </div>
                </div>

                {scoredRecordsForTechAndMonth.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Nenhum contrato pontuado encontrado no analítico para este técnico neste mês de referência.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {scoredRecordsForTechAndMonth.map((rec, idx) => {
                      const isSelected = formContrato.includes(rec.contrato);
                      return (
                        <button
                          key={`${rec.contrato}_${rec.datAgenda}_${idx}`}
                          type="button"
                          onClick={() => {
                            setFormContrato(rec.contrato);
                            if (rec.datAgenda) {
                              const p = parseDateInfo(rec.datAgenda);
                              if (p) {
                                const pad = (n: number) => String(n).padStart(2, '0');
                                setFormDataFato(`${p.year}-${pad(p.month)}-${pad(p.day)}`);
                              }
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#DA291C] text-white border-[#DA291C] font-bold shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-[#DA291C] hover:bg-red-50/50'
                          }`}
                          title={`Clique para selecionar este contrato: ${rec.contrato}`}
                        >
                          <span className="font-mono">CT: {rec.contrato}</span>
                          <span className="text-[10px] opacity-80">· {rec.datAgenda || 's/ data'}</span>
                          <span className="text-[10px] opacity-80">· Baixa: {rec.baixa}</span>
                          <span className="text-[10px] opacity-80">· {rec.regraFinal}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Row 2: Fato, Causa, Ação (The core FCA) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* FATO */}
              <div className="bg-red-50/40 p-3 rounded-md border border-red-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-900 mb-1">
                  <span className="w-4 h-4 rounded-full bg-[#DA291C] text-white flex items-center justify-center text-[10px]">
                    F
                  </span>
                  <span>FATO (O que aconteceu?) *</span>
                </div>
                <textarea
                  required
                  rows={4}
                  placeholder="Descreva claramente o ocorrido. Ex: Técnico registrou no-show sem comparecer à residência dentro da janela de atendimento..."
                  value={formFato}
                  onChange={(e) => setFormFato(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:outline-none focus:border-[#DA291C]"
                />
              </div>

              {/* CAUSA */}
              <div className="bg-amber-50/40 p-3 rounded-md border border-amber-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">
                    C
                  </span>
                  <span>CAUSA (Por que aconteceu?)</span>
                </div>
                <textarea
                  rows={4}
                  placeholder="Investigação da causa raiz. Ex: Rota operacional mal dimensionada no despacho, atraso acumulado na atividade anterior..."
                  value={formCausa}
                  onChange={(e) => setFormCausa(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* AÇÃO */}
              <div className="bg-emerald-50/40 p-3 rounded-md border border-emerald-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-1">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                    A
                  </span>
                  <span>AÇÃO (O que será feito?)</span>
                </div>
                <textarea
                  rows={4}
                  placeholder="Plano de ação corretiva ou preventiva. Ex: Reunião de feedback com o técnico, alinhamento de cumprimento de rota e reciclagem de processo..."
                  value={formAcao}
                  onChange={(e) => setFormAcao(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Row 3: Prazo, Responsável, Status e Evidência */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Prazo / Data Limite
                </label>
                <input
                  type="date"
                  value={formPrazo}
                  onChange={(e) => setFormPrazo(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-[#DA291C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Responsável pelo Acompanhamento
                </label>
                <input
                  type="text"
                  placeholder="ex: Supervisor João Silva"
                  value={formResponsavel}
                  onChange={(e) => setFormResponsavel(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-[#DA291C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status da Tratativa
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-[#DA291C] bg-white"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            {/* Row 4: Anexo de Fotos / Evidências */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <ImageIcon className="w-4 h-4 text-[#DA291C]" />
                  <span>Fotos de Evidência da Ocorrência</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    (Prints de sistema, fotos do local, geolocalização ou comprovantes)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-300 hover:border-[#DA291C] rounded text-xs font-semibold text-slate-700 hover:text-[#DA291C] transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Anexar Foto(s)
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              {/* Thumbnails of attached photos */}
              {formEvidencias.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 rounded bg-white">
                  Nenhuma foto anexada. Clique em "Anexar Foto(s)" para adicionar evidências visuais.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                  {formEvidencias.map((evi) => (
                    <div
                      key={evi.id}
                      className="group relative border border-slate-200 rounded overflow-hidden bg-white shadow-xs aspect-video flex items-center justify-center"
                    >
                      <img
                        src={evi.dataUrl}
                        alt={evi.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setZoomImage(evi)}
                          className="p-1 rounded bg-white text-slate-900 hover:bg-slate-100"
                          title="Ampliar foto"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveEvidence(evi.id)}
                          className="p-1 rounded bg-red-600 text-white hover:bg-red-700"
                          title="Remover foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="absolute bottom-0 left-0 right-0 bg-slate-900/80 text-white text-[9px] px-1 truncate py-0.5">
                        {evi.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error message */}
            {formError && (
              <div className="p-2.5 bg-red-50 text-red-800 text-xs rounded border border-red-200 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-1.5 text-xs font-bold rounded bg-[#DA291C] hover:bg-[#B31B10] text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {editingId ? 'Atualizar FCA' : 'Salvar FCA'}
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Filter and Search Bar for FCA Table */}
      <div className="bg-white rounded-lg border border-slate-200 p-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar Técnico, UN, Fato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-[#DA291C]"
            />
          </div>

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-[#DA291C] bg-white text-slate-700"
          >
            <option value="all">Todos os Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluído">Concluído</option>
            <option value="Cancelado">Cancelado</option>
          </select>

          {/* Filter UN */}
          <select
            value={filterUn}
            onChange={(e) => setFilterUn(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-[#DA291C] bg-white text-slate-700"
          >
            <option value="all">Todas as UNs</option>
            {distinctUns.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          {/* Filter Mês */}
          <select
            value={filterMes}
            onChange={(e) => setFilterMes(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-[#DA291C] bg-white text-slate-700"
          >
            <option value="all">Todos os Meses</option>
            {distinctMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Sync & Refresh Status */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${
                storageSource === 'hostinger' ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            {storageSource === 'hostinger'
              ? 'Sincronizado com Hostinger MySQL'
              : 'Armazenado Localmente'}
          </span>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1 text-slate-500 hover:text-[#DA291C] rounded hover:bg-slate-100"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* FCAs Table Listing */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Técnico & UN</th>
                <th className="py-2.5 px-3">Mês / Data</th>
                <th className="py-2.5 px-3 min-w-[200px]">Fato (Ocorrência)</th>
                <th className="py-2.5 px-3 min-w-[180px]">Causa (Raiz)</th>
                <th className="py-2.5 px-3 min-w-[180px]">Ação (Plano)</th>
                <th className="py-2.5 px-3">Prazo / Resp.</th>
                <th className="py-2.5 px-3">Evidências</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFcas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    {totalFcas === 0
                      ? 'Nenhum plano de ação FCA cadastrado. Clique no botão "+ Novo FCA" acima para registrar a primeira tratativa.'
                      : 'Nenhum registro encontrado para os filtros selecionados.'}
                  </td>
                </tr>
              ) : (
                filteredFcas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Técnico & UN */}
                    <td className="py-2.5 px-3 align-top">
                      <div className="font-bold text-slate-900">{item.tecnico}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{item.un}</span>
                      </div>
                      {item.contrato && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {item.contrato}
                        </div>
                      )}
                    </td>

                    {/* Mês / Data */}
                    <td className="py-2.5 px-3 align-top whitespace-nowrap">
                      {item.mes && (
                        <span className="inline-block bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded mb-1">
                          {item.mes}
                        </span>
                      )}
                      <div className="text-[11px] text-slate-500">
                        {item.dataFato
                          ? (() => {
                              const p = item.dataFato.split('-');
                              return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : item.dataFato;
                            })()
                          : '-'}
                      </div>
                    </td>

                    {/* Fato */}
                    <td className="py-2.5 px-3 align-top">
                      <div className="text-xs text-slate-800 line-clamp-3" title={item.fato}>
                        {item.fato}
                      </div>
                    </td>

                    {/* Causa */}
                    <td className="py-2.5 px-3 align-top">
                      <div className="text-xs text-slate-600 line-clamp-3" title={item.causa || '-'}>
                        {item.causa || <span className="text-slate-400 italic">Não informada</span>}
                      </div>
                    </td>

                    {/* Ação */}
                    <td className="py-2.5 px-3 align-top">
                      <div className="text-xs text-slate-600 line-clamp-3" title={item.acao || '-'}>
                        {item.acao || <span className="text-slate-400 italic">Não informada</span>}
                      </div>
                    </td>

                    {/* Prazo / Resp */}
                    <td className="py-2.5 px-3 align-top whitespace-nowrap">
                      <div className="text-xs font-semibold text-slate-700">
                        {item.prazo
                          ? (() => {
                              const p = item.prazo.split('-');
                              return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : item.prazo;
                            })()
                          : '-'}
                      </div>
                      {item.responsavel && (
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[120px]" title={item.responsavel}>
                          {item.responsavel}
                        </div>
                      )}
                    </td>

                    {/* Evidências */}
                    <td className="py-2.5 px-3 align-top">
                      {item.evidencias && item.evidencias.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {item.evidencias.slice(0, 3).map((evi) => (
                            <button
                              key={evi.id}
                              type="button"
                              onClick={() => setZoomImage(evi)}
                              className="w-7 h-7 rounded border border-slate-200 overflow-hidden hover:scale-110 transition-transform shrink-0"
                              title={`Ampliar: ${evi.name}`}
                            >
                              <img
                                src={evi.dataUrl}
                                alt={evi.name}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                          {item.evidencias.length > 3 && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                              +{item.evidencias.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Sem foto</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 align-top text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'Concluído'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'Em Andamento'
                            ? 'bg-blue-100 text-blue-800'
                            : item.status === 'Cancelado'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 align-top text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleEditFca(item)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFca(item.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-3xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-red-400" />
                <span className="text-xs font-bold truncate max-w-md">{zoomImage.name}</span>
              </div>
              <button
                onClick={() => setZoomImage(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-950 max-h-[80vh] overflow-auto">
              <img
                src={zoomImage.dataUrl}
                alt={zoomImage.name}
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
            <div className="p-3 bg-slate-100 text-right">
              <a
                href={zoomImage.dataUrl}
                download={zoomImage.name}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#DA291C] hover:bg-[#B31B10] text-white text-xs font-semibold rounded"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Evidência
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
