import * as XLSX from 'xlsx';
import { ColumnDefinition, NoShowRecord, FilterState } from '../types';

export const EXPECTED_COLUMNS: ColumnDefinition[] = [
  { field: 'contrato', label: 'Contrato', excelLetter: 'C', colIndex: 2, description: 'Número do Contrato' },
  { field: 'mes', label: 'Mês', excelLetter: 'A', colIndex: 0, description: 'Mês de referência' },
  { field: 'cidade', label: 'Cidade', excelLetter: 'F', colIndex: 5, description: 'Município de atendimento' },
  { field: 'origem', label: 'Origem', excelLetter: 'G', colIndex: 6, description: 'Canal de entrada / Roteamento' },
  { field: 'tecnico', label: 'Técnico', excelLetter: 'L', colIndex: 11, description: 'Nome ou matrícula do técnico' },
  { field: 'un', label: 'UN', excelLetter: 'M', colIndex: 12, description: 'Unidade de Negócio regional' },
  { field: 'tipoOs', label: 'Tipo OS', excelLetter: 'N', colIndex: 13, description: 'Tipo da Ordem de Serviço' },
  { field: 'itemVerb', label: 'ITEM_VERB', excelLetter: 'O', colIndex: 14, description: 'Item Verbal / Subtipo de Serviço' },
  { field: 'tpFechamentoOs', label: 'Fechamento OS', excelLetter: 'P', colIndex: 15, description: 'Tipo de fechamento da OS' },
  { field: 'datAgenda', label: 'Data Agenda', excelLetter: 'Q', colIndex: 16, description: 'Data do agendamento' },
  { field: 'baixa', label: 'Código Baixa', excelLetter: 'S', colIndex: 18, description: 'Código e motivo da baixa' },
  { field: 'regraFinal', label: 'Regra Final', excelLetter: 'RF', colIndex: 19, description: 'Diagnóstico e regra final do caso' },
  { field: 'area', label: 'Área', excelLetter: 'Z', colIndex: 25, description: 'Área técnica operacional (Coluna Z)' },
  { field: 'tec1', label: 'TEC1', excelLetter: 'AH', colIndex: 33, description: 'Técnico auxiliar ou parceiro' },
  { field: 'statusGeoloc', label: 'Status Geoloc', excelLetter: 'AJ', colIndex: 35, description: 'Diagnóstico de geolocalização' },
  { field: 'objetivoUra', label: 'OBJETIVO_URA_2', excelLetter: 'AK', colIndex: 36, description: 'Objetivo da URA (Aba/Coluna OBJETIVO_URA_2)' },
  { field: 'statusLigacao', label: 'Status Ligação', excelLetter: 'AL', colIndex: 37, description: 'Resultado da ligação / contato' },
  { field: 'node', label: 'Node', excelLetter: 'T', colIndex: 20, description: 'Nó de rede da distribuição' },
  { field: 'descJanela', label: 'DESC_JANELA', excelLetter: 'J', colIndex: 9, description: 'Janela de atendimento (DESC_JANELA)' },
];

/**
 * Normalizes string for fuzzy header comparison
 */
function normalizeHeader(str: string): string {
  return String(str || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

/**
 * Formats date and time concisely (DD/MM/AAAA or DD/MM/AAAA HH:mm)
 */
export function formatDataHora(val: any): string {
  if (val === null || val === undefined || val === '') return '-';

  let date: Date | null = null;

  if (val instanceof Date) {
    date = isNaN(val.getTime()) ? null : val;
  } else if (typeof val === 'number') {
    // Excel serial date to JS Date
    date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (isNaN(date.getTime())) date = null;
  } else {
    const str = String(val).trim();
    if (!str || str === 'null' || str === 'undefined' || str === '-' || str.toLowerCase() === 'não informado') {
      return '-';
    }

    // Match DD/MM/YYYY or DD/MM/YYYY HH:mm
    const brMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (brMatch) {
      const [_, d, m, y, hh, mm] = brMatch;
      const day = d.padStart(2, '0');
      const month = m.padStart(2, '0');
      if (hh !== undefined && mm !== undefined && (hh !== '00' || mm !== '00')) {
        return `${day}/${month}/${y} ${hh.padStart(2, '0')}:${mm}`;
      }
      return `${day}/${month}/${y}`;
    }

    // Match ISO "2026-10-15" or "2026-10-15T14:30:00"
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
    if (isoMatch) {
      const [_, y, m, d, hh, mm] = isoMatch;
      if (hh !== undefined && mm !== undefined && (hh !== '00' || mm !== '00')) {
        return `${d}/${m}/${y} ${hh}:${mm}`;
      }
      return `${d}/${m}/${y}`;
    }

    // Try parsing string date like "Wed Sep 30 2026 00:00:28 GMT-0300"
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  if (date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (hours === '00' && minutes === '00') {
      return `${day}/${month}/${year}`;
    }
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  return String(val);
}

/**
 * Formats month cleanly (e.g. SET/2026, OUT/2026)
 */
export function formatMes(val: any): string {
  if (val === null || val === undefined || val === '') return 'Sem dado';

  const mesesSiglas = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  if (val instanceof Date && !isNaN(val.getTime())) {
    return `${mesesSiglas[val.getMonth()]}/${val.getFullYear()}`;
  }

  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return `${mesesSiglas[d.getUTCMonth()]}/${d.getUTCFullYear()}`;
    }
  }

  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'não informado' || str.toLowerCase() === 'sem dado') {
    return 'Sem dado';
  }

  if (/^[A-Z]{3}\/\d{4}$/i.test(str)) {
    return str.toUpperCase();
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && (str.includes('GMT') || str.includes('Hora') || str.includes('-') || str.includes('/'))) {
    return `${mesesSiglas[parsed.getMonth()]}/${parsed.getFullYear()}`;
  }

  return str;
}

/**
 * Normalizes TEC1 strictly to: COM PADRAO, SEM PADRAO, EXPURGADA, or -
 */
export function normalizeTec1(val: any): string {
  if (val === null || val === undefined) return '-';
  const s = String(val).trim().toUpperCase();

  if (
    !s ||
    s === '-' ||
    s === 'NÃO INFORMADO' ||
    s === 'NAO INFORMADO' ||
    s === 'SEM APOIO' ||
    s === 'SEM_APOIO' ||
    s === 'NULL' ||
    s === 'UNDEFINED' ||
    s.includes('SOLO')
  ) {
    return '-';
  }

  if (s.includes('EXPURG')) {
    return 'EXPURGADA';
  }
  if (s.includes('SEM PADR') || s.includes('SEM PADRAO') || s === 'SEM_PADRAO' || s === 'NAO PADRAO') {
    return 'SEM PADRAO';
  }
  if (s.includes('COM PADR') || s.includes('COM PADRAO') || s === 'COM_PADRAO' || s === 'PADRAO') {
    return 'COM PADRAO';
  }

  return '-';
}

/**
 * Normalizes UN: when empty/blank, returns "Sem dado"
 */
export function normalizeUN(val: any): string {
  if (val === null || val === undefined) return 'Sem dado';
  const s = String(val).trim();
  if (
    !s ||
    s === '-' ||
    s.toLowerCase() === 'não informado' ||
    s.toLowerCase() === 'nao informado' ||
    s.toLowerCase() === 'null' ||
    s.toLowerCase() === 'undefined' ||
    s.toLowerCase() === 'sem dado'
  ) {
    return 'Sem dado';
  }
  return s;
}

/**
 * Evaluates if a geolocation status is irregular.
 * As requested: considers specifically "SEM PADRAO" and "SEM GEO".
 */
export function isGeolocIrregular(val: any): boolean {
  if (!val) return false;
  const s = String(val).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return (
    s === 'SEM PADRAO' ||
    s === 'SEM GEO' ||
    s.includes('SEM PADRAO') ||
    s.includes('SEM GEO') ||
    s === 'SEM_PADRAO' ||
    s === 'SEM_GEO'
  );
}

/**
 * Normalizes Janela de Atendimento (DESC_JANELA):
 * As requested: when empty/blank, returns "vazio".
 */
export function normalizeJanela(val: any): string {
  if (val === null || val === undefined) return 'vazio';
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
    return 'vazio';
  }
  return s;
}

