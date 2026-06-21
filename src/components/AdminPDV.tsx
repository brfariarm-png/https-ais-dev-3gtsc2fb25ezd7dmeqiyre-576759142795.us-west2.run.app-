/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Optimized Intuitive POS (PDV) Dashboard with Immersive Window and Receipt Roll Mechanics
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Minus, Trash2, ShoppingCart, User, Phone, DollarSign, 
  Check, X, Printer, Sparkles, AlertCircle, Maximize2, Minimize2, 
  ArrowLeft, Clock, FileText, Delete, RotateCcw, Tag, Trash, Info
} from 'lucide-react';
import { MenuItem, CartItem, Order, OrderStatus, PaymentType, CustomCupConfig } from '../types';
import { MENU_ITEMS, FLAVOR_OPTIONS, TOPPING_OPTIONS, getCustomCupBasePrice } from '../data';

interface AdminPDVProps {
  onPlacePDVOrder: (order: Order, shouldPrint: boolean) => Promise<void>;
  storeSettings: any;
  menuItems?: MenuItem[];
  onClose?: () => void;
}

export default function AdminPDV({ onPlacePDVOrder, storeSettings, menuItems, onClose }: AdminPDVProps) {
  // Toggle for Immersive Full Screen layout versus embedded window
  const [isFullscreen, setIsFullscreen] = useState(true);

  // POS Cart State
  const [pdvCart, setPdvCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'acai' | 'sorvete' | 'milkshake' | 'sundae'>('all');

  // Customer Details for Checkout
  const [customerName, setCustomerName] = useState('Cliente Balcão');
  const [customerPhone, setCustomerPhone] = useState('Não informado');
  const [paymentType, setPaymentType] = useState<PaymentType>('cash_on_delivery'); // Standard Dinheiro no Balcão
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

  // Real-time Clock inside Header
  const [liveTime, setLiveTime] = useState(new Date().toLocaleTimeString('pt-BR'));
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Fast Cash Keyboard Hotkeys
  const handleCashShortcut = (amount: number) => {
    const parsed = Number(cashReceived) || 0;
    setCashReceived((parsed + amount).toFixed(2));
  };

  const handleExactCash = () => {
    setCashReceived(cartSubtotal.toFixed(2));
  };

  // Quick prepopulated note tags for fast tapping
  const fastNotes = [
    'Mandar Separado 🥡',
    'Sem Calda ❌',
    'Sem Leite Condensado 🥛',
    'Sem Leite em Pó 🍨',
    'Adicional Morango 🍓',
    'Adicional Nutella 🍫',
    'Granola no Fundo 🌾',
    'Talher Extra 🥄'
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
      image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400'
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
        deliveryType: 'pickup',
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
      // Reset values
      setPdvCart([]);
      setCustomerName('Cliente Balcão');
      setCustomerPhone('Não informado');
      setCashReceived('');
      setGeneralNotes('');
    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro ao registrar a venda no caixa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // POS layout components
  const categoryTabs = [
    { id: 'all', label: 'Todos 🌟' },
    { id: 'acai', label: 'Açaí 🍇' },
    { id: 'sorvete', label: 'Sorvete 🍦' },
    { id: 'milkshake', label: 'Batidos 🥤' },
    { id: 'sundae', label: 'Taças 🍧' }
  ] as const;

  // The Immersive Core structure
  const mainLayout = (
    <div className={`w-full flex flex-col text-slate-800 ${isFullscreen ? 'h-full' : 'min-h-[700px]'}`}>
      
      {/* 1. Header Bar of POS */}
      <div className="bg-slate-900 text-white px-5 py-3 flex-shrink-0 flex items-center justify-between border-b border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-gradient-to-tr from-rose-500 to-amber-500 rounded-xl animate-pulse">
            <ShoppingCart className="w-5 h-5 text-white" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-sm tracking-widest uppercase font-sans">SISTEMA FRENTE DE CAIXA (PDV)</h2>
              <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider">
                ● Operacional Live
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
              Sorveteria Supreme • Monte Mor SP • Balcão e Lançamentos Rápidos
            </p>
          </div>
        </div>

        {/* Live Clock & Control Deck */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] font-bold font-mono text-zinc-200 uppercase tracking-wider">
              {liveTime}
            </span>
          </div>

          <button
            onClick={() => setIsQuickItemOpen(true)}
            className="bg-indigo-650 hover:bg-indigo-700 transition-all font-black text-[10px] uppercase tracking-wider py-1.5 px-3.5 rounded-xl flex items-center gap-1 cursor-pointer hover:scale-102 hover:shadow-md"
          >
            ➕ Item Manual
          </button>

          {/* Toggle Fullscreen mode button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-slate-800 hover:bg-slate-750 transition-colors text-zinc-400 hover:text-white rounded-xl cursor-pointer"
            title={isFullscreen ? "Minimizar para Visualização Regular" : "Imersão Total em Tela Cheia"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-450 hover:text-white transition-all rounded-xl text-[10px] uppercase font-black cursor-pointer px-4"
            >
              Fechar PDV
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Body: Split Column Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden bg-slate-100">
        
        {/* LEFT COMPONENT: Catalog Card Grid (COL 7) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col p-4 space-y-4 overflow-hidden border-r border-slate-200">
          
          {/* Filtering row */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between flex-shrink-0 bg-white p-3.5 rounded-2xl border border-slate-150 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Busca rápida de produto (Código / Nome / Categoria)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50/60 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scrolling Categories Container */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {categoryTabs.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`text-[9.5px] uppercase font-black tracking-widest py-2 px-3.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.id 
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-200' 
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable grid area */}
          <div className="flex-1 overflow-y-auto pr-1 pb-4 scrollbar-thin">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-slate-400 space-y-2 bg-white rounded-3xl border border-slate-200">
                <Search className="w-10 h-10 text-slate-300 mx-auto" strokeWidth={1.5} />
                <p className="text-xs font-black uppercase tracking-wider">Nenhum resultado encontrado</p>
                <p className="text-[10px] text-slate-400">Verifique a ortografia ou mude o filtro de categorias.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredProducts.map((p) => (
                  <div 
                    key={p.id} 
                    className="bg-white rounded-2xl border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all duration-200 overflow-hidden group hover:-translate-y-0.5"
                  >
                    {/* Visual Card image or price indicator */}
                    <div className="relative h-28 bg-slate-100 overflow-hidden">
                      <img
                        src={p.image}
                        alt={p.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 pt-6">
                        <span className="text-[9px] uppercase font-black tracking-wider text-amber-350 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-xs">
                          {p.category === 'acai' ? '🍇 Açaí' : p.category === 'sorvete' ? '🍦 Sorvete' : p.category === 'milkshake' ? '🥤 Batido' : '🍧 Taças'}
                        </span>
                      </div>
                      <span className="absolute top-2.5 right-2.5 bg-slate-900 text-white font-mono font-black text-xs px-2.5 py-1 rounded-lg shadow-md">
                        R$ {p.price.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-3 text-left space-y-1 flex-1 flex flex-col justify-between">
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-xs text-slate-900 tracking-tight leading-tight group-hover:text-rose-600 transition-colors">
                          {p.name}
                        </h4>
                        <p className="text-[10.5px] text-slate-400 leading-snug line-clamp-2">
                          {p.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        {p.customizable ? (
                          <button
                            onClick={() => handleStartCustomizing(p)}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <span>⚙️ Customizar Taça</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddDirect(p)}
                            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[10px] uppercase py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-rose-100"
                          >
                            <span>➕ Vender Direto</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Real POS Ticket Continuous roll tape (COL 5) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-slate-50 flex flex-col h-full overflow-hidden shadow-2xl relative z-10">
          
          {/* Continuous Receipt Container */}
          <div className="flex-1 flex flex-col min-h-0 bg-white border-l border-slate-150">
            
            {/* Header Ticket Tear Edge */}
            <div className="h-2 bg-[linear-gradient(45deg,#0000_33.333%,#f1f5f9_33.333%,#f1f5f9_66.666%,#0000_66.666%)] bg-[length:10px_10px] bg-repeat-x flex-shrink-0" />
            
            {/* Receipt Header details */}
            <div className="px-5 py-3 border-b border-dashed border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block leading-none">Canal de Lançamento</span>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mt-1">CUPOM DE CAIXA #BALCAO</h4>
                </div>
                {pdvCart.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm("Quer realmente resetar a venda ativa no caixa?")) {
                        setPdvCart([]);
                        setCashReceived('');
                      }
                    }}
                    className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-lg text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash className="w-3 h-3" /> Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Receipt dynamic scrolling itemization tape */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin">
              {pdvCart.length === 0 ? (
                <div className="text-center py-20 text-slate-400 space-y-3.5 my-auto">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-350">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-700 uppercase tracking-wider">CAIXA LIVRE</p>
                    <p className="text-[10px] text-slate-400 max-w-[210px] mx-auto leading-relaxed mt-1">
                      Adicione itens ao carrinho para começar o lançamento fiscal do balcão.
                    </p>
                  </div>
                </div>
              ) : (
                pdvCart.map((item, idx) => {
                  const itemPrice = item.isCustomCup ? (item.customCupPrice || 0) : item.menuItem.price;
                  return (
                    <div key={item.id} className="bg-slate-50 border border-slate-200/65 rounded-xl p-3 space-y-2 relative group text-xs text-slate-800">
                      
                      {/* Item and Name column */}
                      <div className="flex justify-between items-start">
                        <div className="pr-2">
                          <span className="font-extrabold text-slate-900 leading-tight">
                            {idx + 1}. {item.menuItem.name}
                          </span>
                          
                          {/* Inner details if customizable custom acai/icecream cup */}
                          {item.isCustomCup && item.customCupConfig && (
                            <div className="text-[9.5px] font-bold text-indigo-800 mt-1 pl-1 space-y-0.5 border-l-2 border-indigo-400 bg-indigo-50/50 p-1 rounded-r-lg">
                              <p>Tamanho: {item.customCupConfig.size} | Base: {item.customCupConfig.base === 'acai' ? 'Açaí' : item.customCupConfig.base === 'sorvete' ? 'Sorvete' : 'Casadinho'}</p>
                              {item.customCupConfig.flavors && item.customCupConfig.flavors.length > 0 && (
                                <p>• Sabores: {item.customCupConfig.flavors.map(fid => FLAVOR_OPTIONS.find(f => f.id === fid)?.name || fid).join(', ')}</p>
                              )}
                              {item.customCupConfig.toppings && item.customCupConfig.toppings.length > 0 && (
                                <p>• Adicionais: {item.customCupConfig.toppings.map(tid => TOPPING_OPTIONS.find(t => t.id === tid)?.name || tid).join(', ')}</p>
                              )}
                            </div>
                          )}

                          {item.notes && (
                            <div className="mt-1 flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-900 font-extrabold text-[9px] px-2 py-0.5 rounded-md">
                              📢 Obs: {item.notes}
                            </div>
                          )}
                        </div>

                        <span className="font-mono font-black text-slate-850 whitespace-nowrap">
                          R$ {(itemPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>

                      {/* Receipt Row adjuster */}
                      <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-200/80">
                        <span className="text-[9px] text-slate-400 font-extrabold font-mono uppercase">V. Unit: R$ {itemPrice.toFixed(2)}</span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateQty(item.id, -1)}
                            className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-bold font-mono text-[11px]">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQty(item.id, 1)}
                            className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="w-5 h-5 rounded-md bg-rose-50 text-rose-500 hover:bg-rose-100/80 transition-colors flex items-center justify-center cursor-pointer ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

            {/* Receipt bottom form (Checkout layout & totals) */}
            {pdvCart.length > 0 && (
              <div className="p-4 border-t border-slate-150 bg-slate-50/95 space-y-3 flex-shrink-0">
                
                {/* Accordion form fields */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block">Nome do Cliente</label>
                    <div className="relative">
                      <User className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        className="w-full text-[10.5px] pl-7 pr-1.5 py-1.5 bg-white border border-slate-250 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 font-extrabold text-slate-700"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block">Telefone</label>
                    <div className="relative">
                      <Phone className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Não informado"
                        className="w-full text-[10.5px] pl-7 pr-1.5 py-1.5 bg-white border border-slate-250 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 font-extrabold text-slate-700"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block">Forma de Pago</label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                      className="w-full text-[10.5px] p-1.5 bg-white border border-slate-250 rounded-xl outline-none font-bold cursor-pointer"
                    >
                      <option value="cash_on_delivery">💵 Dinheiro</option>
                      <option value="pix">⚡ PIX</option>
                      <option value="card_on_delivery">💳 Cartão na Loja</option>
                    </select>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block">Status de Saída</label>
                    <select
                      value={initialStatus}
                      onChange={(e) => setInitialStatus(e.target.value as OrderStatus)}
                      className="w-full text-[10.5px] p-1.5 bg-white border border-slate-250 rounded-xl outline-none font-bold cursor-pointer"
                    >
                      <option value="completed">✅ Concluído (Direto)</option>
                      <option value="preparing">🥣 Cozinha (Preparar)</option>
                    </select>
                  </div>
                </div>

                {/* Touch Keyboard calculators for Cash payments */}
                {paymentType === 'cash_on_delivery' && (
                  <div className="bg-emerald-50 border border-emerald-250/50 p-2 rounded-xl text-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase text-emerald-800 tracking-wider">
                      <span>💵 Recebimento & Troco</span>
                      <button onClick={handleExactCash} className="text-[8.5px] text-white bg-emerald-600 px-1 py-0.5 rounded uppercase font-black tracking-normal">
                        Exato / Sem Troco
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <DollarSign className="w-3 text-emerald-600 absolute left-1.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Valor recebido..."
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          className="w-full text-[11px] pl-5 pr-1 py-1 rounded-lg border border-emerald-200 outline-none font-black font-mono text-emerald-950 bg-white"
                        />
                      </div>
                      
                      <div className="text-right leading-none flex-shrink-0">
                        <span className="text-[8px] text-emerald-600/70 uppercase font-bold block">Troco</span>
                        <span className="text-[12px] font-black text-emerald-800 font-mono">
                          R$ {changeValue.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Quick values keys */}
                    <div className="flex flex-wrap gap-1 items-center">
                      {[10, 20, 50, 100].map((shortcut) => (
                        <button
                          key={shortcut}
                          type="button"
                          onClick={() => handleCashShortcut(shortcut)}
                          className="text-[9px] font-mono bg-white hover:bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded border border-emerald-150 transition-colors select-none"
                        >
                          +R${shortcut}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCashReceived('')}
                        className="text-[8.5px] text-slate-500 font-bold ml-auto hover:text-slate-850"
                      >
                        Resetar
                      </button>
                    </div>
                  </div>
                )}

                {/* Subtotal tape total bar */}
                <div className="bg-slate-900 text-white rounded-xl p-3 flex justify-between items-center relative overflow-hidden shadow-md">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] rotate-12 scale-150">
                    <ShoppingCart className="w-16 h-16 text-white" />
                  </div>
                  <div>
                    <span className="text-[8.5px] font-black uppercase text-zinc-400 tracking-wider block">VALOR TOTAL DE VENDA</span>
                    <span className="font-mono font-black text-lg text-emerald-400">R$ {cartSubtotal.toFixed(2)}</span>
                  </div>
                  <span className="text-[9.5px] font-bold bg-white/10 px-2 py-1 rounded">
                    {pdvCart.reduce((s,i) => s+i.quantity, 0)} Itens
                  </span>
                </div>

                {/* Confirm buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePDVSubmit(true)}
                    disabled={isSubmitting}
                    className="py-3 px-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-700/60 font-black text-[10px] uppercase tracking-wider text-white transition-all rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span>Confirmar + Cupom</span>
                  </button>

                  <button
                    onClick={() => handlePDVSubmit(false)}
                    disabled={isSubmitting}
                    className="py-3 px-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 font-black text-[10px] uppercase tracking-wider text-white transition-all rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Apenas Registrar</span>
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>

      {/* CUSTOM CUP CONFIGURATOR POPUP */}
      {customizingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-[100] p-4 text-slate-800">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-150 overflow-hidden text-left flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-rose-500 font-bold">✨</span>
                <div>
                  <h3 className="font-extrabold text-sm uppercase">Customizar {customizingItem.name}</h3>
                  <p className="text-[10px] text-zinc-400">Monte o açaí ou copo de sorvete solicitado pelo cliente</p>
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
                      type="button"
                      onClick={() => setCustomSize(sz)}
                      className={`py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center font-bold tracking-wide transition-all cursor-pointer ${
                        customSize === sz 
                          ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-200' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600 bg-white'
                      }`}
                    >
                      <span>{sz}</span>
                      <span className="text-[9px] font-black opacity-60">R$ {getCustomCupBasePrice(sz).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Base */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">2. Base Principal</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['acai', 'sorvete', 'casadinho'] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setCustomBase(b)}
                      className={`py-2 px-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        customBase === b 
                          ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-200' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600 bg-white'
                      }`}
                    >
                      {b === 'acai' ? '🍇 Açaí Puro' : b === 'sorvete' ? '🍦 Sorvete Creme' : '☯️ Casadinho'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flavors Select */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">3. Escolha os Sabores de Sorvete (Opcional)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[120px] overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-slate-50/50">
                  {FLAVOR_OPTIONS.filter((f) => 
                    !customizingItem?.allowedFlavors || 
                    customizingItem.allowedFlavors.length === 0 || 
                    customizingItem.allowedFlavors.includes(f.id)
                  ).map((f) => {
                    const isSel = selectedFlavors.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          if (isSel) {
                            setSelectedFlavors(selectedFlavors.filter(x => x !== f.id));
                          } else {
                            setSelectedFlavors([...selectedFlavors, f.id]);
                          }
                        }}
                        className={`p-2 rounded-xl border text-[10.5px] font-bold text-left transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSel 
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200' 
                            : 'border-slate-200 bg-white text-slate-705 hover:bg-slate-55'
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
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <span>4. Adicionais & Coberturas</span>
                  <span className="text-[9.5px] text-zinc-500 bg-zinc-200 px-1.5 py-0.5 rounded font-bold">Cobrança Automática</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-slate-50/50">
                  {TOPPING_OPTIONS.filter((t) => 
                    !customizingItem?.allowedToppings || 
                    customizingItem.allowedToppings.length === 0 || 
                    customizingItem.allowedToppings.includes(t.id)
                  ).map((t) => {
                    const isSel = selectedToppings.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (isSel) {
                            setSelectedToppings(selectedToppings.filter(x => x !== t.id));
                          } else {
                            setSelectedToppings([...selectedToppings, t.id]);
                          }
                        }}
                        className={`p-2 px-3 rounded-xl border text-[10.5px] text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSel 
                            ? 'border-rose-500 bg-rose-50 text-rose-900 font-extrabold ring-1 ring-rose-200' 
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-55'
                        }`}
                      >
                        <span className="truncate">{t.name}</span>
                        <span className="font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded-sm text-slate-550 font-black">
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
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">5. Observações deste Copo</label>
                  <span className="text-[9.5px] text-rose-500 font-bold">Toque para preencher rápido</span>
                </div>
                <input
                  type="text"
                  placeholder="Ex: Granola separado, retire leite condensado..."
                  value={itemSpecificNotes}
                  onChange={(e) => setItemSpecificNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-250 font-bold text-slate-750 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                
                {/* Clickable Quick tags */}
                <div className="flex flex-wrap gap-1">
                  {fastNotes.map((noteTag) => (
                    <button
                      key={noteTag}
                      type="button"
                      onClick={() => setItemSpecificNotes(noteTag)}
                      className="text-[9.5px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-1 px-2.5 rounded-lg transition-colors cursor-pointer"
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
                className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-650 font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCustomCup}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center text-xs shadow-md shadow-rose-250/20"
              >
                Adicionar Cup • R$ {(getCustomCupBasePrice(customSize) + selectedToppings.reduce((acc, tid) => acc + (TOPPING_OPTIONS.find(t=>t.id === tid)?.price || 0), 0)).toFixed(2)}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* QUICK/MANUAL INSERT MODAL */}
      {isQuickItemOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-[100] p-4 text-slate-800">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-150 overflow-hidden text-left flex flex-col">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-md">
                  <DollarSign className="w-4 h-4" />
                </span>
                <span className="font-extrabold text-xs uppercase tracking-wide">Inserir Item Avulso</span>
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
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Nome / Identificação</label>
                <input
                  type="text"
                  placeholder="EX: Copo de Casadinho 500ml Extra"
                  value={quickItemName}
                  onChange={(e) => setQuickItemName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-205 focus:ring-1 focus:ring-rose-500 outline-none font-bold text-slate-750"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Valor Unitário (R$)</label>
                <input
                  type="number"
                  placeholder="15.00"
                  value={quickItemPrice}
                  onChange={(e) => setQuickItemPrice(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-205 focus:ring-1 focus:ring-rose-500 outline-none font-bold font-mono text-slate-750"
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
                className="flex-1 py-2 bg-white border border-slate-200 text-slate-650 rounded-lg text-xs font-bold hover:bg-slate-100 cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddQuickItem}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase hover:bg-indigo-700 cursor-pointer text-center"
              >
                Inserir Venda
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  // If Fullscreen is true, we render a fixed overlay that completely covers the screen.
  // This provides immediate visual full screen, preventing leakage of admin sidebar or headers.
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[40] bg-slate-100 flex flex-col w-screen h-screen overflow-hidden">
        {mainLayout}
      </div>
    );
  }

  // Fallback integrated panel inside standard admin container
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden animate-fade-in text-left">
      {mainLayout}
    </div>
  );
}
