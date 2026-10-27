import React, { useState, useEffect } from 'react';
import { X, Database, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Server, Shield, Check } from 'lucide-react';
import { HostingerDbConfig } from '../types';
import { fcaApi, HostingerStatusResponse } from '../services/fcaApi';

interface HostingerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const HostingerConfigModal: React.FC<HostingerConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('3306');
  const [database, setDatabase] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<HostingerStatusResponse | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    const res = await fcaApi.getHostingerStatus();
    setStatus(res);
    if (res.config) {
      setHost(res.config.host || '');
      setPort(String(res.config.port || 3306));
      setDatabase(res.config.database || '');
      setUser(res.config.user || '');
    }
  };

  if (!isOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    const config: HostingerDbConfig = {
      host: host.trim(),
      port: Number(port) || 3306,
      database: database.trim(),
      user: user.trim(),
      password: password,
    };

    const res = await fcaApi.saveHostingerConfig(config);
    setTesting(false);
    setTestResult(res);

    if (res.success) {
      loadStatus();
      if (onConfigSaved) onConfigSaved();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header with Hostinger branding */}
        <div className="bg-[#673DE6] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-full bg-white/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Banco de Dados Hostinger (MySQL)</h3>
              <p className="text-xs text-purple-200">Armazenamento em nuvem das tratativas de FCA</p>
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
        <form onSubmit={handleSaveAndTest} className="p-5 space-y-4">
          
          {/* Status banner */}
          <div
            className={`p-3 rounded-md border flex items-start gap-2.5 text-xs ${
              status?.connected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {status?.connected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <strong className="block font-semibold">
                {status?.connected ? 'Status: Conectado ao Hostinger MySQL' : 'Status: Armazenamento Local Ativo'}
              </strong>
              <span className="text-[11px] leading-tight opacity-90">{status?.message}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Host */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Servidor MySQL (Host) *
              </label>
              <div className="relative">
                <Server className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="srv123.main-hosting.eu ou IP"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-[#673DE6] focus:ring-1 focus:ring-[#673DE6]"
                />
              </div>
            </div>

            {/* Port */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Porta
              </label>
              <input
                type="number"
                placeholder="3306"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-[#673DE6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Database Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome do Banco de Dados *
              </label>
              <input
                type="text"
                required
                placeholder="u123456_claro_fca"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-[#673DE6]"
              />
            </div>

            {/* User */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Usuário do Banco *
              </label>
              <input
                type="text"
                required
                placeholder="u123456_admin"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-[#673DE6]"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Senha do Usuário MySQL
            </label>
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="password"
                placeholder="Digite a senha configurada no hPanel"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-[#673DE6]"
              />
            </div>
          </div>

          {/* Information box */}
          <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1 font-semibold text-slate-800">
              <Shield className="w-3.5 h-3.5 text-[#673DE6]" />
              Instruções Hostinger (hPanel):
            </div>
            <p>
              No painel da Hostinger, vá em <strong>Bancos de Dados MySQL</strong> e garanta que o seu IP de acesso remoto esteja liberado em <em>MySQL Remoto</em> (ou defina '%' para permitir conexões de aplicação).
            </p>
            <p>
              A tabela <code>fca_actions</code> é criada automaticamente com campos para Técnico, UN, Fato, Causa, Ação e Evidências Fotográficas.
            </p>
          </div>

          {/* Test result message */}
          {testResult && (
            <div
              className={`p-2.5 rounded text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Fechar
            </button>

            <button
              type="submit"
              disabled={testing}
              className="px-4 py-1.5 text-xs font-bold rounded-md bg-[#673DE6] hover:bg-[#5328D4] text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Testando Conexão...
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  Salvar e Conectar
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