/**
 * Evaluates if a record represents "URA IMPRODUTIVA" (previously Cliente Aguardava):
 * As requested by user:
 * "no analitico a soma do vazios, insucesso e - dá 449 e no painel está contabilizando apenas 414. mude o nome de cliente aguardava para URA IMPRODUTIVA"
 * Considers specifically VAZIO, INSUCESSO, and (-) in the OBJETIVO_URA_2 column:
 * - SUCESSO (136 cases in user's base) is the only productive status.
 * - VAZIO (375 cases), INSUCESSO (15 cases), and (-) / dashes / accounting zeros (59 cases) sum to exactly 449 cases.
 */
export function isUraImprodutiva(record: NoShowRecord): boolean {
  // Primary: evaluate column OBJETIVO_URA_2 (record.objetivoUra or raw column variants)
  const valUra = record.objetivoUra !== undefined && record.objetivoUra !== null
    ? String(record.objetivoUra).trim()
    : '';

  const rawUra = String(
    record.raw?.['OBJETIVO_URA_2'] ??
    record.raw?.['OBJETIVO_URA'] ??
    record.raw?.['OBJETIVO URA 2'] ??
    record.raw?.['OBJETIVO URA'] ??
    record.raw?.['OBJETIVO_URA2'] ??
    record.raw?.['URA_OBJETIVO_2'] ??
    record.raw?.['URA_OBJETIVO'] ??
    record.raw?.['OBJETIVO'] ??
    record.raw?.['STATUS_URA'] ??
    ''
  ).trim();

  // If we have either valUra or rawUra, use it; otherwise fallback to statusLigacao
  const target = valUra || rawUra || String(record.statusLigacao || record.raw?.['STATUS_LIGACAO'] || '').trim();
  const s = target.toUpperCase();

  // 1. SUCESSO is the ONLY productive status (136 cases in user's base)
  if (s.includes('SUCESSO') && !s.includes('INSUCESSO')) {
    return false;
  }

  // 2. Vazio / em branco / null / não informado (375 cases in user's base)
  if (
    !s ||
    s === 'VAZIO' ||
    s === '(VAZIO)' ||
    s === 'EM BRANCO' ||
    s === '(EM BRANCO)' ||
    s === 'BRANCO' ||
    s === 'SEM DADO' ||
    s === 'NÃO INFORMADO' ||
    s === 'NAO INFORMADO' ||
    s === 'NULL' ||
    s === 'UNDEFINED' ||
    s === 'N/A' ||
    s === '#N/A' ||
    s === 'NA' ||
    s === 'SEM REGISTRO'
  ) {
    return true;
  }

  // 3. Traço (-), minuses, en-dash, em-dash, accounting zeros (59 cases in user's base)
  if (
    s === '-' ||
    s === '—' ||
    s === '–' ||
    s === '−' ||
    s === '0' ||
    s === '0.0' ||
    s === '0,0' ||
    s === '- -' ||
    s === '--' ||
    s === '- - -' ||
    s.replace(/[\s\-\u2010-\u2015\u2212\uFE58\uFE63\uFF0D—–_]/g, '') === ''
  ) {
    return true;
  }

  // 4. Insucesso (15 cases in user's base)
  if (s.includes('INSUCESSO')) {
    return true;
  }

  // Any other non-sucesso status in OBJETIVO_URA_2 is improdutiva
  return true;
}

export const isClienteAguardavaImpacto = isUraImprodutiva;

export interface ParsedDateInfo {
  day: number;
  month: number;
  year: number;
  dayLabel: string;      // e.g. "02/10"
  fullDateKey: string;   // e.g. "2026-10-02"
  weekNumber: 1 | 2 | 3 | 4 | 5;
  weekLabel: string;     // e.g. "S1 (Dias 1 a 7)"
}

/**
 * Extracts date information for volume per day and week groupings (S1..S5)
 */
export function parseDateInfo(datAgenda: string, monthDays?: number): ParsedDateInfo | null {
  if (!datAgenda) return null;

  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  // Match DD/MM/YYYY
  const brMatch = datAgenda.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
  if (brMatch) {
    day = parseInt(brMatch[1], 10);
    month = parseInt(brMatch[2], 10);
    year = parseInt(brMatch[3], 10);
  } else {
    // Match YYYY-MM-DD
    const isoMatch = datAgenda.match(/^(\d{4})-(\d{2})-(\d{1,2})/);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10);
      day = parseInt(isoMatch[3], 10);
    }
  }

  if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year)) {
    return null;
  }

  const daysInMonth = monthDays || new Date(year, month, 0).getDate();
  const dayLabel = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
  const fullDateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  let weekNumber: 1 | 2 | 3 | 4 | 5 = 1;
  let weekLabel = 'S1 (Dias 1 a 7)';

  if (day >= 1 && day <= 7) {
    weekNumber = 1;
    weekLabel = 'S1 (Dias 1 a 7)';
  } else if (day >= 8 && day <= 14) {
    weekNumber = 2;
    weekLabel = 'S2 (Dias 8 a 14)';
  } else if (day >= 15 && day <= 21) {
    weekNumber = 3;
    weekLabel = 'S3 (Dias 15 a 21)';
  } else if (day >= 22 && day <= 28) {
    weekNumber = 4;
    weekLabel = 'S4 (Dias 22 a 28)';
  } else {
    weekNumber = 5;
    weekLabel = daysInMonth === 30 ? 'S5 (Dias 29 a 30)' : 'S5 (Dias 29 a 31)';
  }

  return { day, month, year, dayLabel, fullDateKey, weekNumber, weekLabel };
}

