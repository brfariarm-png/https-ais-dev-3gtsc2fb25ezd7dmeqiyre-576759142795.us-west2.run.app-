/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, QrCode, ClipboardCheck, Clipboard, Compass, MapPin, Truck, Check, Wallet, RotateCcw, AlertCircle } from 'lucide-react';
import { CheckoutDetails, PaymentType, CartItem } from '../types';

interface CheckoutProps {
  cartItems: CartItem[];
  totalAmount: number;
  onPlaceOrder: (details: CheckoutDetails) => void;
  onClose: () => void;
}

export default function Checkout({ cartItems, totalAmount, onPlaceOrder, onClose }: CheckoutProps) {
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Delivery info, Step 2: Payment
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Address info
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Sorocaba'); // default city
  const [reference, setReference] = useState('');

  // Payment info
  const [paymentType, setPaymentType] = useState<PaymentType>('pix');
  const [copiedPix, setCopiedPix] = useState(false);
  const [pixTimeLeft, setPixTimeLeft] = useState(600); // 10 minutes countdown

  // Card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isCvvFocused, setIsCvvFocused] = useState(false);

  // Form errors
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown timer for Pix
  useEffect(() => {
    let timer: any;
    if (paymentType === 'pix' && step === 2) {
      timer = setInterval(() => {
        setPixTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [paymentType, step]);

  const deliveryFee = deliveryType === 'delivery' ? 5.00 : 0.00;
  const finalTotal = totalAmount + deliveryFee;

  const validateStep1 = () => {
    const errs: string[] = [];
    if (!customerName.trim()) errs.push('Nome é obrigatório.');
    if (!customerPhone.trim() || customerPhone.length < 10) errs.push('Digite um telefone celular válido.');
    
    if (deliveryType === 'delivery') {
      if (!street.trim()) errs.push('Rua é obrigatória.');
      if (!number.trim()) errs.push('Número é obrigatório.');
      if (!neighborhood.trim()) errs.push('Bairro é obrigatório.');
    }

    setErrors(errs);
    return errs.length === 0;
  };

  const validateStep2 = () => {
    const errs: string[] = [];
    if (paymentType === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16) errs.push('Número do cartão inválido (mínimo 16 dígitos).');
      if (!cardName.trim()) errs.push('Nome impresso no cartão é obrigatório.');
      if (cardExpiry.length < 5) errs.push('Validade do cartão deve estar no formato MM/AA.');
      if (cardCvv.length < 3) errs.push('Código CVV inválido (mínimo 3 dígitos).');
    }
    setErrors(errs);
    return errs.length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
      setErrors([]);
    }
  };

  const handlePreviousStep = () => {
    setStep(1);
    setErrors([]);
  };

  const handleFinishCheckout = () => {
    if (!validateStep2()) return;

    setIsSubmitting(true);

    const details: CheckoutDetails = {
      customerName,
      customerPhone,
      deliveryType,
      address: {
        street,
        number,
        neighborhood,
        city,
        reference: reference.trim() || undefined,
      },
      paymentType,
      cardDetails: paymentType === 'card' ? {
        number: cardNumber,
        name: cardName,
        expiry: cardExpiry,
        cvv: cardCvv,
      } : undefined,
    };

    // Simulate small backend transaction verify latency
    setTimeout(() => {
      onPlaceOrder(details);
      setIsSubmitting(false);
    }, 2000);
  };

  // Format Card Number
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    const matches = val.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(' '));
    } else {
      setCardNumber(val);
    }
  };

  // Format Expiry MM/AA
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.substring(0, 4);
    if (val.length > 2) {
      setCardExpiry(`${val.substring(0, 2)}/${val.substring(2)}`);
    } else {
      setCardExpiry(val);
    }
  };

  // Pix code generator mock
  const pixMockCode = `00020126580014br.gov.bcb.pix0136supremeicecream-pix-key-99881273918205204000053039865407${finalTotal.toFixed(2)}5802BR5918Sorveteria_Supreme6008Sorocaba62070503***6304D792`;

  const copyPixToClipboard = () => {
    navigator.clipboard.writeText(pixMockCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  // Formats seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 overflow-y-auto flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden p-6 relative max-h-[92vh] flex flex-col justify-between"
      >
        {/* Header indicator */}
        <div className="flex justify-between items-center pb-4 border-b border-rose-50/80 mb-4 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Finalizar Pedido</h3>
            <p className="text-xs text-slate-500">Seu pedido refrescante está quase lá!</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors text-sm font-semibold"
          >
            Voltar
          </button>
        </div>

        {/* Errors view */}
        {errors.length > 0 && (
          <div className="bg-rose-50/80 border border-rose-200 text-rose-800 p-3 rounded-2xl mb-4 flex items-start gap-2.5 flex-shrink-0 animate-shake">
            <AlertCircle className="w-5 h-5 mt-0.5 text-rose-500 flex-shrink-0" />
            <div className="text-xs space-y-0.5">
              <span className="font-bold block text-rose-900">Por favor, corrija os seguintes itens:</span>
              <ul className="list-disc pl-4 space-y-0.5 font-medium">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1 space-y-5">
          {/* STEP 1: Delivery detail inputs */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {/* Type switches */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setDeliveryType('delivery')}
                  className={`py-3 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                    deliveryType === 'delivery'
                      ? 'bg-white text-rose-600 shadow-md shadow-slate-200/50 scale-[1.01]'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Truck className="w-4 h-4" /> Entrega em Domicílio
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType('pickup')}
                  className={`py-3 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                    deliveryType === 'pickup'
                      ? 'bg-white text-rose-600 shadow-md shadow-slate-200/50 scale-[1.01]'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <MapPin className="w-4 h-4" /> Retirar na Loja
                </button>
              </div>

              {/* Personal info fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Seu Nome *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full text-xs p-3 rounded-2xl border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50/50 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Celular / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => {
                      const numericVal = e.target.value.replace(/\D/g, '');
                      setCustomerPhone(numericVal);
                    }}
                    placeholder="Ex: 15998765432"
                    className="w-full text-xs p-3 rounded-2xl border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50/50 font-mono"
                  />
                </div>
              </div>

              {/* Delivery Address fields */}
              {deliveryType === 'delivery' ? (
                <div className="border border-slate-100 bg-slate-50/30 p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" /> Endereço de Entrega
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Logradouro / Rua *</label>
                      <input
                        type="text"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Ex: Av. Afonso Vergueiro"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium animate-fadeIn"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Número *</label>
                      <input
                        type="text"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="Ex: 1250"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium animate-fadeIn"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Bairro *</label>
                      <input
                        type="text"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Ex: Centro"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium animate-fadeIn"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Cidade</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Ex: Sorocaba"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-neutral-100 text-slate-500 font-medium cursor-not-allowed"
                        disabled
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Ponto de Referência / Casa-Apto (Opcional)</label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Ex: Próximo à padaria, apto 42 bloco B"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium animate-fadeIn"
                    />
                  </div>
                </div>
              ) : (
                <div className="border border-amber-100 bg-amber-50/50 p-4 rounded-2xl text-center space-y-2 animate-fadeIn">
                  <Compass className="w-8 h-8 text-amber-600 mx-auto" />
                  <h4 className="text-xs font-extrabold text-amber-800">Retirada na Loja Express</h4>
                  <p className="text-[11px] text-amber-700/85 max-w-md mx-auto leading-normal font-medium">
                    Você economiza a taxa de entrega! Nosso endereço é: <br />
                    <span className="font-bold text-amber-900 shadow-sm">Av. General Carneiro, 1205 - Vila Lucy - Sorocaba/SP</span>. <br />
                    Seu pedido estará pronto para retirada em cerca de <span className="font-bold">15-20 minutos</span> após a confirmação.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: Checkout / Payment options */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {/* Payment selection tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('pix')}
                    className={`py-3.5 px-4 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2.5 transition-all ${
                      paymentType === 'pix'
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-800 shadow-sm'
                        : 'border-slate-100 hover:border-slate-200 text-slate-600'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-600" /> Pagar via PIX Online
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('card')}
                    className={`py-3.5 px-4 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2.5 transition-all ${
                      paymentType === 'card'
                        ? 'border-indigo-500 bg-indigo-50/60 text-indigo-800 shadow-sm'
                        : 'border-slate-100 hover:border-slate-200 text-slate-600'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-indigo-600" /> Cartão de Crédito
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('cash_on_delivery')}
                    className={`py-3.5 px-4 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2.5 transition-all ${
                      paymentType === 'cash_on_delivery'
                        ? 'border-rose-500 bg-rose-50/60 text-rose-800 shadow-sm'
                        : 'border-slate-100 hover:border-slate-200 text-slate-600'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-rose-600" /> Dinheiro na Entrega
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('card_on_delivery')}
                    className={`py-3.5 px-4 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2.5 transition-all ${
                      paymentType === 'card_on_delivery'
                        ? 'border-rose-500 bg-rose-50/60 text-rose-800 shadow-sm'
                        : 'border-slate-100 hover:border-slate-200 text-slate-600'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-rose-600" /> Cartão na Entrega
                  </button>
                </div>
              </div>

              {/* Sub-form based on selection */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                {/* 1. Pix Layout */}
                {paymentType === 'pix' && (
                  <div className="space-y-4 text-center animate-fadeIn">
                    <div className="flex flex-col items-center">
                      <div className="bg-white p-3 rounded-2xl shadow-md border border-neutral-100 mb-2 relative">
                        {/* Interactive QR representation */}
                        <svg className="w-40 h-40 text-slate-800" viewBox="0 0 100 100">
                          {/* Anchor corners */}
                          <rect x="5" y="5" width="25" height="25" fill="currentColor" rx="2" />
                          <rect x="9" y="9" width="17" height="17" fill="white" rx="1" />
                          <rect x="13" y="13" width="9" height="9" fill="currentColor" rx="0.5" />

                          <rect x="70" y="5" width="25" height="25" fill="currentColor" rx="2" />
                          <rect x="74" y="9" width="17" height="17" fill="white" rx="1" />
                          <rect x="78" y="13" width="9" height="9" fill="currentColor" rx="0.5" />

                          <rect x="5" y="70" width="25" height="25" fill="currentColor" rx="2" />
                          <rect x="9" y="74" width="17" height="17" fill="white" rx="1" />
                          <rect x="13" y="78" width="9" height="9" fill="currentColor" rx="0.5" />

                          {/* Complex inner matrix lines matching Pix design mock */}
                          <path d="M 35,10 H 45 V 20 H 35 Z M 50,5 H 65 V 15 H 50 Z M 35,25 H 55 V 30 H 35 Z M 10,35 H 25 V 45 H 10 Z" fill="currentColor" />
                          <path d="M 45,35 H 65 V 50 H 45 Z M 5,50 H 35 V 60 H 5 Z M 40,60 H 60 V 75 H 40 Z M 70,35 H 90 V 65 H 70 Z M 65,70 H 95 V 95 H 65 Z" fill="currentColor" />
                          <path d="M 35,80 H 60 V 90 H 35 Z M 5,90 H 25 V 95 H 5 Z M 10,65 H 25 V 70 H 10 Z C 50,40 60,30 20,40 Z" fill="currentColor" />
                          {/* Center Pix Icon logo */}
                          <rect x="42" y="42" width="16" height="16" fill="#32bcad" rx="4" />
                          <path d="M 46,50 L 50,46 L 54,50 L 50,54 Z" fill="white" />
                        </svg>
                        
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-[0.5px] items-center justify-center flex flex-col rounded-2xl opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-[10px] font-bold bg-emerald-600 text-white rounded-full px-2 py-0.5 shadow">QR Ativo</span>
                        </div>
                      </div>

                      <div className="text-xs text-neutral-500 mb-2 font-semibold">
                        Expira em: <span className="text-rose-500 font-mono font-bold">{formatTime(pixTimeLeft)}</span>
                      </div>

                      <h5 className="text-xs font-bold text-slate-700">Copie e cole o código para pagar pelo app do seu banco:</h5>
                    </div>

                    <div className="flex gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        readOnly
                        value={pixMockCode}
                        className="w-full text-[10px] text-slate-500 font-mono focus:outline-none border-none bg-transparent select-all"
                      />
                      <button
                        type="button"
                        onClick={copyPixToClipboard}
                        className="p-1 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors flex-shrink-0"
                      >
                        {copiedPix ? (
                          <>
                            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" /> Copiado!
                          </>
                        ) : (
                          <>
                            <Clipboard className="w-3.5 h-3.5" /> Copiar
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 font-medium">
                      * O pedido será confirmado instantaneamente após o pagamento. Nossos robôs emitem atualizações em tempo real assim que o depósito for localizado!
                    </p>
                  </div>
                )}

                {/* 2. Credit Card Layout */}
                {paymentType === 'card' && (
                  <div className="space-y-4 animate-fadeIn">
                    {/* Visual Card Display */}
                    <div className="perspective flex justify-center py-2 h-[155px]">
                      <motion.div
                        initial={false}
                        animate={{ rotateY: isCvvFocused ? 180 : 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="relative w-full max-w-sm rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 p-4 shadow-xl text-white transform-style flex flex-col justify-between"
                      >
                        {/* Front Side */}
                        <div className="absolute inset-0 p-4 flex flex-col justify-between backface-hidden rounded-2xl">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[9px] uppercase tracking-widest text-indigo-200">Cartão Supreme Premium</p>
                              <span className="text-xs font-bold bg-indigo-500/35 px-1.5 py-0.5 rounded shadow">VÍDEO JOGO</span>
                            </div>
                            <span className="text-lg font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-500">VISA</span>
                          </div>

                          <div className="text-lg tracking-widest font-mono text-center my-2">
                            {cardNumber || '•••• •••• •••• ••••'}
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <p className="text-[8px] uppercase text-indigo-300">Titular</p>
                              <p className="font-semibold truncate max-w-xs">{cardName || 'NOME COMPLETO'}</p>
                            </div>
                            <div>
                              <p className="text-[8px] uppercase text-indigo-300">Validade</p>
                              <p className="font-semibold font-mono">{cardExpiry || 'MM/AA'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Back Side */}
                        <div className="absolute inset-0 p-4 bg-gradient-to-br from-indigo-950 to-slate-900 flex flex-col justify-between rotate-y-180 backface-hidden rounded-2xl text-white">
                          <div className="w-full h-8 bg-slate-800 absolute top-4 left-0" />
                          <div className="mt-10 flex justify-end">
                            <div className="bg-slate-100 text-slate-800 text-right font-mono text-xs p-1.5 px-3 rounded italic font-extrabold shadow-inner min-w-[70px]">
                              {cardCvv || '•••'}
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-[8px] text-slate-400">
                            <span>Selo de Segurança Criptográfico</span>
                            <span className="font-bold text-slate-300">SORVETERIA SUPREME</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-0.5">Número do Cartão</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          placeholder="4000 1234 5678 9010"
                          maxLength={19}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-0.5">Nome no Cartão</label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value.toUpperCase())}
                          placeholder="EX: JOAO S SILVA"
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-0.5">Validade (MM/AA)</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            placeholder="12/28"
                            maxLength={5}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-mono text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-0.5">CVV (Cod. Segurança)</label>
                          <input
                            type="text"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                            onFocus={() => setIsCvvFocused(true)}
                            onBlur={() => setIsCvvFocused(false)}
                            placeholder="123"
                            maxLength={4}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-mono text-center"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Cash on Delivery / Card on Delivery */}
                {(paymentType === 'cash_on_delivery' || paymentType === 'card_on_delivery') && (
                  <div className="text-center p-3 animate-fadeIn space-y-1.5">
                    <Check className="w-8 h-8 text-emerald-600 mx-auto" />
                    <h5 className="text-xs font-bold text-emerald-900">
                      Pagamento Realizado no Ato da {deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}
                    </h5>
                    <p className="text-[11px] text-slate-500 leading-normal max-w-sm mx-auto font-medium">
                      O entregador levará a {paymentType === 'cash_on_delivery' ? 'maquininha de cartão' : 'maquininha de débito/crédito ou troco em dinheiro'} até você. <br />
                      Fique atento ao som da campainha e prepare seu celular ou cartão!
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Pricing footer & buttons */}
        <div className="border-t border-rose-50/80 pt-4 mt-4 flex flex-col gap-2 flex-shrink-0">
          <div className="flex justify-between items-center text-xs text-slate-600 font-semibold">
            <span>Subtotal:</span>
            <span>R$ {totalAmount.toFixed(2)}</span>
          </div>
          {deliveryType === 'delivery' && (
            <div className="flex justify-between items-center text-xs text-slate-600 font-semibold">
              <span>Taxa de Entrega:</span>
              <span className="text-rose-500">+ R$ 5.00</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm font-black text-slate-800 border-t border-dashed border-slate-200 pt-1.5">
            <span>Total Geral:</span>
            <span className="text-xl text-rose-600">R$ {finalTotal.toFixed(2)}</span>
          </div>

          <div className="flex gap-2.5 mt-2">
            {step === 2 && (
              <button
                type="button"
                onClick={handlePreviousStep}
                disabled={isSubmitting}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" /> Voltar
              </button>
            )}

            <button
              type="button"
              onClick={step === 1 ? handleNextStep : handleFinishCheckout}
              disabled={isSubmitting}
              className={`flex-1 py-3 px-6 rounded-2xl font-bold shadow-md transition-all flex items-center justify-center gap-2 text-xs text-white ${
                isSubmitting
                  ? 'bg-neutral-400 shadow-none cursor-not-allowed'
                  : 'bg-rose-500 hover:bg-rose-600 shadow-rose-100'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processando...
                </>
              ) : (
                <>
                  {step === 1 ? 'Prosseguir para Pagamento' : 'Confirmar e Finalizar Pedido'}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
