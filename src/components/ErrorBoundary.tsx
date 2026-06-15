import React, { ErrorInfo, ReactNode } from 'react';
import { Settings, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleClearCache = async () => {
    try {
      // 1. Clear all service worker registrations
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      
      // 2. Delete all caches
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
      
      // 3. Clear localStorage config / state
      localStorage.removeItem('supreme_store_settings');
      localStorage.removeItem('supreme_cart');
      localStorage.removeItem('supreme_orders');
      
      // 4. Force hard reload bypassing cold cache
      window.location.href = window.location.origin + '?nocache=' + Date.now();
    } catch (e) {
      console.error('Failed to clear cache fully:', e);
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans antialiased text-slate-800 selection:bg-rose-150 selection:text-rose-900">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 md:p-8 shadow-2xl border border-rose-100 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-2 bg-rose-500" />
            
            <div className="p-4 bg-rose-50 rounded-2xl text-rose-600 mb-5 animate-pulse">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <h1 className="text-lg md:text-xl font-black uppercase tracking-wider text-slate-950 mb-2">
              Sorveteria Supreme
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-5">
              Ops! Algo impediu o carregamento
            </p>

            <div className="w-full text-left bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3.5 mb-6 text-xs text-slate-600">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="font-semibold leading-relaxed">
                  Para garantir o pleno funcionamento do app de delivery em múltiplos aparelhos, às vezes é necessário limpar os caches antigos do navegador armazenados no seu celular.
                </p>
              </div>

              {this.state.error && (
                <div className="border-t border-slate-200/60 pt-3">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">Detalhes técnicos:</span>
                  <code className="font-mono text-[10px] text-rose-600 bg-rose-50 px-2 py-1 rounded block overflow-x-auto max-h-24">
                    {this.state.error.name}: {this.state.error.message}
                  </code>
                </div>
              )}
            </div>

            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={this.handleClearCache}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase tracking-widest py-3.5 rounded-2xl cursor-pointer transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                Limpar Cache e Atualizar
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-widest py-3 rounded-2xl cursor-pointer transition-all text-center"
              >
                Tentar Novamente
              </button>
            </div>
            
            <p className="text-[10px] text-slate-405 mt-6 uppercase tracking-wider">
              Sorveteria Supreme © 2026
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
