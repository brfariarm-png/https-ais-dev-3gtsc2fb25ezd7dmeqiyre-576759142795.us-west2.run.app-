/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Phone, DollarSign, Check, X, Printer, Sparkles, AlertCircle } from 'lucide-react';
import { MenuItem, ToppingOption, FlavorOption, CartItem, Order, OrderStatus, PaymentType, CustomCupConfig } from '../types';
import { MENU_ITEMS, FLAVOR_OPTIONS, TOPPING_OPTIONS, getCustomCupBasePrice } from '../data';

interface AdminPDVProps {
  onPlacePDVOrder: (order: Order, shouldPrint: boolean) => Promise<void>;
  storeSettings: any;
  menuItems?: MenuItem[];
}

export default function AdminPDV({ onPlacePDVOrder, storeSettings, menuItems }: AdminPDVProps) {
  // POS Cart State
  const [pdvCart, setPdvCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'acai' | 'sorvete' | 'milkshake' | 'sundae'>('all');

  // Customer Details for Checkout
  const [customerName, setCustomerName] = useState('Cliente Balcão');
  const [customerPhone, setCustomerPhone] = useState('Não informado');
  const [paymentType, setPaymentType] = useState<PaymentType>('cash_on_delivery'); // We use cash_on_delivery for Dinheiro no Balcão
  const [cashReceived, setCashReceived] = useState('');
  const [initialStatus, setInitialStatus] = useState<OrderStatus>('completed'); // Default is completed for instant cashier checkout
  const [generalNotes, setGeneralNotes] = useState('');

  // Customizable Cup Modal state
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customSize, setCustomSize] = useState<'300ml' | '400ml' | '500ml' | '700ml'>('300ml');
  const [customBase, setCustomBase] = useState<'acai' | 'sorvete' | 'casadinho'>('acai');
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [itemSpecificNotes, setItemSpecificNotes] = useState('');

  // Custom Quick / Manual item insertion (for custom items sold over counter)
  const [isQuickItemOpen, setIsQuickItemOpen] = useState(false);
  const [quickItemName, setQuickItemName] = useState('');
  const [quickItemPrice, setQuickItemPrice] = useState('');

  // Filtering Menu Items
  const filteredProducts = useMemo(() => {
    const list = menuItems && menuItems.length > 0 ? menuItems : MENU_ITEMS;
    return list.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory, menuItems]);

  // PDV Cart totals
  const cartSubtotal = useMemo(() => {
    return pdvCart.reduce((acc, item) => {
      const price = item.isCustomCup ? (item.customCupPrice || 0) : item.menuItem.price;
      return acc + price * item.quantity;
    }, 0);
  }, [pdvCart]);

  // Calculate change (troco)
  const changeValue = useMemo(() => {
    if (!cashReceived || isNaN(Number(cashReceived))) return 0;
    const diff = Number(cashReceived) - cartSubtotal;
    return diff > 0 ? diff : 0;
  }, [cashReceived, cartSubtotal]);

  // Quick prepopulated note tags for fast tapping
  const fastNotes = [
    'Mandar Separado',
    'Retire Leite Condensado',
    'Retire Leite em Pó',
    'Mandar Calda Separada',
    'Sem Granola',
    'Adicional de Morango',
    'Colocar granola no fundo'
  ];

  // Add standard product directly to PDV cart
  const handleAddDirect = (item: MenuItem) => {
    setPdvCart((prev) => {
      const existing = prev.find((x) => x.menuItem.id === item.id && !x.isCustomCup);
      if (existing) {
        return prev.map((x) => 
          x.id === existing.id ? { ...x, quantity: x.quantity + 1 } : x
        );
      }
      return [
        ...prev,
        {
          id: `pdv-item-${Date.now()}-${item.id}`,
          menuItem: item,
          quantity: 1,
        }
      ];
    });
  };

  // Open modal config for customizable cup
  const handleStartCustomizing = (item: MenuItem) => {
    setCustomizingItem(item);
    setCustomSize('300ml');
    setCustomBase(item.category === 'acai' ? 'acai' : 'sorvete');
    setSelectedFlavors([]);
    setSelectedToppings([]);
    setItemSpecificNotes('');
  };

  // Confirm and add customized cup to cart
  const handleConfirmCustomCup = () => {
    if (!customizingItem) return;

    // Base price based on size
    const basePrice = getCustomCupBasePrice(customSize);
    
    // Add additional toppings cost
    const toppingsCost = selectedToppings.reduce((acc, tid) => {
      const top = TOPPING_OPTIONS.find((t) => t.id === tid);
      return acc + (top?.price || 0);
    }, 0);

    const calculatedPrice = basePrice + toppingsCost;

    const customizationObj: CustomCupConfig = {
      size: customSize,
      base: customBase,
      flavors: selectedFlavors,
      toppings: selectedToppings
    };

    setPdvCart((prev) => [
      ...prev,
      {
        id: `pdv-custom-${Date.now()}`,
        menuItem: {
          ...customizingItem,
          name: `${customizingItem.name} (${customSize})`,
          price: calculatedPrice
        },
        quantity: 1,
        isCustomCup: true,
        customCupConfig: customizationObj,
        customCupPrice: calculatedPrice,
        notes: itemSpecificNotes
      }
    ]);

    setCustomizingItem(null);
  };

  // Add unique manual/quick item to cart (e.g. customized request not in database)
  const handleAddQuickItem = () => {
    if (!quickItemName || !quickItemPrice || isNaN(Number(quickItemPrice))) {
      alert("Por favor insira um nome válido e preço válido para o item.");
      return;
    }

    const priceNum = Math.abs(Number(quickItemPrice));
    const mockMenuItem: MenuItem = {
      id: `manual-${Date.now()}`,
      name: `[Balcão] ${quickItemName}`,
      description: 'Item avulso inserido diretamente pelo operador do Caixa',
      price: priceNum,
      category: 'combo',
      image: '/assets/images/supreme_acai_cup_1781179584520.jpg'
    };

    setPdvCart((prev) => [
      ...prev,
      {
        id: `pdv-manual-${Date.now()}`,
        menuItem: mockMenuItem,
        quantity: 1,
        notes: ''
      }
    ]);

    setQuickItemName('');
    setQuickItemPrice('');
    setIsQuickItemOpen(false);
  };

  // Adjust quantities
  const handleUpdateQty = (id: string, delta: number) => {
    setPdvCart((prev) =>
      prev
        .map((x) => (x.id === id ? { ...x, quantity: x.quantity + delta } : x))
        .filter((x) => x.quantity > 0)
    );
  };

  // Remove item
  const handleRemoveItem = (id: string) => {
    setPdvCart((prev) => prev.filter((x) => x.id !== id));
  };

  // Handle final checkout submit
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePDVSubmit = async (shouldPrint: boolean) => {
    if (pdvCart.length === 0) {
      alert("Seu carrinho do PDV está vazio! Adicione itens primeiro.");
      return;
    }

    setIsSubmitting(true);
    const orderId = `ord-pdv-${Date.now()}`;
    
    // Create detailed notes block if they added general notes
    const itemsWithGeneralNotes = pdvCart.map((item, idx) => {
      // If cashier filled details or separation notes, attach it to the first item or let it reside as is
      if (idx === 0 && generalNotes) {
        return {
          ...item,
          notes: item.notes ? `${item.notes} | ${generalNotes}` : generalNotes
        };
      }
      return item;
    });

    const newOrder: Order = {
      id: orderId,
      items: itemsWithGeneralNotes,
      total: cartSubtotal,
      status: initialStatus,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      details: {
        customerName: customerName.trim() || 'Cliente de Balcão',
        customerPhone: customerPhone.trim() || 'Balcão / Interno',
        deliveryType: 'pickup', // This counts as over the counter pickup
        address: {
          street: 'Balcão da Loja',
          number: 'S/N',
          neighborhood: 'Atendimento no Balcão',
          city: storeSettings?.city || 'Monte Mor',
          reference: 'Frente de Caixa (PDV) 👑'
        },
        paymentType: paymentType
      }
    };

    try {
      await onPlacePDVOrder(newOrder, shouldPrint);
      // Reset cart and checkout values on success
      setPdvCart([]);
      setCustomerName('Cliente Balcão');
      setCustomerPhone('Não informado');
      setCashReceived('');
      setGeneralNotes('');
      alert(`🎉 Venda de R$ ${cartSubtotal.toFixed(2)} finalizada com sucesso no caixa!`);
    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro ao registrar a venda no caixa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 rounded-3xl border border-slate-150 overflow-hidden shadow-md text-left">
      
      {/* Visual State Title */}
      <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-rose-500 rounded-xl">
            <ShoppingCart className="w-5 h-5 text-white" />
          </span>
          <div>
            <h3 className="font-extrabold text-base uppercase tracking-wider font-sans">Módulo PDV (Cupom de Venda Balcão)</h3>
            <p className="text-[10px] text-zinc-400">Lance pedidos feitos diretamente na loja física de forma instantânea</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQuickItemOpen(true)}
            className="bg-rose-500 hover:bg-rose-600 transition-colors px-3.5 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wide cursor-pointer flex items-center gap-1 text-white shadow-md shadow-rose-950/20"
          >
            ➕ Item Avulso / Manual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        
        {/* LEFT COLUMN: PRODUCT SELECTION GRID (COL-8) */}
        <div className="lg:col-span-7 p-5 space-y-4">
          
          {/* Search & Category tabs */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar delícia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
              />
            </div>
            
            {/* Category selection */}
            <div className="flex gap-1 bg-slate-200/60 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
              {(['all', 'acai', 'sorvete', 'milkshake', 'sundae'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[9px] uppercase px-2.5 py-1.5 rounded-lg font-black tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat ? 'bg-white text-rose-650 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {cat === 'all' ? 'Ver Todos' : cat === 'acai' ? 'Açaí' : cat === 'sorvete' ? 'Sorvete' : cat === 'milkshake' ? 'Batidos' : 'Taças'}
                </button>
              ))}
            </div>
          </div>

          {/* Grid list of menu products */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => (
              <div key={p.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-between hover:shadow-sm transition-all text-left">
                <div className="space-y-2">
                  <div className="w-full h-24 rounded-xl overflow-hidden relative bg-slate-100">
                    <img
                      src={p.image}
                      alt={p.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400';
                      }}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1.5 right-1.5 bg-slate-900/85 text-white font-mono font-black text-[10px] px-2 py-0.5 rounded-lg">
                      R$ {p.price.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-800 line-clamp-1 leading-tight">{p.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-snug">{p.description}</p>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-50 flex gap-2">
                  {p.customizable ? (
                    <button
                      onClick={() => handleStartCustomizing(p)}
                      className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] uppercase py-2 px-1 rounded-xl transition-all cursor-pointer text-center select-none border border-indigo-150/40"
                    >
                      ⚙️ Customizar Cup
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddDirect(p)}
                      className="w-full bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[10px] uppercase py-2 px-1 rounded-xl transition-all cursor-pointer text-center select-none shadow-sm shadow-rose-100"
                    >
                      ➕ Venda Rápida
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE ORDER CUPOM / CHECKOUT (COL-5) */}
        <div className="lg:col-span-5 p-5 bg-white space-y-5">
          <div className="border-b border-dashed border-slate-200 pb-3">
            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">Carrinho do Atendimento</span>
            <h4 className="text-sm font-black text-slate-800">CUPOM DE TRABALHO #</h4>
          </div>

          {/* Cart item listing */}
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {pdvCart.length === 0 ? (
              <div className="text-center py-10 space-y-2 border border-dashed border-slate-150 rounded-2xl bg-slate-50/50">
                <ShoppingCart className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Nenhum item adicionado</p>
                <p className="text-[9px] text-slate-400 max-w-[180px] mx-auto">Clique em "Venda Rápida" ou "Customizar Cup" para iniciar um lançamento.</p>
              </div>
            ) : (
              pdvCart.map((item) => {
                const itemPrice = item.isCustomCup ? (item.customCupPrice || 0) : item.menuItem.price;
                return (
                  <div key={item.id} className="p-3 bg-slate-50/60 rounded-xl border border-slate-100/80 space-y-2 text-xs">
                    <div className="flex justify-between items-start gap-1">
                      <div className="min-w-0 pr-1">
                        <span className="font-extrabold text-slate-800 leading-tight block">{item.menuItem.name}</span>
                        {item.isCustomCup && item.customCupConfig && (
                          <div className="text-[9px] text-slate-500 italic font-semibold space-y-0.5">
                            <span className="text-indigo-600 block">Tamanho: {item.customCupConfig.size} | Base: {item.customCupConfig.base === 'acai' ? 'Açaí' : item.customCupConfig.base === 'sorvete' ? 'Sorvete' : 'Casadinho'}</span>
                            {item.customCupConfig.flavors && item.customCupConfig.flavors.length > 0 && (
                              <span className="block">• Sabores: {item.customCupConfig.flavors.map(fid => FLAVOR_OPTIONS.find(f => f.id === fid)?.name || fid).join(', ')}</span>
                            )}
                            {item.customCupConfig.toppings && item.customCupConfig.toppings.length > 0 && (
                              <span className="block">• Adicionais: {item.customCupConfig.toppings.map(tid => TOPPING_OPTIONS.find(t => t.id === tid)?.name || tid).join(', ')}</span>
                            )}
                          </div>
                        )}
                        {item.notes && (
                          <div className="mt-1 inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-md font-extrabold">
                            📢 {item.notes}
                          </div>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-700 flex-shrink-0">
                        R$ {(itemPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>

                    {/* Quantity Selector and Action buttons */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-dashed border-slate-200/55">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Subtotal: R$ {itemPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer select-none"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-extrabold font-mono text-xs">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer select-none"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 cursor-pointer ml-1 select-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* CUSTOMER INFO AND PAYMENT FORM */}
          {pdvCart.length > 0 && (
            <div className="space-y-3.5 pt-3 border-t border-slate-100">
              
              {/* Customer details Inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Nome do Cliente</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      className="w-full text-xs pl-8 pr-2 py-1.5 rounded-lg border border-slate-250 outline-none focus:ring-1 focus:ring-rose-500 font-bold text-slate-700"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Telefone</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Não informado"
                      className="w-full text-xs pl-8 pr-2 py-1.5 rounded-lg border border-slate-250 outline-none focus:ring-1 focus:ring-rose-500 font-bold text-slate-700"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* General Order Notes or Separation override */}
              <div className="space-y-1">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Observações Gerais / Instruções de Separação</label>
                <textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Ex: Mandar embalagem separada, talheres extras, etc..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-250 focus:ring-1 focus:ring-rose-500 font-medium resize-none h-12 text-slate-700"
                />
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Método de Pgto</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none bg-slate-50 font-bold cursor-pointer"
                  >
                    <option value="cash_on_delivery">💵 Dinheiro (Balcão)</option>
                    <option value="pix">💳 PIX (Copia-Cola/Instante)</option>
                    <option value="card_on_delivery">💳 Cartão (Física na Loja)</option>
                  </select>
                </div>

                {/* Instant Order status */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Estado Pós-Checkout</label>
                  <select
                    value={initialStatus}
                    onChange={(e) => setInitialStatus(e.target.value as OrderStatus)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none bg-slate-50 font-bold cursor-pointer"
                  >
                    <option value="completed">✅ Entregue (Fecha Venda)</option>
                    <option value="preparing">🥣 Cozinha (Vai Fila)</option>
                    <option value="waiting">⌛ Aguardando Inicial</option>
                  </select>
                </div>
              </div>

              {/* Calculator for Cash */}
              {paymentType === 'cash_on_delivery' && (
                <div className="bg-emerald-50/40 border border-emerald-100 p-3.5 rounded-xl space-y-2 text-xs">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block">💵 Calculadora de Troco</span>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600 absolute left-2 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Valor pago cliente..."
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="w-full text-xs pl-7 pr-1.5 py-1 rounded-md border border-emerald-200 outline-none bg-white font-bold text-slate-800"
                      />
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[9px] text-slate-400 font-semibold uppercase leading-none">Troco p/ Cliente</p>
                      <span className="text-xs font-black text-emerald-700 leading-normal block">
                        R$ {changeValue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary and Big Actions */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">TOTAL DA COMPRA:</span>
                  <span className="font-mono font-black text-lg text-rose-650">R$ {cartSubtotal.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePDVSubmit(true)}
                    disabled={isSubmitting}
                    className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 font-black text-[10px] uppercase tracking-wider transition-all rounded-xl cursor-pointer shadow-md shadow-emerald-50 text-white flex items-center justify-center gap-1 group"
                  >
                    <Printer className="w-3.5 h-3.5 text-white/90 group-hover:scale-110 transition-transform" />
                    <span>Lançar & Imprimir 🧾</span>
                  </button>

                  <button
                    onClick={() => handlePDVSubmit(false)}
                    disabled={isSubmitting}
                    className="py-3 px-3 bg-slate-900 hover:bg-slate-800 font-black text-[10px] uppercase tracking-wider transition-all rounded-xl cursor-pointer shadow-md text-white flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5 text-white/90" />
                    <span>Apenas Lançar ✅</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    if(confirm("Deseja realmente limpar toda esta venda atual do PDV?")) {
                      setPdvCart([]);
                      setCashReceived('');
                    }
                  }}
                  className="w-full text-center text-slate-400 hover:text-slate-600 font-bold text-[9px] uppercase tracking-wide cursor-pointer transition-colors"
                >
                  Limpar Carrinho / Cancelar
                </button>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* CUSTOM CUP CONFIGURATOR POPUP */}
      {customizingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-150 overflow-hidden text-left flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-rose-500 font-bold">✨</span>
                <div>
                  <h3 className="font-extrabold text-sm uppercase">Customizar {customizingItem.name}</h3>
                  <p className="text-[10px] text-slate-400">Monte o copo/taça exatamente como solicitado pelo cliente no balcão</p>
                </div>
              </div>
              <button
                onClick={() => setCustomizingItem(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content scrolling */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              
              {/* Sizes */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">1. Escolha o Tamanho</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['300ml', '400ml', '500ml', '700ml'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setCustomSize(sz)}
                      className={`py-2 rounded-xl border flex flex-col items-center justify-center font-bold tracking-wide transition-all cursor-pointer ${
                        customSize === sz 
                          ? 'border-rose-500 bg-rose-50 text-rose-700' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span>{sz}</span>
                      <span className="text-[9px] font-bold opacity-60">R$ {getCustomCupBasePrice(sz).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Base */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">2. Base Recheio</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['acai', 'sorvete', 'casadinho'] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setCustomBase(b)}
                      className={`py-2 px-1 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        customBase === b 
                          ? 'border-rose-500 bg-rose-50 text-rose-700' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {b === 'acai' ? 'Açaí Puro' : b === 'sorvete' ? 'Sorvete Creme' : 'Casadinho (Açaí + Creme)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flavors Select */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">3. Escolha os Sabores de Sorvete (Opcional)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[110px] overflow-y-auto p-1 border rounded-xl bg-slate-50/50">
                  {FLAVOR_OPTIONS.map((f) => {
                    const isSel = selectedFlavors.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          if (isSel) {
                            setSelectedFlavors(selectedFlavors.filter(x => x !== f.id));
                          } else {
                            setSelectedFlavors([...selectedFlavors, f.id]);
                          }
                        }}
                        className={`p-2 rounded-lg border text-[10px] font-semibold text-left transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSel 
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-800' 
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-55'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                        <span className="truncate">{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toppings Select */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">4. Selecionar Adicionais & Cortesias</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto p-1 border rounded-xl bg-slate-50/50">
                  {TOPPING_OPTIONS.map((t) => {
                    const isSel = selectedToppings.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          if (isSel) {
                            setSelectedToppings(selectedToppings.filter(x => x !== t.id));
                          } else {
                            setSelectedToppings([...selectedToppings, t.id]);
                          }
                        }}
                        className={`p-1.5 px-2.5 rounded-lg border text-[10.5px] text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSel 
                            ? 'border-rose-500 bg-rose-50 text-rose-800 font-bold' 
                            : 'border-slate-200 bg-white text-slate-650 hover:bg-slate-55'
                        }`}
                      >
                        <span className="truncate">{t.name}</span>
                        <span className="font-mono text-[9px] bg-slate-100 px-1 rounded-sm text-slate-500 font-extrabold">
                          {t.price === 0 ? 'Cortesia' : `+ R$ ${t.price.toFixed(2)}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Item Specific Notes & Fast tags */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">5. Observações deste Cup</label>
                  <span className="text-[9px] text-rose-555 font-bold">ex: retire mandar separado</span>
                </div>
                <input
                  type="text"
                  placeholder="Ex: Mandar granola separado, retire morango..."
                  value={itemSpecificNotes}
                  onChange={(e) => setItemSpecificNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold text-slate-700"
                />
                
                {/* Clickable Quick tags */}
                <div className="flex flex-wrap gap-1.5">
                  {fastNotes.map((noteTag) => (
                    <button
                      key={noteTag}
                      type="button"
                      onClick={() => setItemSpecificNotes(noteTag)}
                      className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-1 px-2.5 rounded-lg transition-colors cursor-pointer"
                    >
                      🏷️ {noteTag}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Action buttons */}
            <div className="p-4 border-t bg-slate-50 flex gap-3 text-sm">
              <button
                onClick={() => setCustomizingItem(null)}
                className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-xl transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCustomCup}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center text-xs shadow-md shadow-rose-100"
              >
                Adicionar ao Carrinho R$ {(getCustomCupBasePrice(customSize) + selectedToppings.reduce((acc, tid) => acc + (TOPPING_OPTIONS.find(t=>t.id === tid)?.price || 0), 0)).toFixed(2)}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* QUICK/MANUAL INSERT MODAL */}
      {isQuickItemOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-150 overflow-hidden text-left flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-md">
                  <DollarSign className="w-4 h-4" />
                </span>
                <span className="font-extrabold text-xs uppercase text-zinc-50 tracking-wide">Inserir Item Manual / Avulso</span>
              </div>
              <button
                onClick={() => setIsQuickItemOpen(false)}
                className="p-1 bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Nome do Produto / Descrição</label>
                <input
                  type="text"
                  placeholder="EX: Copo do Amigo 500ml Extra"
                  value={quickItemName}
                  onChange={(e) => setQuickItemName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-250 outline-none focus:ring-1 focus:ring-rose-500 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Preço Unitário (R$)</label>
                <input
                  type="number"
                  placeholder="25.00"
                  value={quickItemPrice}
                  onChange={(e) => setQuickItemPrice(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-250 outline-none focus:ring-1 focus:ring-rose-500 font-bold font-mono"
                />
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex gap-2.5">
              <button
                onClick={() => {
                  setIsQuickItemOpen(false);
                  setQuickItemName('');
                  setQuickItemPrice('');
                }}
                className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddQuickItem}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-extrabold uppercase hover:bg-emerald-700 cursor-pointer text-center shadow-xs"
              >
                Adicionar Venda R$
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
