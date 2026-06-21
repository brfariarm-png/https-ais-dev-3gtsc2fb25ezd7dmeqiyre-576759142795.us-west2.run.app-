/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, QrCode, ClipboardCheck, Clipboard, Compass, MapPin, Truck, Check, Wallet, RotateCcw, AlertCircle } from 'lucide-react';
import { User } from 'firebase/auth';
import { CheckoutDetails, PaymentType, CartItem } from '../types';

interface CheckoutProps {
  cartItems: CartItem[];
  totalAmount: number;
  onPlaceOrder: (details: CheckoutDetails) => void;
  onClose: () => void;
  storeAddress?: string;
  currentUser?: User | null;
  onSignIn?: () => Promise<void>;
  deliveryFees?: { 
    neighborhood: string; 
    fee: number; 
    exactCep?: string; 
    cepStart?: string; 
    cepEnd?: string; 
  }[];
  storePhone?: string;
  storeSettings?: any;
}

// CRC16-CCITT implementation for authentic Brazilian PIX QR/Copia e Cola codes
function calcCRC16(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i);
    crc ^= (charCode << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = (crc << 1);
      }
    }
  }
  let hex = (crc & 0xFFFF).toString(16).toUpperCase();
  return hex.padStart(4, '0');
}

// Generate dynamic static BR Code Pix payload based on customized store credentials
function generatePixPayload(key: string, name: string, city: string, amount: number): string {
  const cleanKey = key.replace(/\s+/g, '');
  const cleanName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .substring(0, 25)
    .trim();
  const cleanCity = city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .substring(0, 15)
    .trim();
  const formattedAmount = amount.toFixed(2);

  const gui = "0014br.gov.bcb.pix";
  const keyField = "01" + cleanKey.length.toString().padStart(2, '0') + cleanKey;
  const merchantAccountInfo = gui + keyField;
  
  let payload = "000201"; 
  payload += "26" + merchantAccountInfo.length.toString().padStart(2, '0') + merchantAccountInfo;
  payload += "52040000"; 
  payload += "5303986"; 
  payload += "54" + formattedAmount.length.toString().padStart(2, '0') + formattedAmount; 
  payload += "5802BR"; 
  payload += "59" + cleanName.length.toString().padStart(2, '0') + cleanName; 
  payload += "60" + cleanCity.length.toString().padStart(2, '0') + cleanCity; 
  payload += "62070503***"; 
  payload += "6304"; 

  const crc = calcCRC16(payload);
  return payload + crc;
}

