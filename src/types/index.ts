export interface NoShowRecord {
  id: string;
  contrato: string;        // CONTRATO
  mes: string;
  cidade: string;
  origem: string;
  tecnico: string;
  un: string;
  tipoOs: string;
  itemVerb: string;        // ITEM_VERB
  tpFechamentoOs: string;
  datAgenda: string;
  baixa: string;
  regraFinal: string;
  area: string;            // AREA (Coluna Z)
  tec1: string;
  statusGeoloc: string;
  objetivoUra: string;
  statusLigacao: string;
  node: string;
  descJanela: string;      // DESC_JANELA (Janela de atendimento)
  raw?: Record<string, any>;
}

export interface FilterState {
  contrato: string[];
  mes: string[];
  cidade: string[];
  origem: string[];
  tecnico: string[];
  un: string[];
  tipoOs: string[];
  itemVerb: string[];
  tpFechamentoOs: string[];
  dataAgendaStart: string;
  dataAgendaEnd: string;
  baixa: string[];
  regraFinal: string[];
  area: string[];
  tec1: string[];
  statusGeoloc: string[];
  objetivoUra: string[];
  statusLigacao: string[];
  node: string[];
  descJanela: string[];
  dia: string[];
  semana: string[];
  search: string;
}

export type FilterFieldKey = 
  | 'contrato'
  | 'mes'
  | 'cidade'
  | 'origem'
  | 'tecnico'
  | 'un'
  | 'tipoOs'
  | 'itemVerb'
  | 'tpFechamentoOs'
  | 'baixa'
  | 'regraFinal'
  | 'area'
  | 'tec1'
  | 'statusGeoloc'
  | 'objetivoUra'
  | 'statusLigacao'
  | 'node'
  | 'descJanela';

export interface ColumnDefinition {
  field: FilterFieldKey | 'datAgenda';
  label: string;
  excelLetter: string;
  colIndex: number;
  description: string;
}

export interface AggregatedItem {
  name: string;
  count: number;
  percentage: number;
  subLabel?: string;
  monthlyBreakdown?: Record<string, number>;
}

export interface FcaEvidence {
  id: string;
  name: string;
  dataUrl: string; // Base64 encoded image
  size?: number;
  uploadedAt: string;
}

export interface FcaItem {
  id: string;
  tecnico: string;
  un: string;
  mes: string;
  contrato?: string;
  dataFato: string;
  fato: string;
  causa: string;
  acao: string;
  prazo: string;
  responsavel: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluído' | 'Cancelado';
  evidencias: FcaEvidence[];
  createdAt: string;
  updatedAt: string;
}

export interface HostingerDbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean;
}
