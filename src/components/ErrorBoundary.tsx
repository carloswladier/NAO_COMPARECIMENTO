import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Dashboard No-Show Claro:', error, errorInfo);
  }

  private handleReset = () => {
    // Reset state and reload
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-xl shadow-lg border border-slate-200 p-6 text-center">
            <div className="w-12 h-12 bg-red-100 text-[#DA291C] rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Ocorreu um erro inesperado no painel
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {this.state.error?.message || 'Falha ao processar o filtro selecionado.'}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#DA291C] hover:bg-[#B82216] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Recarregar Painel
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
