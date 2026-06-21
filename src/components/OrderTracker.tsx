/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChefHat, Bike, Clock, CheckCircle2, AlertCircle, RefreshCw, Star, ArrowRight, Heart, Printer, Check } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { FLAVOR_OPTIONS, TOPPING_OPTIONS } from '../data';
import { printOrderReceipt } from '../utils/printHelper';

interface OrderTrackerProps {
  order: Order;
  onClose: () => void;
  onSimulateStatusProgress?: () => void; // Allow manual simulation for review
  storeSettings?: any;
}

export default function OrderTracker({ order, onClose, onSimulateStatusProgress, storeSettings }: OrderTrackerProps) {
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(order.status);
  const [rating, setRating] = useState(0);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'tracker' | 'printer'>('tracker');
  const [printerSuccess, setPrinterSuccess] = useState(false);

  // Sync status if parent updates it
  useEffect(() => {
    setCurrentStatus(order.status);
  }, [order.status]);

  const steps: { key: OrderStatus; label: string; desc: string; icon: any; color: string }[] = [
    {
      key: 'waiting',
      label: 'Aguardando',
      desc: 'Processando pagamento e enviando o pedido para a cozinha.',
      icon: Clock,
      color: 'bg-amber-500',
    },
    {
      key: 'preparing',
      label: 'Preparando',
      desc: 'Os sorvetes e açaís estão sendo servidos e decorados com carinho.',
      icon: ChefHat,
      color: 'bg-indigo-500',
    },
    {
      key: 'delivering',
      label: order.details.deliveryType === 'delivery' ? 'A Caminho' : 'Pronto p/ Retirada',
      desc: order.details.deliveryType === 'delivery' 
        ? 'O motoboy Supreme saiu com sua caixa térmica selada!'
        : 'Sua taça ou copo está pronto no balcão de retirada!',
      icon: Bike,
      color: 'bg-rose-500',
    },
    {
      key: 'completed',
      label: 'Entregue',
      desc: 'Pedido entregue! Hora de desfrutar do supremo sabor.',
      icon: CheckCircle2,
      color: 'bg-emerald-500',
    },
  ];

  const getStatusIndex = (status: OrderStatus) => {
    return steps.findIndex((s) => s.key === status);
  };

  const currentIndex = getStatusIndex(currentStatus);

  const getEtaRange = () => {
    if (order.details.deliveryType === 'pickup') {
      return '10 a 15 min';
    }
    return '25 a 35 min';
  };

  const handleRatingSubmit = () => {
    setReviewSubmitted(true);
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-rose-50 max-w-2xl mx-auto space-y-6">
      {/* Tracker Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-rose-50 pb-4">
        <div>
          <span className="text-[10px] bg-rose-50 text-rose-600 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Acompanhamento em Tempo Real
          </span>
          <h3 className="text-xl font-bold text-slate-800 mt-1">Pedido #{order.id.slice(-6).toUpperCase()}</h3>
          <p className="text-xs text-slate-500 font-medium">Realizado às {order.timestamp}</p>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-400 font-semibold">Previsão de Entrega</p>
          <div className="flex items-center gap-1.5 text-rose-600 font-extrabold text-base justify-end">
            <Clock className="w-4 h-4" />
            <span>{getEtaRange()}</span>
          </div>
        </div>
      </div>


      {/* Subtab Switcher: Acompanhamento vs Impressora */}
      <div className="flex bg-slate-100 p-1 rounded-xl max-w-sm">
        <button
          onClick={() => setActiveSubTab('tracker')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
            activeSubTab === 'tracker'
              ? 'bg-white text-rose-650 shadow-xs'
              : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          📍 Acompanhamento
        </button>
        <button
          onClick={() => {
            setActiveSubTab('printer');
            setPrinterSuccess(true);
            try {
              printOrderReceipt(order, storeSettings);
              setTimeout(() => setPrinterSuccess(false), 4000);
            } catch (err) {
              console.error("Direct print failed on tab select:", err);
            }
          }}
          className={`flex-1 py-1.5 px-3 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
            activeSubTab === 'printer'
              ? 'bg-rose-500 text-white shadow-xs font-extrabold'
              : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <Printer className="w-3.5 h-3.5" /> Impressora
        </button>
      </div>

      {activeSubTab === 'tracker' ? (
        <>
          {/* Simulated status control bar for reviewer */}
          {onSimulateStatusProgress && currentStatus !== 'completed' && (
            <div className="bg-amber-50/50 p-2.5 rounded-2xl border border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-[10px] text-amber-950 font-bold">Modo de Simulação Ativo</span>
              </div>
              <button
                onClick={onSimulateStatusProgress}
                className="text-[10px] bg-white border border-amber-200 text-amber-800 font-extrabold px-3 py-1 rounded-xl shadow-xs hover:bg-amber-50 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} /> Avançar Status do Pedido
              </button>
            </div>
          )}

          {/* Interactive Visual Timeline */}
          <div className="relative py-2 pl-4 md:pl-0">
            {/* Connector line for Desktop */}
            <div className="hidden md:block absolute top-[43px] left-[12%] right-[12%] h-1 bg-slate-100 -z-1" />
            <div 
              className="hidden md:block absolute top-[43px] left-[12%] h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-rose-500 -z-1 transition-all duration-500"
              style={{ width: `${(currentIndex / 3) * 76}%` }}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4 relative z-10">
              {steps.map((stepItem, index) => {
                const Icon = stepItem.icon;
                const isCompleted = index < currentIndex;
                const isActive = index === currentIndex;
                const isPending = index > currentIndex;

                return (
                  <div key={stepItem.key} className="flex md:flex-col items-center md:text-center gap-4 md:gap-2">
                    {/* Visual Dot/Icon Container */}
                    <motion.div
                      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className={`w-11 h-11 rounded-full flex items-center justify-center border-3 transition-colors ${
                        isActive 
                          ? `${stepItem.color} border-white shadow-lg text-white ring-4 ring-${stepItem.key === 'waiting' ? 'amber-100' : stepItem.key === 'preparing' ? 'indigo-100' : 'rose-100'}`
                          : isCompleted
                          ? 'bg-rose-500 border-white text-white shadow-inner'
                          : 'bg-white border-slate-100 text-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </motion.div>

                    {/* Step labels */}
                    <div className="flex-1 md:flex-none">
                      <h4 className={`text-xs font-extrabold tracking-wide ${isActive ? 'text-slate-800' : isCompleted ? 'text-rose-500' : 'text-slate-400'}`}>
                        {stepItem.label}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5 max-w-[150px] md:mx-auto">
                        {stepItem.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Motoboy detail or pickup instruction details */}
          {currentIndex === 2 && order.details.deliveryType === 'delivery' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-50/40 border border-rose-100/40 p-4 rounded-2xl flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-rose-500 overflow-hidden flex items-center justify-center text-white text-lg font-bold">
                  C
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Carlos Eduardo (Cadu)</p>
                  <p className="text-[10px] text-rose-600 font-extrabold">Entregador Exclusivo Supreme</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Moto: CG Titan 160 Vermelha (Placa: SCB-3000)</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider block mb-1">
                  Capacete Selado
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Temp. Bag: <span className="text-rose-600">-12°C</span></span>
              </div>
            </motion.div>
          )}

          {/* Order Complete - Leave a Review panel */}
          {currentStatus === 'completed' && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <Heart className="w-6 h-6 text-emerald-600 fill-emerald-600/20" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Seu pedido foi entregue com Sucesso!</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Espero que sua taça de sorvete ou açaí esteja incrivelmente gelada e cremosa. Sua opinião vale muito para a Sorveteria Supreme!
                </p>
              </div>

              {!reviewSubmitted ? (
                <div className="space-y-3 pt-1">
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1 focus:outline-none"
                      >
                        <Star
                          className={`w-6 h-6 transition-all ${
                            star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 hover:text-amber-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  
                  {rating > 0 && (
                    <motion.button
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      onClick={handleRatingSubmit}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-6 rounded-xl shadow-md shadow-emerald-100 transition-all"
                    >
                      Enviar Avaliação de {rating} Estrelas
                    </motion.button>
                  )}
                </div>
              ) : (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-emerald-800 font-bold flex items-center gap-1.5 justify-center"
                >
                  <Star className="w-4 h-4 fill-emerald-600 text-emerald-600" /> Obrigado pelo seu feedback precioso! Bom apetite!
                </motion.p>
              )}
            </motion.div>
          )}
        </>
      ) : (
        <div className="space-y-5 text-left">
          {printerSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-xl font-bold text-xs flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-600" />
              Comando enviado! O assistente do sistema acionou sua impressora térmica.
            </motion.div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <div className="text-left space-y-0.5">
              <span className="text-[10px] block font-black text-rose-600 uppercase tracking-widest leading-none">Canal de Impressão Direta</span>
              <p className="text-[11px] text-slate-500 font-medium">Re-imprima o cupom do pedido sem fechar a tela.</p>
            </div>
            <button
              onClick={() => {
                setPrinterSuccess(true);
                try {
                  printOrderReceipt(order, storeSettings);
                  setTimeout(() => setPrinterSuccess(false), 4000);
                } catch (err) {
                  console.error("Manual print failed:", err);
                }
              }}
              className="bg-slate-800 hover:bg-slate-950 text-white uppercase font-black text-[10px] tracking-wider py-2.5 px-4.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition-all text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Reimprimir Cupom
            </button>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden">
            <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-wider mb-2.5 flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-emerald-400" /> Visualização do Cupom de Saída
            </h4>
            
            <div className="mx-auto bg-amber-50/10 backdrop-blur-md rounded-2xl border border-white/5 relative p-4 max-w-[280px] text-black">
              <div 
                className="bg-white p-4.5 rounded-xl shadow-lg relative overflow-hidden flex flex-col text-left font-mono"
                style={{
                  fontFamily: storeSettings?.printerFontType === 'sans-serif' ? 'Inter, sans-serif' : storeSettings?.printerFontType === 'serif' ? 'Georgia, serif' : 'monospace',
                  fontSize: `${Number(storeSettings?.printerFontSize || 12) - 2}px`,
                  lineHeight: '1.4',
                  maxWidth: storeSettings?.printerPaperWidth === '58mm' ? '210px' : '260px',
                  margin: '0 auto'
                }}
              >
                {/* Paper Jagged tear styling */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[linear-gradient(45deg,#0000_33.333%,#f8fafc_33.333%,#f8fafc_66.666%,#0000_66.666%)] bg-[length:10px_10px]" />
                
                {/* Header info */}
                <div className="text-center pt-1.5 space-y-1">
                  {storeSettings?.printerShowAddress !== false && (
                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-[12px] text-slate-900 tracking-tight">{(storeSettings?.name || 'SORVETERIA SUPREME').toUpperCase()}</h4>
                      {storeSettings?.phone && <p className="text-[8.5px] text-slate-600">Fone: {storeSettings.phone}</p>}
                      {storeSettings?.address && <p className="text-[8px] text-slate-500 leading-tight">{storeSettings.address}</p>}
                    </div>
                  )}
                  
                  {storeSettings?.printerHeaderMessage && (
                    <h5 className="font-extrabold text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-100 py-0.5 px-1 uppercase rounded mt-1">
                      {storeSettings.printerHeaderMessage}
                    </h5>
                  )}
                  <span className="text-[8px] opacity-40 block">----------------------------------</span>
                </div>

                {/* Order info */}
                <div className="space-y-0.5 font-bold">
                  <div className="flex justify-between text-[10px] text-slate-900">
                    <span>PEDIDO: #{order.id.slice(-6).toUpperCase()}</span>
                    <span>{order.details.deliveryType === 'delivery' ? 'DELIVERY' : 'BALCÃO'}</span>
                  </div>
                  <div>CLIENTE: {order.details.customerName}</div>
                  <div>FONE: {order.details.customerPhone}</div>
                  <div>DATA: {order.timestamp}</div>
                  {order.details.deliveryType === 'delivery' && (
                    <div className="text-slate-700 font-semibold leading-relaxed mt-1">
                      👉 ENDEREÇO: {order.details.address.street}, {order.details.address.number} - {order.details.address.neighborhood}, {order.details.address.city}
                      {order.details.address.reference && <p className="text-slate-500 font-medium italic text-[8.5px]">Ref: {order.details.address.reference}</p>}
                    </div>
                  )}
                  <span className="text-[8px] opacity-40 block">----------------------------------</span>
                </div>

                {/* Items */}
                <div className="space-y-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{item.quantity}x {item.menuItem.name}</span>
                        <span>R$ {((item.customCupPrice || item.menuItem.price) * item.quantity).toFixed(2)}</span>
                      </div>
                      {item.isCustomCup && item.customCupConfig && (
                        <div className="text-[8.5px] text-slate-500 pl-2 space-y-0.5">
                          <p>• Tamanho: {item.customCupConfig.size} | Base: {item.customCupConfig.base === 'acai' ? 'Açaí' : item.customCupConfig.base === 'sorvete' ? 'Sorvete' : 'Casadinho'}</p>
                          {item.customCupConfig.flavors && item.customCupConfig.flavors.length > 0 && (
                            <p>• Sabores: {item.customCupConfig.flavors.map(fid => FLAVOR_OPTIONS.find(f => f.id === fid)?.name || fid).join(', ')}</p>
                          )}
                          {item.customCupConfig.toppings && item.customCupConfig.toppings.length > 0 && (
                            <p>• Adicionais: {item.customCupConfig.toppings.map(tid => TOPPING_OPTIONS.find(t => t.id === tid)?.name || tid).join(', ')}</p>
                          )}
                        </div>
                      )}
                      {item.notes && <p className="text-[8px] text-rose-600 font-bold pl-2 italic">Obs: {item.notes}</p>}
                    </div>
                  ))}
                  <span className="text-[8px] opacity-40 block">----------------------------------</span>
                </div>

                {/* Total */}
                <div className="font-extrabold flex justify-between text-[11px] text-slate-900 mt-1 uppercase">
                  <span>FORMA PGTO:</span>
                  <span>
                    {order.details.paymentType === 'pix' ? 'PIX' : 
                     order.details.paymentType === 'card' ? 'Cartão' :
                     order.details.paymentType === 'cash_on_delivery' ? 'Dinheiro' : 'Cartão na Entrega'}
                  </span>
                </div>
                <div className="font-black flex justify-between text-[11.5px] text-rose-650 mt-1 pb-1">
                  <span>TOTAL GERAL:</span>
                  <span>R$ {order.total.toFixed(2)}</span>
                </div>

                {storeSettings?.printerFooterMessage && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200 text-center font-semibold text-[8px] text-slate-500 leading-normal italic">
                    {storeSettings.printerFooterMessage}
                  </div>
                )}
              </div>
            </div>
          </div>

          {window.self !== window.top && (
            <div className="bg-amber-50 text-amber-900 border border-amber-200 p-4 rounded-2xl text-left space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 text-amber-850 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <h5 className="text-[10px] uppercase font-black tracking-wider">Impressão Bloqueada no Assistente</h5>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-600">
                Os navegadores impedem chamadas físicas de impressão em iframes embutidos. 
                Para que a impressão ocorra sem interrupções e de forma 100% direta, abra a Sorveteria em uma <strong className="text-slate-800">Nova Aba</strong> do seu navegador.
              </p>
              <div className="pt-0.5">
                <a 
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-[9px] uppercase font-black tracking-wider transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  🚀 Abrir em Nova Aba
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inner items summaries collapsible */}
      <div className="border border-slate-150 rounded-2xl p-4 space-y-2.5">
        <h4 className="text-xs font-bold text-slate-600 border-b border-rose-50 pb-1.5 uppercase tracking-wide">Resumo dos Produtos</h4>
        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-start text-xs border-b border-slate-50 pb-2 last:border-b-0 last:pb-0">
              <div className="min-w-0 pr-2 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-rose-600">{item.quantity}x</span>
                  <span className="font-bold text-slate-700">{item.menuItem.name}</span>
                </div>
                {item.isCustomCup && item.customCupConfig && (
                  <div className="text-[10px] text-indigo-650 font-semibold leading-normal mt-0.5 space-y-0.5 pl-4">
                    <p>🥣 Base: {item.customCupConfig.base === 'acai' ? 'Açaí' : item.customCupConfig.base === 'sorvete' ? 'Sorvete' : 'Casadinho'} | Tamanho: {item.customCupConfig.size}</p>
                    {item.customCupConfig.flavors && item.customCupConfig.flavors.length > 0 && (
                      <p className="text-slate-400 font-medium font-mono text-[9px]">• Sabores: {item.customCupConfig.flavors.map(fid => FLAVOR_OPTIONS.find(f => f.id === fid)?.name || fid).join(', ')}</p>
                    )}
                    {item.customCupConfig.toppings && item.customCupConfig.toppings.length > 0 && (
                      <p className="text-slate-400 font-medium font-mono text-[9px]">• Adicionais: {item.customCupConfig.toppings.map(tid => TOPPING_OPTIONS.find(t => t.id === tid)?.name || tid).join(', ')}</p>
                    )}
                  </div>
                )}
                {item.notes && (() => {
                  const lower = item.notes.toLowerCase();
                  const isRetire = lower.includes('retir') || lower.includes('tirar') || lower.includes('sem ') || lower.includes('tire');
                  const isSeparado = lower.includes('separad') || lower.includes('mande separ') || lower.includes('pote') || lower.includes('potinho') || lower.includes('mandar separ');
                  
                  if (isRetire && isSeparado) {
                    return (
                      <div className="mt-1 bg-red-50 border border-red-250 text-red-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide flex items-center gap-1">
                        <span>⚠️ RETIRAR & SEPARAR:</span>
                        <span className="font-bold text-slate-700 normal-case">"{item.notes}"</span>
                      </div>
                    );
                  }
                  if (isRetire) {
                    return (
                      <div className="mt-1 bg-amber-50 border border-amber-250 text-amber-800 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide flex items-center gap-1">
                        <span>🚫 RETIRAR:</span>
                        <span className="font-bold text-slate-755 normal-case">"{item.notes}"</span>
                      </div>
                    );
                  }
                  if (isSeparado) {
                    return (
                      <div className="mt-1 bg-cyan-50 border border-cyan-255 text-cyan-850 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide flex items-center gap-1">
                        <span>📦 MANDAR SEPARADO:</span>
                        <span className="font-bold text-slate-755 normal-case">"{item.notes}"</span>
                      </div>
                    );
                  }
                  return (
                    <p className="text-[10px] text-slate-400 italic">Obs: {item.notes}</p>
                  );
                })()}
              </div>
              <span className="font-mono text-slate-600 font-semibold flex-shrink-0">
                R$ {((item.customCupPrice || item.menuItem.price) * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-slate-100 pt-2 flex justify-between items-center text-xs">
          <div className="text-slate-500 font-medium">
            <span>Forma Pagamento: </span>
            <span className="font-bold text-slate-700 uppercase">
              {order.details.paymentType === 'pix' ? 'PIX Online' : 
               order.details.paymentType === 'card' ? 'Cartão de Crédito' :
               order.details.paymentType === 'cash_on_delivery' ? 'Dinheiro' : 'Cartão na Entrega'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Total Pago: </span>
            <span className="font-black text-rose-600 text-sm">R$ {order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Voltar button */}
      <div className="text-center pt-2">
        <button
          onClick={onClose}
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2.5 px-6 rounded-2xl transition-colors w-full"
        >
          Minhas Compras / Início
        </button>
      </div>
    </div>
  );
}