export default function Checkout({ 
  cartItems, 
  totalAmount, 
  onPlaceOrder, 
  onClose, 
  storeAddress, 
  currentUser, 
  onSignIn, 
  deliveryFees, 
  storePhone,
  storeSettings
}: CheckoutProps) {
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Delivery info, Step 2: Payment
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sendToWhatsApp, setSendToWhatsApp] = useState(true);
  
  // Address info
  const [cep, setCep] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const [cepDiagnostic, setCepDiagnostic] = useState<string[]>([]);

  const formatCep = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 8);
    if (raw.length > 5) {
      return `${raw.slice(0, 5)}-${raw.slice(5)}`;
    }
    return raw;
  };

  const lookupCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setCepError('CEP deve conter 8 dígitos.');
      return;
    }

    setLoadingCep(true);
    setCepError('');
    setCepDiagnostic([]);
    const diag: string[] = [];
    diag.push(`👉 Iniciando busca pelo CEP ${cepValue} (Limpo: ${cleanCep})`);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) throw new Error('Falha ao buscar CEP.');
      const data = await response.json();
      
      if (data.erro) {
        setCepError('CEP não cadastrado nos Correios.');
        diag.push(`❌ CEP inválido ou não encontrado nos Correios.`);
        setCepDiagnostic(diag);
        return;
      }

      setStreet(data.logradouro || '');
      if (data.localidade) {
        setCity(data.localidade);
      }
      
      diag.push(`✅ Correios retornou: Rua: "${data.logradouro || ''}", Bairro: "${data.bairro || ''}", Cidade: "${data.localidade || ''}"`);

      const foundBairro = (data.bairro || '').trim();
      if (foundBairro) {
        diag.push(`Bairro identificado: "${foundBairro}"`);
      } else {
        diag.push(`Aviso: Logradouro de Correios não retornou bairro direto.`);
      }

      if (deliveryFees && deliveryFees.length > 0) {
        diag.push(`Avaliando as ${deliveryFees.length} regras de entrega cadastradas no painel...`);
        
        // Check for a CEP-based delivery fee match first (exact or range)
        let matchedCepFee = deliveryFees.find(df => {
          if (!df.exactCep) return false;
          const exactClean = df.exactCep.replace(/\D/g, '');
          const isMatch = exactClean === cleanCep;
          diag.push(`🔍 CEP Exato: DB "${df.exactCep}" (${exactClean}) VS digitado "${cleanCep}" -> ${isMatch ? '✅ MATCH!' : '❌ Diferente'}`);
          return isMatch;
        });

        if (!matchedCepFee) {
          diag.push(`CEP exato não correspondido. Verificando faixas/blocos de CEP...`);
          matchedCepFee = deliveryFees.find(df => {
            const startStr = (df.cepStart || '').replace(/\D/g, '').padEnd(8, '0');
            const endStr = (df.cepEnd || '').replace(/\D/g, '').padEnd(8, '9');
            if (!startStr || !endStr || startStr.length < 5 || endStr.length < 5) return false;

            const clientNum = parseInt(cleanCep, 10);
            const startNum = parseInt(startStr, 10);
            const endNum = parseInt(endStr, 10);

            const isMatch = !isNaN(clientNum) && !isNaN(startNum) && !isNaN(endNum) && clientNum >= startNum && clientNum <= endNum;
            diag.push(`🔍 Bloco CEP Bairro "${df.neighborhood}": DB [${df.cepStart} (${startStr}) até ${df.cepEnd} (${endStr})] VS digitado "${cleanCep}" -> ${isMatch ? '✅ MATCH!' : '❌ Fora'}`);
            return isMatch;
          });
        }

        if (matchedCepFee) {
          diag.push(`🎉 Sucesso! Regra de CEP correspondida. Bairro: "${matchedCepFee.neighborhood}" (Taxa: R$ ${matchedCepFee.fee.toFixed(2)})`);
          setNeighborhood(matchedCepFee.neighborhood);
        } else if (foundBairro) {
          diag.push(`Nenhuma regra de CEP exato ou faixa foi correspondida. Verificando regras baseadas no nome do Bairro...`);
          const matched = deliveryFees.find(
            (df) => {
              const isMatch = df.neighborhood.trim().toLowerCase() === foundBairro.toLowerCase();
              diag.push(`🔍 Nome do Bairro: DB "${df.neighborhood}" VS Correios "${foundBairro}" -> ${isMatch ? '✅ MATCH!' : '❌ Diferente'}`);
              return isMatch;
            }
          );
          if (matched) {
            diag.push(`🎉 Encontrado por Nome de Bairro exato! Bairro: "${matched.neighborhood}" (Taxa: R$ ${matched.fee.toFixed(2)})`);
            setNeighborhood(matched.neighborhood);
          } else {
            diag.push(`Bairro exato não encontrado. Tentando aproximação parcial do nome...`);
            const partialMatched = deliveryFees.find(
              (df) => {
                const dbBairro = df.neighborhood.trim().toLowerCase();
                const findBairro = foundBairro.toLowerCase();
                const isMatch = findBairro.includes(dbBairro) || dbBairro.includes(findBairro);
                diag.push(`   Aproximação: DB "${df.neighborhood}" VS Correios "${foundBairro}" -> ${isMatch ? '✅ MATCH!' : '❌ Diferente'}`);
                return isMatch;
              }
            );
            if (partialMatched) {
              diag.push(`🎉 Encontrado por aproximação de Bairro! Bairro: "${partialMatched.neighborhood}" (Taxa: R$ ${partialMatched.fee.toFixed(2)})`);
              setNeighborhood(partialMatched.neighborhood);
            } else {
              diag.push(`❌ Nenhum mapeamento de CEP ou Bairro correspondido.`);
              setNeighborhood('');
              setCepError(`Bairro ${foundBairro} não cadastrado nas taxas de entrega. Selecione abaixo.`);
            }
          }
        } else {
          diag.push(`❌ CEP Geral/Único verificado de cidade com CEP Único e nenhuma regra de CEP exato/bloco correspondente.`);
          setNeighborhood('');
          setCepError(`Nenhuma taxa de entrega correspondente ao CEP digitado. Por favor, selecione a região correta no campo Bairro abaixo.`);
        }
      } else {
        diag.push(`Aviso: Nenhuma regra de entrega cadastrada. Adicionando o bairro direto.`);
        setNeighborhood(foundBairro || 'Centro');
      }
    } catch (err) {
      console.error(err);
      setCepError('Erro ao carregar endereço. Preencha manualmente.');
      diag.push(`💥 Erro crítico: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoadingCep(false);
      setCepDiagnostic(diag);
      console.log("=== DIAGNÓSTICO DE CEP ===", diag.join("\n"));
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
    setCepError('');
    if (formatted.replace(/\D/g, '').length === 8) {
      lookupCep(formatted);
    }
  };

  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState(storeSettings?.city || 'Monte Mor'); // default city
  const [reference, setReference] = useState('');

  // Payment filtering based on storeSettings toggles
  const paymentMethods = useMemo(() => {
    return [
      { id: 'pix', label: 'Pix Online', enabled: storeSettings?.paymentPixEnabled !== false },
      { id: 'card', label: 'Cartão de Crédito', enabled: storeSettings?.paymentCardEnabled !== false },
      { id: 'cash_on_delivery', label: 'Dinheiro na Entrega', enabled: storeSettings?.paymentCashDeliveryEnabled !== false },
      { id: 'card_on_delivery', label: 'Cartão na Entrega', enabled: storeSettings?.paymentCardDeliveryEnabled !== false },
    ].filter(m => m.enabled);
  }, [storeSettings]);

  // Payment info
  const [paymentType, setPaymentType] = useState<PaymentType>('pix');
  const [cashChange, setCashChange] = useState('');

  // Fallback to first available payment method if previous is disabled
  useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethods.find(m => m.id === paymentType)) {
      setPaymentType(paymentMethods[0].id as PaymentType);
    }
  }, [paymentMethods, paymentType]);

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

  // Autofill name from Firebase User
  useEffect(() => {
    if (currentUser && !customerName) {
      setCustomerName(currentUser.displayName || '');
    }
  }, [currentUser]);

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

  const selectedNeighborhoodObj = useMemo(() => {
    if (!deliveryFees) {
      console.log("⚠️ [Fee Calculator] Nenhuma taxa de entrega configurada.");
      return undefined;
    }
    const cleanCep = cep ? cep.replace(/\D/g, '') : '';
    console.log(`📊 [Fee Calculator] Calculando taxa de entrega. CEP: "${cleanCep}" (limpo), Bairro: "${neighborhood}"`);
    
    if (cleanCep && cleanCep.length === 8) {
      // 1. Match exact CEP
      const exactMatch = deliveryFees.find(df => {
        if (!df.exactCep) return false;
        const exactClean = df.exactCep.replace(/\D/g, '');
        const isMatch = exactClean === cleanCep;
        console.log(`   - Comparando CEP Exato: DB "${df.exactCep}" (${exactClean}) VS CEP "${cleanCep}" -> ${isMatch ? '✅ MATCH' : '❌ Diferente'}`);
        return isMatch;
      });
      if (exactMatch) {
        console.log(`🎉 [Fee Calculator] Coincidência de CEP Exato encontrada para o bairro "${exactMatch.neighborhood}" com taxa de R$ ${exactMatch.fee}`);
        return exactMatch;
      }

      // 2. Match CEP range
      const rangeMatch = deliveryFees.find(df => {
        const startStr = (df.cepStart || '').replace(/\D/g, '').padEnd(8, '0');
        const endStr = (df.cepEnd || '').replace(/\D/g, '').padEnd(8, '9');
        if (!startStr || !endStr || startStr.length < 5 || endStr.length < 5) return false;

        const clientNum = parseInt(cleanCep, 10);
        const startNum = parseInt(startStr, 10);
        const endNum = parseInt(endStr, 10);

        const isMatch = !isNaN(clientNum) && !isNaN(startNum) && !isNaN(endNum) && clientNum >= startNum && clientNum <= endNum;
        console.log(`   - Comparando Bloco CEP Bairro "${df.neighborhood}": DB [${df.cepStart} (${startStr}) até ${df.cepEnd} (${endStr})] VS CEP "${cleanCep}" -> ${isMatch ? '✅ MATCH' : '❌ Fora da faixa'}`);
        return isMatch;
      });
      if (rangeMatch) {
        console.log(`🎉 [Fee Calculator] Coincidência de Bloco CEP encontrada para o bairro "${rangeMatch.neighborhood}" com taxa de R$ ${rangeMatch.fee}`);
        return rangeMatch;
      }
    }

    // 3. Match neighborhood
    const neighborhoodMatch = deliveryFees.find(
      (item) => {
        const isMatch = item.neighborhood.trim().toLowerCase() === neighborhood.trim().toLowerCase();
        console.log(`   - Comparando Bairro: DB "${item.neighborhood}" VS Selecionado "${neighborhood}" -> ${isMatch ? '✅ MATCH' : '❌ Diferente'}`);
        return isMatch;
      }
    );
    if (neighborhoodMatch) {
      console.log(`🎉 [Fee Calculator] Coincidência de Nome de Bairro encontrada para "${neighborhoodMatch.neighborhood}" com taxa de R$ ${neighborhoodMatch.fee}`);
    } else {
      console.log(`⚠️ [Fee Calculator] Nenhuma correspondência de CEP ou Bairro. Taxa padrão de R$ 5,00 será aplicada.`);
    }
    return neighborhoodMatch;
  }, [deliveryFees, neighborhood, cep]);

  const deliveryFee = deliveryType === 'delivery'
    ? (selectedNeighborhoodObj ? selectedNeighborhoodObj.fee : 5.00)
    : 0.00;
  const finalTotal = totalAmount + deliveryFee;

  // Generate suggestions and calculations for cash change
  const cashChangeSuggestions = useMemo(() => {
    const list: number[] = [];
    const nextMultipleOf5 = Math.ceil(finalTotal / 5) * 5;
    if (nextMultipleOf5 > finalTotal && nextMultipleOf5 !== finalTotal) {
      list.push(nextMultipleOf5);
    }
    const nextMultipleOf10 = Math.ceil(finalTotal / 10) * 10;
    if (nextMultipleOf10 > finalTotal && !list.includes(nextMultipleOf10)) {
      list.push(nextMultipleOf10);
    }
    const standardNotes = [10, 20, 50, 100, 200];
    for (const note of standardNotes) {
      if (note > finalTotal && !list.includes(note)) {
        list.push(note);
      }
    }
    return list.sort((a, b) => a - b).slice(0, 3);
  }, [finalTotal]);

  const changeCalculation = useMemo(() => {
    if (!cashChange) return null;
    const clean = cashChange.toLowerCase().trim();
    if (clean.includes('sem') || clean.includes('não') || clean.includes('nao') || clean === 'exato') {
      return { isExact: true, change: 0, text: 'Sem troco (Levar valor exato)' };
    }
    const match = cashChange.replace('R$', '').replace(/\s+/g, '').replace(',', '.').match(/[\d.]+/);
    if (match) {
      const val = parseFloat(match[0]);
      if (!isNaN(val)) {
        if (Math.abs(val - finalTotal) < 0.01) {
          return { isExact: true, change: 0, text: 'Sem troco (Valor exato)' };
        }
        if (val > finalTotal) {
          return { isExact: false, paid: val, change: val - finalTotal, text: `Troco de R$ ${(val - finalTotal).toFixed(2)}` };
        }
        return { isExact: false, paid: val, change: 0, isLess: true, text: `Atenção: R$ ${val.toFixed(2)} é menor que R$ ${finalTotal.toFixed(2)}!` };
      }
    }
    return null;
  }, [cashChange, finalTotal]);

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
        cep: cep.trim() || undefined,
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
      
      if (sendToWhatsApp && storePhone) {
        const finalTotal = totalAmount + deliveryFee;
        
        const itemsText = cartItems.map(item => {
          const itemPrice = item.customCupPrice || item.menuItem.price;
          const itemInfo = `• *${item.quantity}x ${item.menuItem.name}* (R$ ${(itemPrice).toFixed(2)})`;
          const itemDesc = item.menuItem.description ? `\n   _${item.menuItem.description}_` : '';
          const notesStr = item.notes ? `\n   *Obs:* ${item.notes}` : '';
          return `${itemInfo}${itemDesc}${notesStr}`;
        }).join('\n\n');

        const addressText = deliveryType === 'delivery' 
          ? `📍 *Endereço de Entrega:*\n   ${street}, ${number} - ${neighborhood}, ${city}${cep ? ` (CEP: ${cep})` : ''}${reference ? `\n   *Ref:* ${reference}` : ''}`
          : `📍 *Retirada no Balcão*`;

        const paymentText = paymentType === 'pix' ? 'Pix ⚡'
                          : paymentType === 'cash_on_delivery' ? `Dinheiro 💵${cashChange ? ` (Troco para ${cashChange})` : ''}`
                          : paymentType === 'card_on_delivery' ? 'Maquininha de Cartão na Entrega 💳'
                          : 'Cartão de Crédito Online 💳';

        const waText = `🍨 *NOVO PEDIDO CONFIRMADO* 🍨\n\n` +
                       `👤 *Cliente:* ${customerName}\n` +
                       `📞 *WhatsApp:* ${customerPhone}\n\n` +
                       `🛍️ *Itens do Pedido:*\n${itemsText}\n\n` +
                       `🛵 *Taxa de Entrega:* R$ ${deliveryFee.toFixed(2)}\n` +
                       `💰 *Total Geral:* R$ ${finalTotal.toFixed(2)}\n\n` +
                       `💳 *Forma de Pagamento:* ${paymentText}\n\n` +
                       `${addressText}\n\n` +
                       `🤖 _Enviado via Cardápio Online Supreme_`;

        const cleanPhone = storePhone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(waText)}`;
        
        window.open(waUrl, '_blank');
      }

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

  // Dynamic Pix code generator based on custom settings or defaults
  const pixMockCode = useMemo(() => {
    const key = storeSettings?.pixKey || 'contato@sorveteriasupreme.com.br';
    const name = storeSettings?.pixReceiverName || 'Sorveteria Supreme';
    const city = storeSettings?.pixReceiverCity || 'Monte Mor';
    return generatePixPayload(key, name, city, finalTotal);
  }, [storeSettings, finalTotal]);

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

              {/* Firebase Authentication sync info banner */}
              <div className="mt-2.5">
                {currentUser !== undefined && !currentUser ? (
                  <div className="bg-amber-50 border border-amber-200/50 p-4 rounded-2xl text-[11px] text-amber-800 leading-relaxed font-semibold flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex flex-col gap-1 flex-1">
                      <span>Dica: Ative seu SUPREME ID com a conta Google para salvar este pedido na nuvem e rastrear a entrega em tempo real de qualquer celular!</span>
                      <span className="text-[10px] text-amber-700/80 font-bold block">(Opcional: se o login for bloqueado no seu celular, basta preencher os dados abaixo para pedir como Visitante!)</span>
                    </div>
                    <button
                      type="button"
                      onClick={onSignIn}
                      className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-amber-950 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                    >
                      Ativar SUPREME ID
                    </button>
                  </div>
                ) : currentUser ? (
                  <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl text-[11px] text-emerald-800 leading-normal font-semibold flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Conectado via <strong className="font-extrabold">SUPREME ID</strong> ({currentUser.displayName || currentUser.email}). Seu pedido será sincronizado e guardado no Firebase de forma totalmente segura.</span>
                  </div>
                ) : null}
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

                  {/* CEP Lookup input */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs space-y-1 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                      <span>Buscar CEP (Correios)</span>
                      {loadingCep ? (
                        <span className="text-rose-500 text-[9px] animate-pulse lowercase font-bold">
                          Buscando dados...
                        </span>
                      ) : (
                        <a 
                          href="https://buscacepinter.correios.com.br/app/endereco/index.php" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-rose-500 hover:underline text-[9.5px] font-black normal-case flex items-center gap-0.5 transition-all"
                        >
                          Não sei meu CEP 🔍
                        </a>
                      )}
                    </label>
                    <div className="relative flex gap-1.5">
                      <input
                        type="text"
                        value={cep}
                        onChange={handleCepChange}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50/50 font-bold text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => lookupCep(cep)}
                        disabled={loadingCep || cep.replace(/\D/g, '').length !== 8}
                        className="px-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed select-none active:scale-97"
                      >
                        Buscar
                      </button>
                    </div>
                    {cepError ? (
                      <p className="text-[9px] text-rose-600 font-extrabold mt-0.5">{cepError}</p>
                    ) : (
                      <p className="text-[8.5px] text-slate-400 font-medium mt-0.5">
                        Ao digitar o CEP, os dados de rua, bairro e cidade se preenchem automaticamente.
                      </p>
                    )}

                    {/* Visual CEP Diagnostics Box */}
                    {cepDiagnostic.length > 0 && (
                      <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 animate-fadeIn">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-500 tracking-wider">
                          <span>🔍 Rastreamento Diagnóstico do CEP</span>
                          <button 
                            type="button" 
                            onClick={() => setCepDiagnostic([])}
                            className="text-rose-500 hover:text-rose-700 font-extrabold normal-case"
                          >
                            Fechar
                          </button>
                        </div>
                        <div className="max-h-32 overflow-y-auto font-mono text-[8.5px] text-slate-600 space-y-0.5 leading-relaxed bg-white/80 p-2 rounded-lg border border-slate-100 invite-y divide-slate-100/50">
                          {cepDiagnostic.map((line, idx) => {
                            let textClass = "text-slate-650";
                            if (line.includes("✅") || line.includes("🎉")) textClass = "text-emerald-600 font-bold";
                            if (line.includes("❌") || line.includes("💥")) textClass = "text-rose-600 font-bold";
                            if (line.includes("👉") || line.includes("🔍")) textClass = "text-indigo-600 font-semibold";
                            return (
                              <div key={idx} className={`py-1 ${textClass}`}>
                                {line}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

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
                      {deliveryFees && deliveryFees.length > 0 ? (
                        <select
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium animate-fadeIn outline-none"
                        >
                          <option value="">Selecione...</option>
                          {deliveryFees.map((df, idx) => (
                            <option key={idx} value={df.neighborhood}>
                              {df.neighborhood} (R$ {df.fee.toFixed(2)})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value)}
                          placeholder="Ex: Centro"
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium animate-fadeIn"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Cidade</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Ex: Monte Mor"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium text-slate-800 animate-fadeIn"
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
                    <span className="font-bold text-amber-900 shadow-sm">{storeAddress || "Av. General Carneiro, 1205 - Vila Lucy - Monte Mor/SP"}</span>. <br />
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
                  {paymentMethods.map(method => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentType(method.id as PaymentType)}
                      className={`py-3.5 px-4 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2.5 transition-all outline-none cursor-pointer ${
                        paymentType === method.id
                          ? method.id === 'pix' ? 'border-emerald-500 bg-emerald-50/60 text-emerald-800 shadow-sm'
                            : method.id === 'card' ? 'border-indigo-500 bg-indigo-50/60 text-indigo-800 shadow-sm'
                            : 'border-rose-500 bg-rose-50/60 text-rose-800 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 text-slate-600'
                      }`}
                    >
                      {method.id === 'pix' ? <QrCode className="w-4 h-4 text-emerald-600" />
                       : method.id === 'card' ? <CreditCard className="w-4 h-4 text-indigo-600" />
                       : method.id === 'cash_on_delivery' ? <Wallet className="w-4 h-4 text-rose-600" />
                       : <CreditCard className="w-4 h-4 text-rose-600" />}
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-form based on selection */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                {/* 1. Pix Layout */}
                {paymentType === 'pix' && (
                  <div className="space-y-4 text-center animate-fadeIn">
                    <div className="flex flex-col items-center">
                      <div className="bg-white p-3 rounded-2xl shadow-md border border-neutral-100 mb-2 relative flex items-center justify-center w-48 h-48 mx-auto">
                        {/* Dynamic QR code linked to custom Pix payload */}
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixMockCode)}`}
                          alt="QR Code Pix"
                          className="w-40 h-40 object-contain rounded-lg select-none"
                          referrerPolicy="no-referrer"
                        />
                        
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-[0.5px] items-center justify-center flex flex-col rounded-2xl opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-[10px] font-black bg-emerald-600 text-white rounded-full px-2.5 py-1 shadow flex items-center gap-1 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            QR Code Real Ativo
                          </span>
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
                     {/* PagSeguro Security & Integration Banners */}
                     {storeSettings?.pagseguroEnabled ? (
                       <div className="border border-emerald-100 bg-emerald-50/40 p-3.5 rounded-2xl space-y-1.5 text-left mb-3">
                         <div className="flex items-center gap-1.5 text-emerald-800">
                           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                           <h4 className="text-xs font-black uppercase tracking-wider">🛡️ Ambiente Seguro PagSeguro Ativo</h4>
                         </div>
                         <p className="text-[10.5px] text-emerald-850 font-semibold leading-relaxed">
                           Sua transação de <span className="font-bold text-emerald-900">R$ {finalTotal.toFixed(2)}</span> está protegida por criptografia de ponta e será processada instantaneamente diretamente pelo PagSeguro.
                         </p>
                         
                         {(!storeSettings?.pagseguroEmail || !storeSettings?.pagseguroToken) && (
                           <div className="border-t border-emerald-150 pt-2 mt-1.5">
                             <div className="bg-amber-50 border border-amber-200/65 p-2 rounded-xl text-[9px] text-amber-800 font-bold leading-normal">
                               ⚠️ <strong>Nota para o Lojista:</strong> Para aceitar pagamentos de cartões reais de clientes direto na sua conta bancária, lembre-se de salvar seu <strong>E-mail</strong> e <strong>Token PagSeguro</strong> na guia de Pagamentos no Painel Administrativo!
                             </div>
                           </div>
                         )}
                       </div>
                     ) : (
                       <div className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-2xl space-y-1 text-left mb-3">
                         <div className="flex items-center gap-1.5 text-slate-705">
                           <Check className="w-3.5 h-3.5 text-slate-500" />
                           <h4 className="text-xs font-extrabold uppercase tracking-wide">Pagar no Cartão de Crédito</h4>
                         </div>
                         <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                           Por padrão, envie o pedido para liberação e pague na maquininha física na entrega. 
                           <br />
                           💡 <strong>Dica:</strong> Se você é o dono da loja, pode ativar o <strong>Recebimento Autônomo Online por Cartão</strong> conectando sua conta <strong>PagSeguro</strong> no Painel Admin!
                         </p>
                       </div>
                     )}

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
                      O entregador levará {paymentType === 'cash_on_delivery' ? 'o troco em dinheiro' : 'a maquininha de cartão'} até você. <br />
                      Fique atento ao som da campainha e prepare seu celular ou cartão!
                    </p>
                    
                    {paymentType === 'cash_on_delivery' && (
                      <div className="mt-3 text-left max-w-sm mx-auto space-y-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-500">
                          <span>Total do Pedido:</span>
                          <span className="text-xs text-rose-600 font-extrabold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                            R$ {finalTotal.toFixed(2)}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wide font-black">
                            Precisa de Troco? (Se sim, para quanto?)
                          </label>
                          <input
                            type="text"
                            value={cashChange}
                            onChange={(e) => setCashChange(e.target.value)}
                            placeholder="Ex: Troco para R$ 50,00 ou sem troco"
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-bold text-slate-800"
                          />
                        </div>

                        {/* Quick Action Suggestion Chips */}
                        <div className="space-y-1">
                          <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Atalhos rápidos:</span>
                          <div className="flex flex-wrap gap-1.5 font-sans">
                            <button
                              type="button"
                              onClick={() => setCashChange('Sem troco')}
                              className={`text-[9.5px] px-2.5 py-1.5 font-bold rounded-lg border transition-all cursor-pointer ${
                                cashChange.toLowerCase().includes('sem')
                                  ? 'bg-rose-500 border-rose-500 text-white shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-705 hover:bg-slate-50'
                              }`}
                            >
                              💵 Sem Troco
                            </button>
                            {cashChangeSuggestions.map((noteVal) => {
                              const noteLabel = `Troco para R$ ${noteVal.toFixed(2)}`;
                              const isSelected = cashChange.includes(String(noteVal)) || cashChange === noteLabel;
                              return (
                                <button
                                  key={noteVal}
                                  type="button"
                                  onClick={() => setCashChange(`Troco para R$ ${noteVal.toFixed(2)}`)}
                                  className={`text-[9.5px] px-2.5 py-1.5 font-bold rounded-lg border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-rose-500 border-rose-500 text-white shadow-xs'
                                      : 'bg-white border-slate-205 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  💳 R$ {noteVal}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Dynamic Live Change feedback block with calculated sum */}
                        {changeCalculation && (
                          <div className={`p-2.5 rounded-xl text-[10px] font-bold border flex items-center justify-between gap-2 mt-1 animate-fadeIn ${
                            changeCalculation.isLess
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}>
                            <span className="font-extrabold uppercase tracking-wide">Calculadora:</span>
                            <span className="bg-white/70 px-2 py-0.5 rounded font-black border border-white">
                              {changeCalculation.text}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* WhatsApp Checkout Preferences (Only in Step 2) */}
        {step === 2 && (
          <div className="bg-emerald-50/40 p-3 rounded-2xl border border-emerald-100/60 flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-lg">💬</span>
              <div>
                <h5 className="text-[11.5px] font-black text-emerald-950">Enviar pedido p/ WhatsApp</h5>
                <p className="text-[9.5px] text-emerald-800 font-medium leading-tight">Abre o seu WhatsApp com a mensagem do pedido pronta ao finalizar!</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={sendToWhatsApp} 
                onChange={(e) => setSendToWhatsApp(e.target.checked)}
                className="w-4.5 h-4.5 text-emerald-600 rounded-md accent-emerald-550 focus:ring-emerald-500 cursor-pointer"
              />
            </label>
          </div>
        )}

        {/* Pricing footer & buttons */}
        <div className="border-t border-rose-50/80 pt-4 mt-4 flex flex-col gap-2 flex-shrink-0">
          <div className="flex justify-between items-center text-xs text-slate-600 font-semibold">
            <span>Subtotal:</span>
            <span>R$ {totalAmount.toFixed(2)}</span>
          </div>
          {deliveryType === 'delivery' && (
            <div className="flex justify-between items-center text-xs text-slate-600 font-semibold">
              <span>Taxa de Entrega:</span>
              <span className="text-rose-500">+ R$ {deliveryFee.toFixed(2)}</span>
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
