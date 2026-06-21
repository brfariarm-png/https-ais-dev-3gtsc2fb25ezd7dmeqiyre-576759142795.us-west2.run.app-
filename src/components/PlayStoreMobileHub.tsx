/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Star, ShieldCheck, Laptop, Smartphone, Tablet, ExternalLink, HelpCircle, AlertCircle, Copy, Check } from 'lucide-react';
import SupremeLogo from './SupremeLogo';

export default function PlayStoreMobileHub() {
  const [devicePreview, setDevicePreview] = useState<'ios' | 'android'>('android');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Listen for native PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const triggerPwaInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      alert('Seu navegador já instalou ou não suporta o prompt automático neste iframe. Siga o guia manual abaixo, é super rápido!');
    }
  };

  const getPublicShareUrl = () => {
    const currentUrl = window.location.href;
    if (currentUrl.includes('ais-dev-')) {
      return currentUrl.replace('ais-dev-', 'ais-pre-');
    }
    return currentUrl;
  };

  const copyAppUrl = () => {
    const publicUrl = getPublicShareUrl();
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Introduction banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-40px] right-[-20px] w-48 h-48 bg-rose-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20px] left-[30%] w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-2xl">
          <span className="bg-emerald-600 font-extrabold text-[10px] tracking-widest px-3 py-1 rounded-full uppercase shadow">Pronto para Celular</span>
          <h2 className="text-2xl md:text-3xl font-extrabold mt-3">Sua Sorveteria na Google Play Store!</h2>
          <p className="text-xs md:text-sm text-indigo-100/90 leading-relaxed mt-2">
            Este app foi desenvolvido sob as diretrizes de uma <strong>PWA (Progressive Web App)</strong> premium. Isso significa que ele se comporta exatamente como um aplicativo nativo e pode ser empacotado para distribuição oficial na Google Play Store e App Store com extrema facilidade.
          </p>
        </div>
      </div>

      {/* SEÇÃO QR CODE E LINK PÚBLICO (Dispositivo Móvel / Outro Aparelho) */}
      <div className="bg-amber-50/60 border border-amber-200/60 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
        <div className="bg-white p-3 rounded-2xl border border-amber-100 shadow-sm flex-shrink-0 flex flex-col items-center gap-1.5">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getPublicShareUrl())}`} 
            alt="QR Code do App Público" 
            className="w-36 h-36"
            referrerPolicy="no-referrer"
          />
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">URL Pública</span>
        </div>
        <div className="flex-1 space-y-3.5 text-center md:text-left">
          <span className="bg-rose-500 text-white font-black text-[9px] tracking-wider px-2.5 py-1 rounded-full uppercase select-none">
            Passo Obrigatório para Funcionar! ⚠️
          </span>
          <h3 className="text-base font-black text-slate-800 leading-snug">
            Por que diz "Conectando..." ou dá erro ao abrir em outro aparelho?
          </h3>
          
          <div className="space-y-2 text-xs text-slate-600 leading-relaxed font-semibold">
            <p>
              Por segurança e privacidade padrão do Google, todas as conexões externas de outros aparelhos (celulares, tablets, etc) são <strong>bloqueadas</strong> até que você autorize o compartilhamento público!
            </p>
            <div className="bg-white/85 p-3.5 rounded-2xl border border-amber-250/70 space-y-1.5 text-slate-700">
              <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider block">Siga estes 3 passos simples para liberar:</span>
              <ul className="list-decimal pl-4 space-y-1 text-left text-[11px]">
                <li>No seu computador, no menu do topo do <strong>Google AI Studio</strong>, clique no botão <strong className="text-rose-600">"Compartilhar" (Share)</strong>.</li>
                <li>Clique para gerar/ativar o link público de testes do aplicativo.</li>
                <li>Pronto! Agora sim, qualquer celular que escanear este QR code ou acessar o link <strong className="text-rose-600">ais-pre-...</strong> conseguirá abrir o seu app de sorveteria na hora!</li>
              </ul>
            </div>
          </div>

          <div className="pt-1 select-all font-mono text-[11px] text-rose-600 bg-white border border-slate-100 p-2.5 rounded-xl break-all font-bold">
            {getPublicShareUrl()}
          </div>
          <button
            onClick={copyAppUrl}
            className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black text-[10px] tracking-widest uppercase px-5 py-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-slate-900" /> Link do aplicativo copiado!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-900" /> Copiar Link Público de Testes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Styled Google Play Store Page representation */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-1">
          <svg className="w-5 h-5 text-indigo-500 fill-indigo-500/20" viewBox="0 0 24 24">
            <path d="M5,3H19A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3M12,5A7,7 0 0,0 5,12A7,7 0 0,0 12,19A7,7 0 0,0 19,12A7,7 0 0,0 12,5Z" />
          </svg>
          <span className="text-xs font-black text-slate-800 tracking-wider uppercase">Visualização da Play Store</span>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row gap-5 items-start">
          {/* Mock app icon */}
          <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center filter drop-shadow-md select-none">
            <SupremeLogo size={76} className="w-full h-full animate-[pulse_6s_infinite]" />
          </div>

          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Sorveteria Supreme</h3>
              <p className="text-xs text-indigo-600 font-extrabold">Sorveteria Supreme Oficial • Comida e Bebida</p>
            </div>

            {/* Micro details row */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 border-y border-dashed border-slate-100 py-2.5 text-slate-500">
              <div className="text-center md:text-left">
                <p className="text-xs font-black text-slate-800 flex items-center gap-0.5 justify-center md:justify-start">
                  4.9 <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 mt-[-2px]" />
                </p>
                <p className="text-[10px] text-slate-400 font-semibold font-mono">1.250 avaliações</p>
              </div>

              <div className="w-px h-6 bg-slate-250 hidden md:block" />

              <div>
                <p className="text-xs font-black text-slate-800">10k+</p>
                <p className="text-[10px] text-slate-400 font-semibold font-mono">Downloads</p>
              </div>

              <div className="w-px h-6 bg-slate-250 hidden md:block" />

              <div>
                <p className="text-xs font-black text-slate-800">Livre</p>
                <p className="text-[10px] text-slate-400 font-semibold font-mono">Classificação</p>
              </div>
            </div>

            {/* Quick functional play store action */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={triggerPwaInstall}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-50 active:scale-[0.98] flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Instalar Aplicativo Prontamente
              </button>
              
              <button
                onClick={copyAppUrl}
                className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Link Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Compartilhar QR / Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Two column grid tabs: How to compile for store & PWA usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Como instalar em 10 segundos (PWA) */}
        <div className="bg-white border border-slate-150 rounded-3xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2.5 border-b border-rose-50/50">
            <Smartphone className="w-5 h-5 text-rose-500" />
            <h4 className="font-extrabold text-sm text-slate-800">Como Instalar no Celular de Clientes</h4>
          </div>

          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-2 text-xs">
            <button
              onClick={() => setDevicePreview('android')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-colors ${
                devicePreview === 'android' ? 'bg-white text-rose-600 shadow' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Android (Chrome)
            </button>
            <button
              onClick={() => setDevicePreview('ios')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-colors ${
                devicePreview === 'ios' ? 'bg-white text-rose-600 shadow' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              iOS (iPhone/Safari)
            </button>
          </div>

          <div className="space-y-3">
            {devicePreview === 'android' ? (
              <ul className="space-y-2 text-xs font-medium text-slate-600 list-decimal pl-4">
                <li>Abra o link deste aplicativo no navegador Chrome do seu celular.</li>
                <li>Um banner inteligente aparecerá na parte inferior escrito <strong>"Adicionar Sorveteria Supreme à tela inicial"</strong>.</li>
                <li>Se não aparecer automaticamente, clique nos <strong>três pontinhos</strong> no canto superior direito e clique em <strong>"Instalar aplicativo"</strong>.</li>
                <li>Pronto, um ícone lindo surgirá na sua grade de apps, abrindo em tela cheia e sem barra de links!</li>
              </ul>
            ) : (
              <ul className="space-y-2 text-xs font-medium text-slate-600 list-decimal pl-4">
                <li>Abra o link deste aplicativo usando o navegador Safari do seu iPhone.</li>
                <li>Toque no botão de <strong>Compartilhar</strong> (ícone de um quadrado com uma seta para cima).</li>
                <li>Role a lista de alternativas e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
                <li>Confirme o nome e toque em adicionar. O app ficará instantaneamente gravado como se fosse baixado da App Store!</li>
              </ul>
            )}
            
            <div className="bg-indigo-50/40 p-3 rounded-2xl flex items-start gap-2.5 border border-indigo-100/30">
              <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-indigo-900 font-medium leading-relaxed">
                <strong>Sem armazenamento pesado:</strong> O formato PWA pesa menos de 1MB, não ocupa memória do celular e mantém canais de atualizações e notificações autônomas!
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Passo a passo publicar na PlayStore */}
        <div className="bg-white border border-slate-150 rounded-3xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2.5 border-b border-rose-50/50">
            <Laptop className="w-5 h-5 text-indigo-500" />
            <h4 className="font-extrabold text-sm text-slate-800">Como Publicar Oficialmente na Play Store</h4>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            Para que seus clientes encontrem o app digitando "Sorveteria Supreme" diretamente na Play Store, o processo é extremamente simples e gratuito via <strong>Trusted Web Activities (TWA)</strong>:
          </p>

          <ol className="list-decimal pl-4 space-y-2 text-xs font-medium text-slate-600">
            <li>
              Acesse o site <a href="https://www.pwabuilder.com/" target="_blank" rel="noopener noreferrer" className="text-rose-500 font-bold inline-flex items-center gap-0.5 hover:underline">pwabuilder.com <ExternalLink className="w-3 h-3" /></a>.
            </li>
            <li>
              Cole a URL do seu app publicado na nuvem e clique em <strong>Start</strong>.
            </li>
            <li>
              O PWABuilder irá herdar todos os ícones, cores e configurações do nosso manifesto e gerará um arquivo <strong>.aab (Android App Bundle)</strong> assinado.
            </li>
            <li>
              Cadastre sua conta de Desenvolvedor no Console do Google Play (taxa única de $25 paga ao Google) e faça o envio do arquivo <strong>.aab</strong>.
            </li>
          </ol>

          <div className="bg-rose-50/40 border border-rose-100/30 p-3 rounded-2xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
            <p className="text-[9px] text-rose-900 leading-relaxed">
              Dica: Utilizar o PWABuilder herda a excelente compatibilidade com a Play Store sem precisar reescrever nenhuma linha do aplicativo em Java ou Kotlin!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