const MONTH_NAMES_MAP: Record<string, number> = {
  JAN: 1, JANEIRO: 1,
  FEV: 2, FEVEREIRO: 2,
  MAR: 3, MARCO: 3, MARÇO: 3,
  ABR: 4, ABRIL: 4,
  MAI: 5, MAIO: 5,
  JUN: 6, JUNHO: 6,
  JUL: 7, JULHO: 7,
  AGO: 8, AGOSTO: 8,
  SET: 9, SETEMBRO: 9,
  OUT: 10, OUTUBRO: 10,
  NOV: 11, NOVEMBRO: 11,
  DEZ: 12, DEZEMBRO: 12,
};

/**
 * Parses a reference month string (e.g. "OUT/2026", "SET/2026", "10/2026", "2026-10", "OUTUBRO/2026")
 */
export function parseMesReference(mesStr?: string | null): { month: number; year: number } | null {
  if (!mesStr) return null;
  const s = String(mesStr).trim().toUpperCase();

  // Pattern: "OUT/2026", "SET/2026", "OUT-2026", "OUTUBRO/2026", "OUT/26"
  const textMatch = s.match(/^([A-ZÇÃÕ]+)[\/\-_\s]+(\d{2,4})/);
  if (textMatch) {
    const rawMonthName = textMatch[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const month = MONTH_NAMES_MAP[rawMonthName];
    let year = parseInt(textMatch[2], 10);
    if (year < 100) year += 2000;
    if (month && year) return { month, year };
  }

  // Pattern: "10/2026", "09/2026", "10/26"
  const numMatch = s.match(/^(\d{1,2})[\/\-](\d{2,4})/);
  if (numMatch) {
    const month = parseInt(numMatch[1], 10);
    let year = parseInt(numMatch[2], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && year) return { month, year };
  }

  // Pattern: ISO "2026-10" or "2026/10"
  const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    if (month >= 1 && month <= 12 && year) return { month, year };
  }

  // Pattern: Month name only e.g. "OUTUBRO" or "OUT" (fallback to current year)
  const soloMonth = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (MONTH_NAMES_MAP[soloMonth]) {
    return { month: MONTH_NAMES_MAP[soloMonth], year: new Date().getFullYear() };
  }

  return null;
}

export interface RecordWeekInfo {
  weekNumber: 1 | 2 | 3 | 4 | 5;
  weekLabel: string;
  isPreviousMonthCarryover: boolean;
}

/**
 * Computes week assignment for a record.
 * As explicitly requested:
 * "quando houver esse tipo de situação em que o dia da agenda for do mês passado, coloque na contabilização do volume por semana do mês na S1"
 * "quando escolher um mês e tiver contratos do mês anterior coloque para contabilizar na S1."
 */
export function getRecordWeekInfo(
  datAgenda: string,
  recMes?: string,
  selectedMonths?: string[]
): RecordWeekInfo | null {
  const parsed = parseDateInfo(datAgenda);
  if (!parsed) return null;

  // Determine reference month:
  // 1. If user filtered by a specific month in selectedMonths (e.g. ['OUT/2026'])
  // 2. Otherwise use the record's own recMes
  let refParsed = (selectedMonths && selectedMonths.length === 1)
    ? parseMesReference(selectedMonths[0])
    : null;

  if (!refParsed && recMes) {
    refParsed = parseMesReference(recMes);
  }

  // If we have a reference month, check if datAgenda is from a month prior to reference month:
  if (refParsed) {
    const agendaMonthIndex = parsed.year * 12 + parsed.month;
    const refMonthIndex = refParsed.year * 12 + refParsed.month;

    // Dates prior to the reference month belong to S1 cycle
    if (agendaMonthIndex < refMonthIndex) {
      return {
        weekNumber: 1,
        weekLabel: 'S1 (Dias 1 a 7)',
        isPreviousMonthCarryover: true,
      };
    }
  }

  return {
    weekNumber: parsed.weekNumber,
    weekLabel: parsed.weekLabel,
    isPreviousMonthCarryover: false,
  };
}

/**
 * Evaluates whether a NoShowRecord satisfies the active FilterState,
 * optionally excluding a specific field (used for cascading / faceted dropdown options).
 */
