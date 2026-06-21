import React, { useState } from 'react';
import { 
  Printer, 
  Settings, 
  Volume2, 
  VolumeX, 
  Check, 
  HelpCircle, 
  FileText, 
  Plus, 
  Sparkles, 
  Hash, 
  MapPin, 
  RotateCcw,
  Eye
} from 'lucide-react';
import { printOrderReceipt } from '../utils/printHelper';
import { Order } from '../types';

interface AdminImpressoraProps {
  storeSettings: any;
  handleUpdatePrinterSetting: (key: string, value: any) => Promise<void>;
  playNotificationSound: () => void;
  isSoundEnabled: boolean;
  setIsSoundEnabled: (value: boolean) => void;
  autoPrintOnNew: boolean;
  setAutoPrintOnNew: (value: boolean) => void;
  autoPrintOnPrep: boolean;
  setAutoPrintOnPrep: (value: boolean) => void;
  autoSendWhatsAppStatus: boolean;
  setAutoSendWhatsAppStatus: (value: boolean) => void;
}

export default function AdminImpressora({
  storeSettings,
  handleUpdatePrinterSetting,
  playNotificationSound,
  isSoundEnabled,
  setIsSoundEnabled,
  autoPrintOnNew,
  setAutoPrintOnNew,
  autoPrintOnPrep,
  setAutoPrintOnPrep,
  autoSendWhatsAppStatus,
  setAutoSendWhatsAppStatus,
}: AdminImpressoraProps) {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const currentPaperWidth = storeSettings.printerPaperWidth || '80mm';
  const currentFontSize = storeSettings.printerFontSize || 12;
  const currentFontType = storeSettings.printerFontType || 'monospace';
  const currentNumCopies = storeSettings.printerNumCopies || 1;
  const currentShowAddress = storeSettings.printerShowAddress !== false;
  const currentHeaderMessage = storeSettings.printerHeaderMessage || '';
  const currentFooterMessage = storeSettings.printerFooterMessage || '';

  // Trigger test receipt print
  const handlePrintTest = () => {
    const mockOrder: Order = {
      id: 'ord-teste-bobina',
      total: 35.00,
      status: 'waiting',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      details: {
        customerName: 'Ajuste de Bobina / Teste',
        customerPhone: '(11) 99999-9999',
        deliveryType: 'delivery',
        address: {
          street: 'Rua do Açaí Supreme',
          number: '100',
          neighborhood: 'Bairro Gourmet',
          city: 'Monte Mor',
          reference: 'Próximo à Praça Central'
        },
        paymentType: 'pix'
      },
      items: [
        {
          id: 'item-teste-1',
          menuItem: {
            id: '1',
            name: 'Copo Personalizado Supremo',
            description: 'Copo de açaí montado sob medida',
            price: 20.00,
            category: 'acai' as const,
            image: ''
          },
          isCustomCup: true,
          customCupPrice: 20.00,
          customCupConfig: {
            size: '500ml',
            base: 'casadinho',
            flavors: ['acai', 'leite_ninho'],
            toppings: ['morango', 'leite_condensado', 'kitkat'],
          },
          quantity: 1,
          notes: 'Caprichar no morango!'
        },
        {
          id: 'item-teste-2',
          menuItem: {
            id: '2',
            name: 'Sundae Morango Especial',
            description: 'Delicioso sundae com calda caseira de frutas vermelhas',
            price: 15.00,
            category: 'sundae' as const,
            image: ''
          },
          quantity: 1
        }
      ]
    };
    printOrderReceipt(mockOrder, storeSettings);
    showFeedback("Sinal de teste enviado para a impressora! Verifique a caixa de diálogo.");
  };

  return (
    <div className="space-y-6 text-left" id="impressora-setup-container">
      {/* Tab Header Badge */}
      <div className="bg-gradient-to-r from-indigo-600 to-rose-600 p-6 rounded-[28px] text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] bg-white/20 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
              CONFIGURAR EQUIPAMENTO 🖨️
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight font-sans">Abas de Impressora Térmica</h2>
            <p className="text-xs text-white/80 font-medium">Cadastre, configure, controle as vias e ative a impressão automática dos pedidos.</p>
          </div>
          <button
            onClick={handlePrintTest}
            className="bg-white text-indigo-700 hover:bg-slate-50 transition-colors uppercase font-black text-[10px] tracking-wider py-3 px-5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4 shrink-0" />
            Imprimir Cupom de Teste
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-xl font-bold text-xs flex items-center gap-2">
          <span className="text-sm">✓</span> {successMsg}
        </div>
      )}

      {/* Aviso de Sandbox Iframe para Impressora Térmica */}
      {window.self !== window.top && (
        <div className="bg-amber-50/70 border border-amber-200/60 p-5 rounded-3xl space-y-2 text-left">
          <div className="flex items-center gap-2 text-amber-800">
            <Printer className="w-5 h-5 text-amber-600 shrink-0" />
            <h4 className="text-xs font-black uppercase tracking-wider">
              ⚠️ ATENÇÃO: IMPRESSÃO SUSPENSA DENTRO DO PRE-VISUALIZADOR!
            </h4>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
            Você está visualizando o painel administrativo dentro do visualizador limitado do AI Studio. 
            Nesse modo, os navegadores por segurança <strong>bloqueiam qualquer chamada de impressão física</strong>.
          </p>
          <div className="pt-1.5 flex flex-wrap gap-2">
            <a 
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-amber-605 hover:bg-amber-700 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-[10px] uppercase font-black tracking-wider transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              🚀 Abrir Painel em Nova Aba (Para Imprimir)
            </a>
            <span className="text-[10px] text-amber-800/80 font-medium self-center">
              (Ao abrir na aba principal, a impressão de cupons manuais e automáticos funcionará instantaneamente!)
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: configs - 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Dispositivos & Notificações de Alerta */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-105 pb-3">
              <span className="p-1.5 bg-slate-100 rounded-lg text-slate-800">
                <Volume2 className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-extrabold text-[12px] uppercase text-slate-800 tracking-wide">Campainha iFood & Notificações</h3>
                <p className="text-[10px] text-slate-400 font-medium">Alerta sonoro alto quando novos pedidos chegarem</p>
              </div>
            </div>

            <div className="bg-rose-50/20 border border-rose-150 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-sm">
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-wide block">🛎️ Campainha estilo iFood</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Toca um gongo insistente repetidas vezes quando um novo pedido cai no painel, até você silenciar ou aceitar.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={playNotificationSound}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-extrabold uppercase tracking-wide cursor-pointer flex items-center gap-1.5 transition-all"
                  title="Testar o áudio dongo de novos pedidos"
                >
                  🔊 Testar Som
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsSoundEnabled(!isSoundEnabled);
                    showFeedback(isSoundEnabled ? "Campainha silenciada" : "Campainha ativada!");
                  }}
                  className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                    isSoundEnabled
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                  }`}
                >
                  {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  {isSoundEnabled ? 'Ativada' : 'Silenciada'}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Printer settings form */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-105 pb-3">
              <span className="p-1.5 bg-slate-100 rounded-lg text-slate-800">
                <Printer className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-extrabold text-[12px] uppercase text-slate-800 tracking-wide">Parâmetros de Ajuste da Bobina Japonesa</h3>
                <p className="text-[10px] text-slate-400 font-medium">Configure margens, largura da bobina térmica de cupom e quantidade de vias</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              {/* Paper width */}
              <div className="space-y-1.5">
                <label className="block text-[9.5px] font-black uppercase tracking-wide text-slate-400">Largura de Bobina Suportada</label>
                <select
                  value={currentPaperWidth}
                  onChange={(e) => {
                    handleUpdatePrinterSetting('printerPaperWidth', e.target.value);
                    showFeedback(`Bobina alterada para ${e.target.value}`);
                  }}
                  className="w-full p-3 rounded-2xl border border-slate-200 outline-none bg-slate-50 text-slate-700 font-bold cursor-pointer hover:bg-slate-100/50 transition-colors"
                >
                  <option value="80mm">80mm (Média / Grande de Mesa, Ex: Epson T20)</option>
                  <option value="58mm">58mm (Bobina Compacta, Ex: Bluetooth / Mini)</option>
                </select>
                <p className="text-[9.5px] text-slate-400 leading-tight">Escolha 58mm se os lados do cupom estiverem saindo cortados no papel pequeno.</p>
              </div>

              {/* Number of Copies */}
              <div className="space-y-1.5">
                <label className="block text-[9.5px] font-black uppercase tracking-wide text-slate-400">Quantidade de Vias (Vias Impressas)</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={currentNumCopies}
                  onChange={(e) => {
                    handleUpdatePrinterSetting('printerNumCopies', Number(e.target.value));
                    showFeedback(`Vias configuradas em ${e.target.value}x`);
                  }}
                  className="w-full p-3 rounded-2xl border border-slate-200 outline-none bg-slate-50 text-slate-700 font-bold"
                />
                <p className="text-[9.5px] text-slate-400 leading-tight">1 via para o motoboy/balcão, ou 2 vias (gerar uma via extra para reter na cozinha).</p>
              </div>

              {/* Font Size */}
              <div className="space-y-1.5">
                <label className="block text-[9.5px] font-black uppercase tracking-wide text-slate-400">Tamanho da Fonte no Papel</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={10}
                    max={16}
                    step={1}
                    value={currentFontSize}
                    onChange={(e) => handleUpdatePrinterSetting('printerFontSize', Number(e.target.value))}
                    className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <span className="font-mono font-bold bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1.5 rounded-xl border border-indigo-100 min-w-[38px] text-center">
                    {currentFontSize}px
                  </span>
                </div>
              </div>

              {/* Font Family */}
              <div className="space-y-1.5">
                <label className="block text-[9.5px] font-black uppercase tracking-wide text-slate-400">Estilo de Tipografia</label>
                <select
                  value={currentFontType}
                  onChange={(e) => {
                    handleUpdatePrinterSetting('printerFontType', e.target.value);
                    showFeedback(`Fonte alterada para ${e.target.value}`);
                  }}
                  className="w-full p-3 rounded-2xl border border-slate-200 outline-none bg-slate-50 text-slate-700 font-bold cursor-pointer hover:bg-slate-100/50 transition-colors"
                >
                  <option value="monospace">Letras Alinhadas (Monospace - Recomendado)</option>
                  <option value="sans-serif">Sem Serifa (Moderna - Proporcional)</option>
                  <option value="serif">Decorativo Acadêmico (Serif)</option>
                </select>
              </div>

              {/* Show address */}
              <div className="space-y-1.5">
                <label className="block text-[9.5px] font-black uppercase tracking-wide text-slate-400">Exibir os dados da sua Loja no Topo</label>
                <select
                  value={currentShowAddress ? 'yes' : 'no'}
                  onChange={(e) => {
                    handleUpdatePrinterSetting('printerShowAddress', e.target.value === 'yes');
                    showFeedback(e.target.value === 'yes' ? "Cabeçalho com endereço ativado" : "Endereço omitido do cupom");
                  }}
                  className="w-full p-3 rounded-2xl border border-slate-200 outline-none bg-slate-50 text-slate-700 font-bold cursor-pointer text-left"
                >
                  <option value="yes">Sim, exibir Nome, Telefone e Endereço da Sorveteria</option>
                  <option value="no">Não, economizar bobina (oculta topo da loja)</option>
                </select>
              </div>

              {/* Header Custom title */}
              <div className="space-y-1.5">
                <label className="block text-[9.5px] font-black uppercase tracking-wide text-slate-400">Título Diferenciado no Topo</label>
                <input
                  type="text"
                  value={currentHeaderMessage}
                  onChange={(e) => handleUpdatePrinterSetting('printerHeaderMessage', e.target.value)}
                  placeholder="Ex: VIA COZINHA • PREPARO RÁPIDO"
                  className="w-full p-3 rounded-2xl border border-slate-200 outline-none bg-slate-50 text-slate-700 font-bold placeholder-slate-400"
                />
              </div>
            </div>

            {/* Custom footer msg */}
            <div className="space-y-1.5 text-xs">
              <label className="block text-[9.5px] font-black uppercase tracking-wide text-slate-400">Mensagem Carinhosa de Agradecimento (Rodapé)</label>
              <textarea
                rows={2}
                value={currentFooterMessage}
                onChange={(e) => handleUpdatePrinterSetting('printerFooterMessage', e.target.value)}
                placeholder="Ex: Muito obrigado pela preferência! Se puder, tire foto do seu copo gourmet e nos marque no Instagram @SeuInsta! ♥"
                className="w-full p-3 rounded-2xl border border-slate-200 outline-none bg-slate-50 text-slate-700 font-bold placeholder-slate-450"
              />
            </div>
          </div>

          {/* Section 3: Automatic Print Toggles */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-105 pb-3">
              <span className="p-1.5 bg-slate-100 rounded-lg text-slate-800">
                <Settings className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-extrabold text-[12px] uppercase text-slate-800 tracking-wide">Impressão & Disparos Automáticos</h3>
                <p className="text-[10px] text-slate-400 font-medium">Configure ações instantâneas e notificações disparadas automaticamente pelo sistema</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-start gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl cursor-pointer border border-slate-150 select-none transition-colors">
                <input 
                  type="checkbox" 
                  checked={autoPrintOnNew} 
                  onChange={(e) => {
                    setAutoPrintOnNew(e.target.checked);
                    showFeedback(e.target.checked ? "Impressão automática de novos pedidos ativada!" : "Impressão automática desativada");
                  }}
                  className="w-5 h-5 !accent-indigo-600 mt-0.5 cursor-pointer rounded"
                />
                <div className="space-y-0.5 text-left">
                  <h5 className="font-extrabold text-[11px] uppercase text-slate-800 leading-tight">Imprimir ao Receber ⚡</h5>
                  <p className="text-[9px] text-slate-450 font-semibold leading-normal">
                    Abre a tela de impressão fisicamente no mesmo instante em que o cliente fecha o pedido do carrinho.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl cursor-pointer border border-slate-150 select-none transition-colors">
                <input 
                  type="checkbox" 
                  checked={autoPrintOnPrep} 
                  onChange={(e) => {
                    setAutoPrintOnPrep(e.target.checked);
                    showFeedback(e.target.checked ? "Impressão ao iniciar preparo ativada!" : "Desativado");
                  }}
                  className="w-5 h-5 !accent-indigo-600 mt-0.5 cursor-pointer rounded"
                />
                <div className="space-y-0.5 text-left">
                  <h5 className="font-extrabold text-[11px] uppercase text-slate-800 leading-tight">Imprimir ao Preparar 🥣</h5>
                  <p className="text-[9px] text-slate-450 font-semibold leading-normal">
                    Imprime o cupom automaticamente ao clicar no botão de "Iniciar Montagem" no painel de entregas.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl cursor-pointer border border-slate-150 select-none transition-colors">
                <input 
                  type="checkbox" 
                  checked={autoSendWhatsAppStatus} 
                  onChange={(e) => {
                    setAutoSendWhatsAppStatus(e.target.checked);
                    showFeedback(e.target.checked ? "Status de WhatsApp automático ATIVADO! 💬" : "Status manual de WhatsApp reestabelecido");
                  }}
                  className="w-5 h-5 !accent-indigo-600 mt-0.5 cursor-pointer rounded"
                />
                <div className="space-y-0.5 text-left">
                  <h5 className="font-extrabold text-[11px] uppercase text-slate-800 leading-tight">Notificar Status Zap 💬</h5>
                  <p className="text-[9px] text-slate-450 font-semibold leading-normal">
                    Abre o WhatsApp Web/App com a mensagem de status prontinha toda vez que você avançar o progresso!
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right column: thermal preview emulated - 5 cols */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <h3 className="text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              Simulador da Bobina Térmica
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mb-5">Visualize abaixo em tempo real como o cupom será impresso no papel:</p>
            
            {/* Visual ticket mockup paper */}
            <div className="mx-auto bg-amber-50/10 backdrop-blur-md rounded-2xl border border-white/5 relative p-4 max-w-[290px] text-black">
              <div 
                className="bg-white p-4.5 rounded-xl shadow-lg relative overflow-hidden flex flex-col text-left font-mono"
                style={{
                  fontFamily: currentFontType === 'sans-serif' ? 'Inter, sans-serif' : currentFontType === 'serif' ? 'Georgia, serif' : 'JetBrains Mono, monospace',
                  fontSize: `${currentFontSize - 2}px`,
                  lineHeight: '1.45',
                  maxWidth: currentPaperWidth === '58mm' ? '220px' : '280px',
                  margin: '0 auto'
                }}
              >
                {/* Simulated ticket jagged tears */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[linear-gradient(45deg,#0000_33.333%,#f8fafc_33.333%,#f8fafc_66.666%,#0000_66.666%)] bg-[length:12px_12px]" />
                
                {/* Ticket Header */}
                <div className="text-center pt-2 space-y-1">
                  <span className="text-[8px] font-bold text-slate-400">--------------------------</span>
                  
                  {currentShowAddress && (
                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-[12px] text-slate-900 tracking-tight">{storeSettings.name.toUpperCase()}</h4>
                      <p className="text-[8.5px] text-slate-600">Fone: {storeSettings.phone}</p>
                      <p className="text-[8px] text-slate-500 leading-tight">{storeSettings.address}</p>
                    </div>
                  )}

                  {currentHeaderMessage && (
                    <h5 className="font-extrabold text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 py-1 px-1.5 uppercase rounded mt-1.5">
                      {currentHeaderMessage}
                    </h5>
                  )}

                  <span className="text-[8px] font-bold text-slate-400 block pb-1">==========================</span>
                </div>

                {/* Simulated Order Metadata */}
                <div className="space-y-1 font-bold">
                  <div className="flex justify-between">
                    <span>PEDIDO: #F39B6</span>
                    <span>PIX - DELIVERY</span>
                  </div>
                  <div>CLIENTE: Felipe Barbosa</div>
                  <div>FONE: (11) 98765-4321</div>
                  <div>HORA: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                  
                  <div className="border-t border-dashed border-slate-300 my-1.5" />
                </div>

                {/* Simulated Items */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>1x Copo Personalizado 500ml</span>
                    <span>R$ 20,00</span>
                  </div>
                  <div className="text-[9.5px] text-slate-500 pl-2 leading-relaxed space-y-0.5">
                    <p>• Calda/Base: Casadinho</p>
                    <p>• Sabores: Açaí, Ninho</p>
                    <p>• Coberturas: Morango, Leite Condensado</p>
                  </div>

                  <div className="flex justify-between font-bold text-slate-800">
                    <span>1x Sundae Morango Especial</span>
                    <span>R$ 15,00</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-2" />

                {/* Total section */}
                <div className="font-bold flex justify-between text-[11.5px] text-slate-950 uppercase">
                  <span>TOTAL A PAGAR:</span>
                  <span>R$ 35,00</span>
                </div>

                {currentFooterMessage && (
                  <div className="mt-3.5 pt-2.5 border-t border-slate-250 text-center font-semibold text-[8.5px] text-slate-500 leading-relaxed italic">
                    {currentFooterMessage}
                  </div>
                )}

                <div className="text-center text-[7.5px] text-slate-400 uppercase mt-4">
                  SISTEMA SUPREME ICE
                </div>
              </div>
            </div>
          </div>

          {/* Practical Setup Guide */}
          <div className="bg-white rounded-3xl border border-slate-150 p-6 space-y-5">
            <h4 className="font-extrabold text-[11px] text-slate-850 uppercase tracking-widest flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Guia Rápido de Instalação Física
            </h4>

            <div className="text-[11.5px] text-slate-500 space-y-3.5 font-medium leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-extrabold font-mono text-[10px]">1</span>
                <p>
                  <strong className="text-slate-800">Conexão física:</strong> plugue o cabo USB da impressora no computador ou pareie por Bluetooth no celular.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-extrabold font-mono text-[10px]">2</span>
                <p>
                  <strong className="text-slate-800">Zero Setup/Drivers:</strong> Nossa tecnologia usa o sistema de impressão nativo. Caso use celular ou tablet Android, nós recomendamos o aplicativo complementar <strong className="text-indigo-600">RawBT</strong> ou similar para parear impressora Bluetooth local.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-extrabold font-mono text-[10px]">3</span>
                <p>
                  <strong className="text-slate-800">Dica de Margens:</strong> Na primeira vez que a janela abrir, clique em <strong className="text-slate-800">&ldquo;Mais Configurações&rdquo;</strong>, mude Margens para <strong className="text-indigo-600">&ldquo;Nenhuma&rdquo;</strong> e desmarque <strong className="text-rose-500">&ldquo;Cabeçalhos e Rodapés&rdquo;</strong> para cortar o desperdício de papel da bobina.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