export function isRecordMatchingFilters(
  rec: NoShowRecord,
  filters: FilterState,
  excludedField?: keyof FilterState
): boolean {
  // Filter MES
  if (excludedField !== 'mes' && filters.mes.length > 0 && !filters.mes.includes(rec.mes)) {
    return false;
  }
  // Filter CIDADE
  if (excludedField !== 'cidade' && filters.cidade.length > 0 && !filters.cidade.includes(rec.cidade)) {
    return false;
  }
  // Filter ORIGEM
  if (excludedField !== 'origem' && filters.origem.length > 0 && !filters.origem.includes(rec.origem)) {
    return false;
  }
  // Filter TECNICO
  if (excludedField !== 'tecnico' && filters.tecnico.length > 0 && !filters.tecnico.includes(rec.tecnico)) {
    return false;
  }
  // Filter UN
  if (excludedField !== 'un' && filters.un.length > 0 && !filters.un.includes(rec.un)) {
    return false;
  }
  // Filter TIPO_OS
  if (excludedField !== 'tipoOs' && filters.tipoOs.length > 0 && !filters.tipoOs.includes(rec.tipoOs)) {
    return false;
  }
  // Filter TP_FECHAMENTO_OS
  if (excludedField !== 'tpFechamentoOs' && filters.tpFechamentoOs.length > 0 && !filters.tpFechamentoOs.includes(rec.tpFechamentoOs)) {
    return false;
  }
  // Filter DAT_AGENDA (dataAgendaStart & dataAgendaEnd)
  // Compare using parsed ISO date key (YYYY-MM-DD) to prevent lexicographical mismatch between DD/MM/YYYY and YYYY-MM-DD
  if (filters.dataAgendaStart || filters.dataAgendaEnd) {
    const parsedAgenda = parseDateInfo(rec.datAgenda);
    if (!parsedAgenda) {
      return false;
    }
    if (filters.dataAgendaStart && parsedAgenda.fullDateKey < filters.dataAgendaStart) {
      return false;
    }
    if (filters.dataAgendaEnd && parsedAgenda.fullDateKey > filters.dataAgendaEnd) {
      return false;
    }
  }
  // Filter BAIXA
  if (excludedField !== 'baixa' && filters.baixa.length > 0 && !filters.baixa.includes(rec.baixa)) {
    return false;
  }
  // Filter REGRA FINAL
  if (excludedField !== 'regraFinal' && filters.regraFinal.length > 0 && !filters.regraFinal.includes(rec.regraFinal)) {
    return false;
  }
  // Filter AREA
  if (excludedField !== 'area' && filters.area.length > 0 && !filters.area.includes(rec.area)) {
    return false;
  }
  // Filter TEC1
  if (excludedField !== 'tec1' && filters.tec1.length > 0 && !filters.tec1.includes(rec.tec1)) {
    return false;
  }
  // Filter STATUS_GEOLOC
  if (excludedField !== 'statusGeoloc' && filters.statusGeoloc.length > 0 && !filters.statusGeoloc.includes(rec.statusGeoloc)) {
    return false;
  }
  // Filter OBJETIVO_URA
  if (excludedField !== 'objetivoUra' && filters.objetivoUra.length > 0 && !filters.objetivoUra.includes(rec.objetivoUra)) {
    return false;
  }
  // Filter STATUS_LIGACAO
  if (excludedField !== 'statusLigacao' && filters.statusLigacao.length > 0 && !filters.statusLigacao.includes(rec.statusLigacao)) {
    return false;
  }
  // Filter NODE
  if (excludedField !== 'node' && filters.node.length > 0 && !filters.node.includes(rec.node)) {
    return false;
  }
  // Filter CONTRATO
  if (excludedField !== 'contrato' && filters.contrato && filters.contrato.length > 0 && !filters.contrato.includes(rec.contrato)) {
    return false;
  }
  // Filter ITEM_VERB
  if (excludedField !== 'itemVerb' && filters.itemVerb && filters.itemVerb.length > 0 && !filters.itemVerb.includes(rec.itemVerb)) {
    return false;
  }
  // Filter DESC_JANELA
  if (excludedField !== 'descJanela' && filters.descJanela && filters.descJanela.length > 0 && !filters.descJanela.includes(rec.descJanela)) {
    return false;
  }
  // Filter DIA
  if (excludedField !== 'dia' && filters.dia && filters.dia.length > 0) {
    const parsed = parseDateInfo(rec.datAgenda);
    if (!parsed || !filters.dia.includes(parsed.dayLabel)) {
      return false;
    }
  }
  // Filter SEMANA (uses getRecordWeekInfo to account for previous month carryovers in S1)
  if (excludedField !== 'semana' && filters.semana && filters.semana.length > 0) {
    const weekInfo = getRecordWeekInfo(rec.datAgenda, rec.mes, filters.mes);
    if (!weekInfo) return false;
    const weekCode = `S${weekInfo.weekNumber}`;
    const matchesWeek = filters.semana.some((s) => {
      return (
        s === weekCode ||
        s.startsWith(weekCode) ||
        (weekInfo.weekLabel && weekInfo.weekLabel.startsWith(s)) ||
        s === weekInfo.weekLabel
      );
    });
    if (!matchesWeek) return false;
  }
  // Quick Search across all attributes
  const query = typeof filters.search === 'string' ? filters.search.trim().toLowerCase() : '';
  if (query) {
    const matches =
      rec.contrato.toLowerCase().includes(query) ||
      rec.itemVerb.toLowerCase().includes(query) ||
      rec.cidade.toLowerCase().includes(query) ||
      rec.tecnico.toLowerCase().includes(query) ||
      rec.baixa.toLowerCase().includes(query) ||
      rec.regraFinal.toLowerCase().includes(query) ||
      rec.un.toLowerCase().includes(query) ||
      rec.node.toLowerCase().includes(query) ||
      rec.descJanela.toLowerCase().includes(query) ||
      rec.tipoOs.toLowerCase().includes(query) ||
      rec.origem.toLowerCase().includes(query) ||
      rec.tpFechamentoOs.toLowerCase().includes(query) ||
      rec.area.toLowerCase().includes(query) ||
      rec.tec1.toLowerCase().includes(query) ||
      rec.statusGeoloc.toLowerCase().includes(query) ||
      rec.objetivoUra.toLowerCase().includes(query) ||
      rec.statusLigacao.toLowerCase().includes(query) ||
      rec.datAgenda.includes(query) ||
      rec.id.toLowerCase().includes(query);
    if (!matches) return false;
  }

  return true;
}

/**
 * Derives the operational final rule classification if not present in the Excel
 */
export function inferRegraFinal(baixa: string, ligacao?: string, geoloc?: string): string {
  const b = (baixa || '').toUpperCase();
  const l = (ligacao || '').toUpperCase();
  const g = (geoloc || '').toUpperCase();

  if (b.includes('B201') || b.includes('NÃO COMPARECEU') || b.includes('NAO COMPARECEU')) {
    return 'NO-SHOW CONFIRMADO';
  }
  if (b.includes('B202') || b.includes('ESTOURO') || b.includes('HORÁRIO')) {
    return 'NO-SHOW POR ESTOURO DE TURNO';
  }
  if (b.includes('B104') || b.includes('CLIENTE AUSENTE')) {
    return l.includes('AGUARD') || g.includes('FORA')
      ? 'NO-SHOW CONTESTADO (CLIENTE AGUARDAVA)'
      : 'IMPROCEDENTE (CLIENTE AUSENTE)';
  }
  if (b.includes('B502') || b.includes('RISCO')) {
    return 'JUSTIFICADO (ÁREA DE RISCO)';
  }
  if (b.includes('B603') || b.includes('CHUVA') || b.includes('INTEMPÉRIE')) {
    return 'JUSTIFICADO (INTEMPÉRIE / CHUVA)';
  }
  if (b.includes('B701') || b.includes('VEÍCULO') || b.includes('PANE')) {
    return 'JUSTIFICADO (PANE MECÂNICA)';
  }
  if (b.includes('B802') || b.includes('ROTEAMENTO') || b.includes('DUPLICADA')) {
    return 'FALHA SISTÊMICA DE ROTEAMENTO';
  }
  if (b.includes('B903') || b.includes('DESISTIU') || b.includes('REAGENDAMENTO')) {
    return 'CANCELAMENTO / REAGENDAMENTO SOLICITADO';
  }
  if (b.includes('B305') || b.includes('CONDOMÍNIO') || b.includes('PORTARIA')) {
    return 'IMPEDIMENTO DE ACESSO';
  }
  if (b.includes('B401') || b.includes('ENDEREÇO') || b.includes('LOCALIZADO')) {
    return 'ENDEREÇO NÃO LOCALIZADO';
  }
  return 'NO-SHOW EM APURAÇÃO';
}

/**
 * Parses an ArrayBuffer or binary from an uploaded Excel file
 */
export function parseExcelWorkbook(data: ArrayBuffer): {
  records: NoShowRecord[];
  sheets: string[];
  totalRows: number;
  detectedColumns: Record<string, string>;
} {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;
  if (!sheetNames.length) {
    throw new Error('Nenhuma planilha encontrada no arquivo Excel.');
  }

  // Map aliases for expected columns
  const nameMatches: Record<string, string[]> = {
    contrato: ['CONTRATO', 'NUM_CONTRATO', 'NUMERO_CONTRATO', 'COD_CONTRATO', 'CD_CONTRATO', 'CONTRATO_CLARO'],
    mes: ['MES', 'MES_REF', 'PERIODO', 'MES_ANO'],
    cidade: ['CIDADE', 'MUNICIPIO', 'LOCALIDADE'],
    origem: ['ORIGEM', 'CANAL_ORIGEM', 'ORIGEM_OS', 'CANAL'],
    tecnico: ['TECNICO', 'NOME_TECNICO', 'COLABORADOR', 'TEC_NOME', 'PROPRIO'],
    un: ['UN', 'UNIDADE_NEGOCIO', 'UNIDADE', 'FILIAL', 'REGIONAL_UN'],
    tipoOs: ['TIPO_OS', 'TIPO_DE_OS', 'TIPOOS', 'SERVICO'],
    itemVerb: ['ITEM_VERB', 'ITEM VERB', 'ITEM_VERBAL', 'ITEMVERB', 'ITEM', 'VERBAL', 'SUB_TIPO_OS', 'ITEM_SERVICO'],
    tpFechamentoOs: ['TP_FECHAMENTO_OS', 'TP_FECHAMENTO', 'TIPO_FECHAMENTO', 'FECHAMENTO_OS', 'FECHAMENTO'],
    datAgenda: ['DAT_AGENDA', 'DATA_AGENDA', 'DATA_AGENDAMENTO', 'AGENDA', 'DT_AGENDA'],
    baixa: ['BAIXA', 'CODIGO_BAIXA', 'COD_BAIXA', 'MOTIVO_BAIXA', 'MOTIVO'],
    regraFinal: ['REGRA_FINAL', 'REGRA FINAL', 'REGRA', 'DIAGNOSTICO_FINAL', 'STATUS_FINAL', 'CLASSIFICACAO_FINAL', 'REGRA_NO_SHOW'],
    area: ['AREA', 'AREA_TECNICA', 'SUB_REGIONAL', 'SETOR'],
    tec1: ['TEC1', 'TEC_1', 'TECNICO_1', 'APOIO', 'PARCEIRO'],
    statusGeoloc: ['STATUS_GEOLOC', 'GEOLOC', 'GEOLOCALIZACAO', 'STATUS_GEO', 'VALIDACAO_GEO'],
    objetivoUra: ['OBJETIVO_URA_2', 'OBJETIVO_URA2', 'OBJETIVO URA 2', 'OBJETIVO_URA', 'OBJETIVO URA', 'URA_OBJETIVO_2', 'URA_OBJETIVO', 'OBJETIVO', 'CONTATO_URA', 'STATUS_URA', 'URA_2'],
    statusLigacao: ['STATUS_LIGACAO', 'STATUS_LIG', 'STATUS_CHAMADA', 'LIGACAO', 'RESULTADO_LIGACAO', 'CONTATO_TEL', 'CLIENTE_AGUARDAVA'],
    node: ['NODE', 'CD_NODE', 'NO', 'COD_NODE', 'NODE_REDE', 'NODO'],
    descJanela: ['DESC_JANELA', 'DESC JANELA', 'DESCJANELA', 'JANELA', 'PERIODO_AGENDA', 'PERIODO', 'JANELA_ATENDIMENTO', 'TURNO', 'DESC_TURNO'],
  };

  // Select the worksheet that contains the main analytical base (in case sheet 0 is a pivot table or summary)
  let bestSheetName = sheetNames[0];
  let maxScore = -1;

  for (const name of sheetNames) {
    const ws = workbook.Sheets[name];
    if (!ws) continue;
    const testRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (testRows.length < 2) continue;

    const testHeader = (testRows[0] || []).map((h) => normalizeHeader(String(h)));
    let matchCount = 0;
    for (const key of Object.keys(nameMatches)) {
      const aliases = nameMatches[key] || [];
      if (testHeader.some((h) => aliases.includes(h) || aliases.some((a) => h.includes(a)))) {
        matchCount++;
      }
    }

    const score = matchCount * 1000 + testRows.length;
    if (score > maxScore) {
      maxScore = score;
      bestSheetName = name;
    }
  }

  const worksheet = workbook.Sheets[bestSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rawRows.length < 2) {
    throw new Error('A planilha está vazia ou não contém dados suficientes além do cabeçalho.');
  }

  // Header row is typically row 0
  const headerRow = rawRows[0] || [];
  const normalizedHeaders = headerRow.map((h) => normalizeHeader(String(h)));

  // Map fields by name or fallback to index
  const fieldMapping: Record<string, number> = {};
  const detectedColumnNames: Record<string, string> = {};

  EXPECTED_COLUMNS.forEach((colDef) => {
    let foundIndex = -1;
    let foundName = '';
    const aliases = nameMatches[colDef.field] || [];

    // 1. Exact normalized header match in order of aliases
    for (const alias of aliases) {
      const idx = normalizedHeaders.indexOf(alias);
      if (idx !== -1) {
        foundIndex = idx;
        foundName = String(headerRow[idx]);
        break;
      }
    }

    // 2. Partial match fallback
    if (foundIndex === -1) {
      for (let i = 0; i < normalizedHeaders.length; i++) {
        const h = normalizedHeaders[i];
        if (aliases.some((alias) => h.includes(alias) || alias.includes(h))) {
          foundIndex = i;
          foundName = String(headerRow[i]);
          break;
        }
      }
    }

    // 3. Fallback to designated column index if valid
    if (foundIndex === -1 && colDef.colIndex < headerRow.length) {
      foundIndex = colDef.colIndex;
      foundName = String(headerRow[colDef.colIndex]) || `Coluna ${colDef.excelLetter}`;
    }

    fieldMapping[colDef.field] = foundIndex;
    detectedColumnNames[colDef.field] = foundName || `Coluna ${colDef.excelLetter}`;
  });

  // Check if workbook contains an auxiliary sheet named OBJETIVO_URA_2
  const ura2SheetName = sheetNames.find((s) => {
    const norm = normalizeHeader(s);
    return norm === 'OBJETIVO_URA_2' || norm === 'OBJETIVO_URA2' || norm.includes('OBJETIVO_URA_2');
  });

  const sheet2Map: Record<string, string> = {};
  if (ura2SheetName && workbook.Sheets[ura2SheetName]) {
    try {
      const s2Rows: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[ura2SheetName], { header: 1, defval: '' });
      if (s2Rows.length > 1) {
        const s2Headers = (s2Rows[0] || []).map((h) => normalizeHeader(String(h)));
        const keyIdx = s2Headers.findIndex((h) => h.includes('CONTRATO') || h.includes('OS') || h === 'ID');
        const valIdx = s2Headers.findIndex((h) => h.includes('OBJETIVO') || h.includes('URA'));
        for (let r = 1; r < s2Rows.length; r++) {
          const row2 = s2Rows[r];
          if (row2) {
            const k = keyIdx >= 0 ? String(row2[keyIdx] || '').trim() : String(r);
            const v = valIdx >= 0 ? String(row2[valIdx] || '').trim() : String(row2[1] || row2[0] || '').trim();
            if (k && v) {
              sheet2Map[k] = v;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error reading OBJETIVO_URA_2 sheet:', e);
    }
  }

  const records: NoShowRecord[] = [];

  for (let rowIndex = 1; rowIndex < rawRows.length; rowIndex++) {
    const row = rawRows[rowIndex];
    if (!row || row.every((c) => c === '' || c === null || c === undefined)) {
      continue; // Skip empty row
    }

    const getValue = (field: string): string => {
      const idx = fieldMapping[field];
      if (idx !== undefined && idx >= 0 && idx < row.length) {
        const val = row[idx];
        if (val !== undefined && val !== null) {
          return String(val).trim();
        }
      }
      return 'NÃO INFORMADO';
    };

    const rawDate = fieldMapping.datAgenda !== undefined && fieldMapping.datAgenda >= 0 ? row[fieldMapping.datAgenda] : '';
    const formattedDate = formatDataHora(rawDate);

    const rawMes = fieldMapping.mes !== undefined && fieldMapping.mes >= 0 ? row[fieldMapping.mes] : '';
    const formattedMes = formatMes(rawMes);

    const rawUn = fieldMapping.un !== undefined && fieldMapping.un >= 0 ? row[fieldMapping.un] : '';
    const formattedUn = normalizeUN(rawUn);

    const rawTec1 = fieldMapping.tec1 !== undefined && fieldMapping.tec1 >= 0 ? row[fieldMapping.tec1] : '';
    const formattedTec1 = normalizeTec1(rawTec1);

    // Store full raw record for detailed analytics inspector
    const rawObj: Record<string, any> = {};
    headerRow.forEach((h, i) => {
      if (h) {
        rawObj[String(h)] = row[i];
        rawObj[normalizeHeader(String(h))] = row[i];
      }
    });

    const rawContrato = getValue('contrato');
    const contratoVal = (rawContrato && rawContrato !== 'NÃO INFORMADO')
      ? rawContrato
      : (rawObj['CONTRATO'] || rawObj['CONTRATO_CLARO'] || `CT-${780000 + rowIndex}`);

    const rawItemVerb = getValue('itemVerb');
    const itemVerbVal = (rawItemVerb && rawItemVerb !== 'NÃO INFORMADO')
      ? rawItemVerb
      : (rawObj['ITEM_VERB'] || rawObj['ITEM'] || 'INSTALACAO_FIBRA_RESIDENCIAL');

    const baixaVal = getValue('baixa') || 'B201 - TÉCNICO NÃO COMPARECEU NO TURNO';
    const ligVal = getValue('statusLigacao') || 'Atendida - Cliente Aguardava';
    const geoVal = getValue('statusGeoloc') || 'Não Registrado';
    const rawRegra = getValue('regraFinal');
    const regraFinalVal = (rawRegra && rawRegra !== 'NÃO INFORMADO') ? rawRegra : inferRegraFinal(baixaVal, ligVal, geoVal);

    const rawObjUra = getValue('objetivoUra');
    const objUraVal = (rawObjUra && rawObjUra !== 'NÃO INFORMADO')
      ? rawObjUra
      : (rawObj['OBJETIVO_URA_2'] || rawObj['OBJETIVO_URA'] || sheet2Map[contratoVal] || sheet2Map[String(rowIndex)] || 'vazio');

    const rawJanela = getValue('descJanela');
    const descJanelaVal = normalizeJanela(
      rawJanela && rawJanela !== 'NÃO INFORMADO'
        ? rawJanela
        : (rawObj['DESC_JANELA'] || rawObj['DESC JANELA'] || rawObj['JANELA'] || rawObj['PERIODO_AGENDA'] || rawObj['PERIODO'] || '')
    );

    const record: NoShowRecord = {
      id: `NS-${rowIndex}-${Math.random().toString(36).substring(2, 7)}`,
      contrato: contratoVal,
      mes: formattedMes,
      cidade: getValue('cidade') || 'São Paulo',
      origem: getValue('origem') || 'URA',
      tecnico: getValue('tecnico') || 'Técnico Não Identificado',
      un: formattedUn,
      tipoOs: getValue('tipoOs') || 'Instalação Fibra',
      itemVerb: itemVerbVal,
      tpFechamentoOs: getValue('tpFechamentoOs') || 'Cancelamento Técnico',
      datAgenda: formattedDate,
      baixa: baixaVal,
      regraFinal: regraFinalVal,
      area: getValue('area') || 'Área Geral',
      tec1: formattedTec1,
      statusGeoloc: geoVal,
      objetivoUra: objUraVal,
      statusLigacao: ligVal,
      node: getValue('node') || 'ND-GEN-001',
      descJanela: descJanelaVal,
      raw: rawObj,
    };

    records.push(record);
  }

  return {
    records,
    sheets: sheetNames,
    totalRows: records.length,
    detectedColumns: detectedColumnNames,
  };
}

/**
 * Downloads a structured template workbook matching Claro's No-Show format
 */
export function downloadTemplateExcel(records?: NoShowRecord[]) {
  const headers = [
    'MES',               // A
    'ID_CLIENTE',        // B
    'CONTRATO',          // C
    'NUM_OS',            // D
    'ESTADO',            // E
    'CIDADE',            // F
    'ORIGEM',            // G
    'SEGMENTO',          // H
    'PRODUTO',           // I
    'DESC_JANELA',       // J
    'STATUS_OS',         // K
    'TECNICO',           // L
    'UN',                // M
    'TIPO_OS',           // N
    'ITEM_VERB',         // O
    'TP_FECHAMENTO_OS',  // P
    'DAT_AGENDA',        // Q
    'HORA_AGENDA',       // R
    'BAIXA',             // S
    'NODE',              // T
    'LOGRADOURO',        // U
    'BAIRRO',            // V
    'CEP',               // W
    'EQUIPE',            // X
    'EMPRESA_PARCEIRA',  // Y
    'AREA',              // Z
    'SUPERVISOR',        // AA
    'COORDENADOR',       // AB
    'GERENTE',           // AC
    'PROTOCOLO_URA',     // AD
    'DT_CRIACAO_OS',     // AE
    'SLA_STATUS',        // AF
    'TURNO',             // AG
    'TEC1',              // AH
    'DISTANCIA_KM',      // AI
    'STATUS_GEOLOC',     // AJ
    'OBJETIVO_URA_2',    // AK
    'STATUS_LIGACAO',    // AL
  ];

  // Provide initial example rows
  const dataRows: any[][] = [];
  dataRows.push(headers);

  const sourceData = records && records.length > 0 ? records : generateSampleData();

  sourceData.slice(0, 50).forEach((rec, idx) => {
    const row = new Array(headers.length).fill('');
    row[0] = rec.mes;                            // A - MES
    row[1] = `CLI-${100000 + idx}`;              // B
    row[2] = `CT-${987600 + idx}`;               // C
    row[3] = `OS-${4520000 + idx}`;              // D
    row[4] = rec.cidade === 'Rio de Janeiro' ? 'RJ' : rec.cidade === 'Belo Horizonte' ? 'MG' : rec.cidade === 'Curitiba' ? 'PR' : 'SP'; // E
    row[5] = rec.cidade;                         // F - CIDADE
    row[6] = rec.origem;                         // G - ORIGEM
    row[7] = 'Residencial';                      // H
    row[8] = 'Claro Fibra 500M + Claro TV+';     // I
    row[9] = rec.descJanela || 'Manhã (08h - 12h)'; // J - DESC_JANELA
    row[10] = 'Cancelada';                       // K
    row[11] = rec.tecnico;                       // L - TECNICO
    row[12] = rec.un;                            // M - UN
    row[13] = rec.tipoOs;                        // N - TIPO_OS
    row[14] = rec.itemVerb;                      // O - ITEM_VERB
    row[15] = rec.tpFechamentoOs;                // P - TP_FECHAMENTO_OS
    row[16] = rec.datAgenda;                     // Q - DAT_AGENDA
    row[17] = '10:30:00';                        // R
    row[18] = rec.baixa;                         // S - BAIXA
    row[19] = rec.node;                          // T - NODE
    row[20] = 'Av. das Nações Unidas, 12901';    // U
    row[21] = 'Brooklin Paulista';               // V
    row[22] = '04578-000';                       // W
    row[23] = 'Equipe Alpha Fibra';              // X
    row[24] = 'Claro Operações Próprias';        // Y
    row[25] = rec.area;                          // Z - AREA
    row[26] = 'Carlos Alberto Souza';            // AA
    row[27] = 'Mariana Oliveira Reis';           // AB
    row[28] = 'Fernando Costa Neto';             // AC
    row[29] = `URA-${890000 + idx}`;             // AD
    row[30] = rec.datAgenda;                     // AE
    row[31] = 'Estourado';                       // AF
    row[32] = 'Manhã';                           // AG
    row[33] = rec.tec1;                          // AH - TEC1
    row[34] = '2.4 km';                          // AI
    row[35] = rec.statusGeoloc;                  // AJ - STATUS_GEOLOC
    row[36] = rec.objetivoUra;                   // AK - OBJETIVO_URA
    row[37] = rec.statusLigacao;                 // AL - STATUS_LIGACAO

    dataRows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(dataRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'NAO_COMPARECIMENTO');

  XLSX.writeFile(wb, 'Claro_Base_Nao_Comparecimento_Tecnico.xlsx');
}

/**
 * Generates rich, authentic sample dataset of Claro field technician no-show incidents
 */
export function generateSampleData(): NoShowRecord[] {
  const cidades = [
    { nome: 'São Paulo', un: 'UN SP CAPITAL METRO', area: 'Área Leste / Sul' },
    { nome: 'Rio de Janeiro', un: 'UN RJ CAPITAL METRO', area: 'Área Zona Norte / Baixada' },
    { nome: 'Campinas', un: 'UN SP INTERIOR CENTRO', area: 'Área Metropolitana Campinas' },
    { nome: 'Belo Horizonte', un: 'UN MG CENTRO', area: 'Área BH Sul / Contagem' },
    { nome: 'Curitiba', un: 'UN PR CAPITAL', area: 'Área Metropolitana Curitiba' },
    { nome: 'Porto Alegre', un: 'UN RS METROPOLITANA', area: 'Área POA Central / Vale' },
    { nome: 'Salvador', un: 'UN BA LITORAL', area: 'Área Salvador Orla / Subúrbio' },
    { nome: 'Brasília', un: 'UN CO PLANALTO', area: 'Área Asa Norte / Taguatinga' },
    { nome: 'Ribeirão Preto', un: 'UN SP INTERIOR NORTE', area: 'Área Ribeirão / Franca' },
    { nome: 'Santos', un: 'UN SP BAIXADA SANTISTA', area: 'Área Litoral Centro' },
    { nome: 'Goiânia', un: 'UN CO CENTRO OESTE', area: 'Área Goiânia / Aparecida' },
    { nome: 'Fortaleza', un: 'UN CE NORDESTE', area: 'Área Fortaleza Metropolitana' },
  ];

  const tecnicos = [
    'Lucas Ferreira Ramos',
    'Marcos Vinicius Ribeiro',
    'Rafael Alcantara Silva',
    'Carlos Eduardo Santos',
    'Felipe Augusto Mendes',
    'Diego Henrique Pereira',
    'Rodrigo Barbosa Lima',
    'Gabriel Souza Nascimento',
    'Thiago Martins Rocha',
    'Bruno Carvalho Dias',
    'Alexandre Neves Cunha',
    'Leandro Castro Pinto',
    'Matheus Guimarães Barros',
    'Anderson Vieira Gomes',
    'Leonardo Pacheco Freitas',
    'Danilo Soares Moreira',
    'Vitor Hugo Cardoso',
    'Ederson Antunes Prado',
  ];

  const tec1List = [
    'COM PADRAO',
    'SEM PADRAO',
    'EXPURGADA',
    '-',
    'COM PADRAO',
    'SEM PADRAO',
    'COM PADRAO',
    '-',
  ];

  const origens = [
    'URA Automática Claro',
    'App Minha Claro',
    'Call Center 10621',
    'Roteador Inteligente de Campo',
    'Backoffice Técnico',
    'Reagendamento Lojas Claro',
  ];

  const tiposOs = [
    'Instalação Fibra Óptica 500M',
    'Reparo Sinal Óptico / LOS Vermelho',
    'Mudança de Endereço Residencial',
    'Migração Ponto Ultra Wi-Fi Mesh',
    'Troca de Decodificador 4K Claro TV+',
    'Instalação Linha Fixa VoIP',
    'Reparo Lentidão / Degradação de Rota',
    'Auditoria de Instalação de Campo',
  ];

  const tiposFechamento = [
    'Cancelamento Técnico Operacional',
    'Fechamento Improcedente em Rota',
    'Reagendamento Forçado no Turno',
    'OS Não Atendida no Horário',
    'Cancelamento por Inviabilidade Técnica',
  ];

  const baixasOfensoras = [
    'B104 - CLIENTE AUSENTE NO LOCAL',
    'B201 - TÉCNICO NÃO COMPARECEU NO TURNO',
    'B202 - ESTOURO DO HORÁRIO / SEM TEMPO HÁBIL',
    'B305 - FALTA DE ACESSO AO CONDOMÍNIO / PORTARIA RECUSOU',
    'B401 - ENDEREÇO NÃO LOCALIZADO / NUMERAÇÃO IRREGULAR',
    'B502 - ÁREA DE RISCO COM IMPEDIMENTO TEMPORÁRIO',
    'B603 - CHUVA TORRENCIAL / RISCO ELÉTRICO CABEAMENTO',
    'B701 - VEÍCULO COM PANE MECÂNICA / PNEU FURADO',
    'B802 - FALHA NO ROTEAMENTO / AGENDA DUPLICADA NO SISTEMA',
    'B903 - CLIENTE DESISTIU / SOLICITOU REAGENDAMENTO',
    'B112 - CLIENTE NÃO DISPONÍVEL NO PERÍODO AGENDADO',
    'B320 - INFRAESTRUTURA TUBULAÇÃO OBSTRUÍDA',
    'B450 - TÉCNICO DESVIADO PARA EMERGÊNCIA FIBRA GPON',
    'B555 - CLIENTE NÃO ATENDEU CAMPAINHA / INTERFONE',
    'B610 - FALTA DE MATERIAIS / BOBINA FIBRA ZERADA',
  ];

  const statusGeolocList = [
    'SEM PADRAO',
    'SEM GEO',
    'COM PADRAO',
    'SEM PADRAO',
    'SEM GEO',
    'COM PADRAO',
  ];

  const objetivosUraList = [
    'INSUCESSO',
    'vazio',
    '-',
    'CONFIRMAÇÃO DE AGENDAMENTO',
    'INSUCESSO - CLIENTE AUSENTE',
    'vazio',
    '-',
    'PESQUISA NÃO COMPARECIMENTO',
    'INSUCESSO',
    'vazio',
  ];

  const statusLigacaoList = [
    'INSUCESSO',
    'VAZIO',
    '-',
    'SUCESSO',
    'INSUCESSO',
    'CONTATO EFETUADO',
    '-',
    'INSUCESSO - CLIENTE NÃO ATENDE',
    'VAZIO',
    'SUCESSO - REAGENDADO',
  ];

  const janelasList = [
    'Manhã (08h às 12h)',
    'Tarde (12h às 18h)',
    'Manhã (08h às 12h)',
    'Tarde (12h às 18h)',
    'Noite (18h às 21h)',
    'Comercial (08h às 18h)',
    'vazio',
    'Manhã (08h às 12h)',
    'Tarde (12h às 18h)',
    'vazio',
  ];

  const nodes = [
    'ND-SPO-042',
    'ND-SPO-118',
    'ND-SPO-089',
    'ND-RJO-029',
    'ND-RJO-074',
    'ND-CPS-015',
    'ND-CPS-062',
    'ND-BHZ-077',
    'ND-BHZ-031',
    'ND-CTA-045',
    'ND-POA-019',
    'ND-SSA-088',
    'ND-BSB-053',
    'ND-RBP-012',
    'ND-SAN-033',
    'ND-GOI-064',
    'ND-FOR-027',
  ];

  const dates = [
    '02/10/2026 08:30', '03/10/2026 10:15', '05/10/2026 14:00', '07/10/2026 16:45',
    '08/10/2026 09:20', '10/10/2026 11:30', '12/10/2026 13:10', '14/10/2026 15:50',
    '15/10/2026 08:45', '17/10/2026 10:30', '18/10/2026 14:20', '20/10/2026 16:00', '21/10/2026 09:15',
    '22/10/2026 11:40', '23/10/2026 14:50', '25/10/2026 10:20', '27/10/2026 15:30', '28/10/2026 16:40',
    '29/10/2026 09:30', '30/10/2026 14:00', '31/10/2026 16:15',
    '05/09/2026 09:00', '12/09/2026 11:15', '18/09/2026 08:15', '22/09/2026 10:45',
    '25/09/2026 13:30', '28/09/2026 15:20', '29/09/2026 11:00', '30/09/2026 17:00'
  ];

  const itemVerbs = [
    'INSTALAÇÃO FIBRA FTTH 500M',
    'REPARO SINAL ÓPTICO GPON',
    'MUDANÇA PACOTE CLARO TV+',
    'TROCA DE ROTEADOR WI-FI 6',
    'INSTALAÇÃO PONTO ULTRA MESH',
    'REPARO LENTIDÃO / DEGRADAÇÃO',
    'TROCA DE DECODIFICADOR 4K',
    'AUDITORIA TÉCNICA FIBRA',
  ];

  const records: NoShowRecord[] = [];
  const totalItems = 180;

  for (let i = 0; i < totalItems; i++) {
    // Skew distribution realistically towards top offenders
    const cityObj = cidades[Math.floor(Math.pow(Math.random(), 1.6) * cidades.length)];
    const tecnico = tecnicos[Math.floor(Math.pow(Math.random(), 1.5) * tecnicos.length)];
    const baixa = baixasOfensoras[Math.floor(Math.pow(Math.random(), 1.4) * baixasOfensoras.length)];
    const node = nodes[Math.floor(Math.pow(Math.random(), 1.3) * nodes.length)];
    const geoloc = statusGeolocList[Math.floor(Math.random() * statusGeolocList.length)];
    const ligacao = statusLigacaoList[Math.floor(Math.random() * statusLigacaoList.length)];
    const dataAgenda = dates[i % dates.length];
    const mes = dataAgenda.includes('/09/') ? 'SET/2026' : 'OUT/2026';
    const contrato = `CT-${540000 + i}`;
    const itemVerb = itemVerbs[i % itemVerbs.length];
    const descJanela = janelasList[i % janelasList.length];

    records.push({
      id: `NS-REC-${1000 + i}`,
      contrato,
      mes,
      cidade: cityObj.nome,
      origem: origens[i % origens.length],
      tecnico,
      un: normalizeUN(cityObj.un),
      tipoOs: tiposOs[i % tiposOs.length],
      itemVerb,
      tpFechamentoOs: tiposFechamento[i % tiposFechamento.length],
      datAgenda: dataAgenda,
      baixa,
      regraFinal: inferRegraFinal(baixa, ligacao, geoloc),
      area: cityObj.area,
      tec1: tec1List[i % tec1List.length],
      statusGeoloc: geoloc,
      objetivoUra: objetivosUraList[i % objetivosUraList.length],
      statusLigacao: ligacao,
      node,
      descJanela,
      raw: {
        'CONTRATO_CLARO': contrato,
        'ITEM_VERB': itemVerb,
        'NUMERO_OS': `OS-2026-${88000 + i}`,
        'DESC_JANELA': descJanela,
        'OBJETIVO_URA_2': objetivosUraList[i % objetivosUraList.length],
        'STATUS_LIGACAO': ligacao,
        'SEGMENTO': 'Residencial Fibra',
        'CLIENTE': `Assinante Claro #${i + 1}`,
        'PERIODO': descJanela,
      }
    });
  }

  return records;
}
