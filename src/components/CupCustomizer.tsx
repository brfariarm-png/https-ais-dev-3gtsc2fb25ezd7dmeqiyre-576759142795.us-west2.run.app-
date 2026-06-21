/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, Check, ShoppingBag, Sparkles, Layers, CupSoda, Ruler } from 'lucide-react';
import { ToppingOption, FlavorOption, CustomCupConfig, CartItem, MenuItem } from '../types';
import { FLAVOR_OPTIONS, TOPPING_OPTIONS, getCustomCupBasePrice } from '../data';

const EXTRA_BROWNIE_PRODUCTS = [
  { id: 'fatia-brownie', name: 'Fatia de Brownie Tradicional Extra', price: 9.95, desc: 'Fatia fresca de brownie artesanal' },
  { id: 'brownie-recheado', name: 'Brownie Recheado com Doce de Leite Extra', price: 11.95, desc: 'Brownie com generoso doce de leite' },
  { id: 'mini-vulcao', name: 'Mini Vulcão de Chocolate com Brownie Extra', price: 15.95, desc: 'Bolo de brownie cremoso com calda vulcão' },
  { id: 'cookies-brownie', name: 'Cookies de Brownie Crocante', price: 8.50, desc: 'Pacotinho com cookies crocantes da nossa massa' }
];

interface CupCustomizerProps {
  onAddToCart: (item: CartItem) => void;
  onClose: () => void;
  customizingItem?: MenuItem | null;
}

export default function CupCustomizer({ onAddToCart, onClose, customizingItem }: CupCustomizerProps) {
  const isMilkshake = customizingItem?.category === 'milkshake';
  const isLinhaBrownie = customizingItem?.id === 'acai-sensacao' || customizingItem?.name === 'Linha Brownie';

  const [size, setSize] = useState<'300ml' | '400ml' | '500ml' | '700ml'>('400ml');
  const [base, setBase] = useState<'acai' | 'sorvete' | 'casadinho'>(isMilkshake ? 'sorvete' : 'casadinho');
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(isMilkshake ? ['baunilha'] : ['acai-puro-organico']);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [extraBrownieProducts, setExtraBrownieProducts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');

  // Sizing mappings for visual display
  const cupWidths = {
    '300ml': '155px',
    '400ml': '170px',
    '500ml': '185px',
    '700ml': '210px',
  };
  const cupHeights = {
    '300ml': '190px',
    '400ml': '215px',
    '500ml': '240px',
    '700ml': '280px',
  };
  const cupLipWidths = {
    '300ml': '167px',
    '400ml': '182px',
    '500ml': '198px',
    '700ml': '224px',
  };
  const spoonHeights = {
    '300ml': '170px',
    '400ml': '195px',
    '500ml': '220px',
    '700ml': '260px',
  };
  const spoonTops = {
    '300ml': '30px',
    '400ml': '10px',
    '500ml': '-10px',
    '700ml': '-40px',
  };
  const spoonRights = {
    '300ml': '15px',
    '400ml': '20px',
    '500ml': '25px',
    '700ml': '35px',
  };
  const toppingTops = {
    '300ml': '50px',
    '400ml': '35px',
    '500ml': '10px',
    '700ml': '-22px',
  };

  // Max flavors allowed
  const maxFlavors = isMilkshake ? 1 : 2;

  // Filter flavors based on base type chosen
  const availableFlavors = useMemo(() => {
    let list = FLAVOR_OPTIONS;
    if (base === 'acai') {
      list = FLAVOR_OPTIONS.filter((f) => f.id === 'acai-puro-organico');
    } else if (base === 'sorvete') {
      list = FLAVOR_OPTIONS.filter((f) => f.category === 'sorvete');
    } else if (base === 'casadinho') {
      // For casadinho (açaí + ice cream), we fix Açaí Puro Orgânico and let them select a sorvete flavour!
      list = FLAVOR_OPTIONS.filter((f) => f.id === 'acai-puro-organico' || f.category === 'sorvete');
    }

    if (customizingItem?.allowedFlavors && customizingItem.allowedFlavors.length > 0) {
      list = list.filter((f) => customizingItem.allowedFlavors?.includes(f.id));
    }
    return list;
  }, [base, customizingItem]);

  // Toppings sorted by category for clean tabs/sections
  const toppingsByCategory = useMemo(() => {
    const categories: Record<string, ToppingOption[]> = {
      cortesia: [],
      creme: [],
      fruta: [],
      crocante: [],
      calda: [],
    };

    let list = TOPPING_OPTIONS;
    if (customizingItem?.allowedToppings && customizingItem.allowedToppings.length > 0) {
      list = TOPPING_OPTIONS.filter((t) => customizingItem.allowedToppings?.includes(t.id));
    }

    list.forEach((topping) => {
      if (topping.id.startsWith('gratis-')) {
        if (!isMilkshake) {
          categories['cortesia'].push(topping);
        }
      } else if (categories[topping.category]) {
        categories[topping.category].push(topping);
      }
    });
    return categories;
  }, [isMilkshake, customizingItem]);

  const basePrice = useMemo(() => {
    if (isLinhaBrownie) {
      if (size === '300ml') return 16.90;
      if (size === '400ml') return 22.90;
      if (size === '500ml') return 28.90;
      if (size === '700ml') return 34.90;
      return 22.90;
    }
    if (isMilkshake) {
      return size === '300ml' ? 15.00
        : size === '400ml' ? 18.00
        : size === '500ml' ? 21.00
        : 25.00;
    }
    return getCustomCupBasePrice(size);
  }, [isMilkshake, isLinhaBrownie, size]);

  const toppingsPrice = useMemo(() => {
    return selectedToppings.reduce((total, id) => {
      const topping = TOPPING_OPTIONS.find((t) => t.id === id);
      return total + (topping ? topping.price : 0);
    }, 0);
  }, [selectedToppings]);

  const extraProductsPrice = useMemo(() => {
    if (!isLinhaBrownie) return 0;
    return Object.entries(extraBrownieProducts).reduce((total, [id, qty]) => {
      const prod = EXTRA_BROWNIE_PRODUCTS.find(p => p.id === id);
      return total + (prod ? prod.price * qty : 0);
    }, 0);
  }, [isLinhaBrownie, extraBrownieProducts]);

  const totalPrice = basePrice + toppingsPrice + extraProductsPrice;

  const handleFlavorToggle = (id: string) => {
    if (id === 'acai-puro-organico' && (base === 'acai' || base === 'casadinho')) {
      return; // Cannot deselect fixed açaí flavor
    }
    if (selectedFlavors.includes(id)) {
      setSelectedFlavors(selectedFlavors.filter((f) => f !== id));
    } else {
      if (selectedFlavors.length < maxFlavors) {
        setSelectedFlavors([...selectedFlavors, id]);
      }
    }
  };

  const handleToppingToggle = (id: string) => {
    if (selectedToppings.includes(id)) {
      setSelectedToppings(selectedToppings.filter((t) => t !== id));
    } else {
      setSelectedToppings([...selectedToppings, id]);
    }
  };

  const handleAddCupToCart = () => {
    // If base is 'acai' and selectedFlavors is empty, automatically use 'acai-puro-organico'
    const finalFlavors = base === 'acai' && selectedFlavors.length === 0
      ? ['acai-puro-organico']
      : selectedFlavors;

    const sizeName = isLinhaBrownie
      ? size === '400ml' ? 'Copo 400ml'
        : size === '500ml' ? 'Caixinha'
        : 'Balde 700ml'
      : size;

    const finalName = customizingItem
      ? `${customizingItem.name} Customizado (${sizeName})`
      : `Açaí Gourmet Supreme Personalizado (${sizeName})`;

    const descriptionBase = customizingItem
      ? customizingItem.description
      : 'Escolha o tamanho da sua vontade, temos 4 tamanhos e em todos com cortesia leite condensado, leite em po, banana, morango e granola.';

    // Get extra brownie products string
    const extraProductsString = isLinhaBrownie
      ? Object.entries(extraBrownieProducts)
          .filter(([_, qty]) => qty > 0)
          .map(([id, qty]) => {
            const prod = EXTRA_BROWNIE_PRODUCTS.find(p => p.id === id);
            return prod ? `${qty}x ${prod.name}` : '';
          })
          .filter(Boolean)
          .join(', ')
      : '';

    // Generate a dummy item representing this custom cup
    const representationItem: MenuItem = {
      id: customizingItem ? `${customizingItem.id}-custom-${Date.now()}` : `custom-cup-${Date.now()}`,
      name: finalName,
      description: `${descriptionBase} Sabores/Sorvetes: ${
        finalFlavors
          .map((fId) => FLAVOR_OPTIONS.find((f) => f.id === fId)?.name)
          .filter(Boolean)
          .join(', ') || 'Nenhum'
      }. Adicionais: ${
        selectedToppings
          .map((tId) => TOPPING_OPTIONS.find((t) => t.id === tId)?.name)
          .filter(Boolean)
          .join(', ') || 'Nenhum'
      }.${extraProductsString ? ` Outros: ${extraProductsString}.` : ''}`,
      price: totalPrice,
      category: isMilkshake ? 'milkshake' : base === 'acai' ? 'acai' : 'sorvete',
      image: customizingItem?.image || '/assets/images/supreme_acai_cup_1781179584520.jpg',
      customizable: true,
    };

    const config: CustomCupConfig = {
      size,
      base,
      flavors: finalFlavors,
      toppings: selectedToppings,
    };

    const cartItem: CartItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      menuItem: representationItem,
      quantity: 1,
      isCustomCup: true,
      customCupConfig: config,
      customCupPrice: totalPrice,
      notes: notes.trim() || undefined,
    };

    onAddToCart(cartItem);
    onClose();
  };

  // Render liquid layers in the cup based on flavors selected
  const renderedFlavorsForVisual = useMemo(() => {
    if (selectedFlavors.length > 0) {
      return selectedFlavors.map((fid) => FLAVOR_OPTIONS.find((f) => f.id === fid));
    }
    // Default preview layers based on base selection
    if (base === 'acai') {
      return [FLAVOR_OPTIONS[0]]; // Açaí Puro
    }
    if (base === 'sorvete') {
      return [FLAVOR_OPTIONS[2], FLAVOR_OPTIONS[3]]; // Chocolate and Ninho
    }
    return [FLAVOR_OPTIONS[0], FLAVOR_OPTIONS[3]]; // Casadinho (Açaí & Ninho)
  }, [selectedFlavors, base]);

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 overflow-y-auto flex items-center justify-center p-2 sm:p-4 cursor-pointer"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 max-h-[95vh] lg:max-h-[90vh] cursor-default"
      >
        {/* Left pane: Gorgeous Cup Live visualizer (5 columns) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-rose-50 to-amber-50 p-5 sm:p-6 flex flex-col justify-between border-r border-rose-100/40 relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-pink-200/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-200/20 rounded-full blur-3xl" />

          {/* Header info with close overlay */}
          <div className="relative z-10 text-center lg:text-left space-y-1">
            <div className="flex justify-between items-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full uppercase tracking-wider shadow-sm mb-1">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> {customizingItem ? customizingItem.name : 'Açaí Gourmet Supreme Personalizado'}
              </span>
              <button
                onClick={onClose}
                className="lg:hidden text-slate-400 hover:text-rose-500 transition-colors p-2 rounded-full bg-white hover:bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center"
                title="Voltar"
              >
                <Plus className="w-5 h-5 rotate-45 text-slate-600 hover:text-rose-500" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-slate-800 leading-tight">
              {isLinhaBrownie ? 'Escolha Seu Brownie Favorito e Adicionais' : isMilkshake ? 'Escolha o Sabor e Adicionais' : 'Escolha Seu Tamanho e Adicionais'}
            </h3>
            <p className="text-[11px] text-slate-650 leading-normal bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/20">
              {customizingItem ? customizingItem.description : 'Escolha o tamanho da sua vontade, temos 4 tamanhos e em todos com cortesia leite condensado, leite em po, banana, morango e granola. O melhor acai preparado com ingredientes selecionados e de boa qualidade.'}
            </p>
          </div>

          {/* Premium Açaí Image Visualizer (Replacing animated visualizer) */}
          <div className="my-6 flex justify-center items-center relative py-2 flex-1">
            <div className="relative w-56 h-[340px] rounded-[36px] overflow-hidden shadow-2xl border-4 border-white bg-slate-100 transition-all duration-300 hover:scale-[1.02]">
              <img 
                src={customizingItem?.image || "/assets/images/supreme_acai_cup_1781179584520.jpg"} 
                alt={customizingItem ? customizingItem.name : "Açaí Gourmet Supreme"}
                className="w-full h-full object-cover transition-transform duration-500 rounded-[30px]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 flex flex-col justify-end text-white">
                <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest drop-shadow">
                  {isMilkshake ? 'Milkshake Gourmet' : 'Copo Customizado'}
                </span>
                <span className="text-xl font-black tracking-tight drop-shadow">{size} Supreme</span>
                <p className="text-[11px] text-white/90 font-medium mt-1 leading-snug drop-shadow-sm">
                  {isMilkshake 
                    ? `Sorvete: ${selectedFlavors.map(fid => FLAVOR_OPTIONS.find(f => f.id === fid)?.name).join(', ') || 'Nenhum'}`
                    : `Base: ${base === 'acai' ? 'Açaí Puro' : base === 'sorvete' ? 'Sorvetes' : 'Casadinho'}`
                  }
                </p>
              </div>
            </div>
          </div>
          {/* Pricing area */}
          <div className="relative z-10 bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-rose-100/30 flex justify-between items-center shadow-lg">
            <div>
              <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Valor Total</span>
              <p className="text-3xl font-extrabold text-rose-600">R$ {totalPrice.toFixed(2)}</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="font-semibold text-slate-700">{isMilkshake ? 'Milkshake' : 'Base'} ({size}): R$ {basePrice.toFixed(2)}</p>
              <p>Adicionais: R$ {toppingsPrice.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Right pane: Customizer options checklist (7 columns) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 flex flex-col justify-between lg:overflow-y-auto lg:max-h-[90vh]">
          <div className="space-y-6">
            {/* Header control buttons */}
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-rose-500" /> Escolha Seus Ingredientes
              </h4>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-xl hover:bg-slate-100 text-sm font-medium"
              >
                Voltar à Loja
              </button>
            </div>

            {/* 1. Cup Size Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-rose-500" /> 1. {isLinhaBrownie ? 'Escolha seu Brownie Favorito' : isMilkshake ? 'Escolha o Tamanho do Milkshake' : 'Escolha o Tamanho do Copo'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(isLinhaBrownie
                  ? (['400ml', '500ml', '700ml'] as const)
                  : (['300ml', '400ml', '500ml', '700ml'] as const)
                ).map((sz) => {
                  const isSelected = size === sz;
                  
                  // Dynamically scale icons representing the cup volume
                  const iconSizeClass = 
                    sz === '300ml' ? 'w-4 h-4 text-rose-450' :
                    sz === '400ml' ? 'w-[18px] h-[18px] text-rose-500' :
                    sz === '500ml' ? 'w-5 h-5 text-rose-600 font-bold' :
                    'w-6 h-6 text-purple-650';

                  // Custom labels for Linha Brownie
                  const label = isLinhaBrownie
                    ? sz === '400ml' ? 'Copo Brownie 400ml'
                      : sz === '500ml' ? 'Caixinha Brownie'
                      : 'Balde Brownie 700ml'
                    : sz;

                  // Custom price logic
                  const price = isLinhaBrownie
                    ? sz === '400ml' ? 22.90
                      : sz === '500ml' ? 28.90
                      : 34.90
                    : isMilkshake
                      ? sz === '300ml' ? 15.00 : sz === '400ml' ? 18.00 : sz === '500ml' ? 21.00 : 25.00
                      : getCustomCupBasePrice(sz);

                  return (
                    <button
                      key={sz}
                      onClick={() => {
                        setSize(sz);
                        if (base === 'acai' || base === 'casadinho') {
                          setSelectedFlavors(['acai-puro-organico']);
                        } else {
                          setSelectedFlavors([]); // resets to avoid exceeding limits
                        }
                      }}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/50 text-rose-600 font-extrabold shadow-sm scale-[1.03]'
                          : 'border-slate-200 hover:border-slate-300 text-slate-800 font-semibold hover:bg-slate-50'
                      }`}
                    >
                      <CupSoda className={`${iconSizeClass} ${isSelected ? '' : 'opacity-70'}`} />
                      <div>
                        {isLinhaBrownie ? (
                          <p className="text-xs font-bold leading-tight line-clamp-2 md:truncate">{label}</p>
                        ) : (
                          <p className="text-sm">{label}</p>
                        )}
                        <p className="text-[10px] opacity-75 mt-0.5 font-medium">
                          R$ {price.toFixed(2)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Base Selection (Açai vs Ice Cream) */}
            {!isMilkshake && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">2. Qual a base do copo?</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'acai', name: 'Açaí Puro', desc: 'Apenas polpa açaí' },
                    { id: 'sorvete', name: 'Sorvetes', desc: 'Apenas sorvete' },
                    { id: 'casadinho', name: 'Casadinho', desc: 'Açaí + Sorvete' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setBase(b.id as any);
                        if (b.id === 'acai' || b.id === 'casadinho') {
                          setSelectedFlavors(['acai-puro-organico']);
                        } else {
                          setSelectedFlavors([]); // Reset flavors
                        }
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        base === b.id
                          ? 'border-purple-600 bg-purple-50/50 text-purple-700 font-bold shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <span className="block text-sm font-bold">{b.name}</span>
                      <span className="block text-[10px] opacity-75 mt-0.5">{b.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Flavors / Polpas Selection */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-slate-700">
                  {isMilkshake ? '2. Escolha o sabor do sorvete para bater:' : '3. Escolha seus sabores:'}{' '}
                  <span className="text-slate-500 font-normal">
                    ({isMilkshake ? 'Selecione exatamente 1 sabor' : `Selecione até ${maxFlavors}`})
                  </span>
                </label>
                <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                  {selectedFlavors.length}/{maxFlavors}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-2"></p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[140px] overflow-y-auto pr-1">
                {availableFlavors.map((flv) => {
                  const isSelected = selectedFlavors.includes(flv.id);
                  const isMaxReached = selectedFlavors.length >= maxFlavors;
                  const isFixed = flv.id === 'acai-puro-organico' && (base === 'acai' || base === 'casadinho');
                  return (
                    <button
                      key={flv.id}
                      disabled={(!isSelected && isMaxReached) || isFixed}
                      onClick={() => handleFlavorToggle(flv.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/40 text-rose-900 font-medium'
                          : 'border-slate-100 hover:border-slate-200 text-slate-700'
                      } ${!isSelected && isMaxReached && !isFixed ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${
                        isFixed ? 'bg-purple-50/40 border-purple-300 text-purple-950 cursor-default' : ''
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0"
                        style={{ background: flv.color }}
                      />
                      <span className="text-xs truncate font-semibold">
                        {flv.name}
                        {isFixed && (
                          <span className="block text-[9px] text-purple-600 font-black tracking-normal leading-none mt-0.5">
                            (Sabor Fixo)
                          </span>
                        )}
                      </span>
                      {isSelected && (
                        <div className={`absolute top-1 right-1 text-white rounded-full p-0.5 ${isFixed ? 'bg-purple-600' : 'bg-rose-500'}`}>
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Toppings Checklist (Tabs categorized) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                {isMilkshake ? '3. Escolha seus adicionais (Opcional):' : '4. Toppings & Adicionais Extra (À Vontade)'}
              </label>
              
              <div className="space-y-4">
                {(Object.entries(toppingsByCategory) as [string, ToppingOption[]][]).map(([catName, list]) => {
                  if (list.length === 0) return null;
                  const catLabel = 
                    catName === 'cortesia' ? 'Cortesia Inclusa (Grátis!)' :
                    catName === 'creme' ? 'Cremes & Trufas' :
                    catName === 'fruta' ? 'Frutas Frescas' :
                    catName === 'crocante' ? 'Crocantes & Chocolates' : 'Caldas & Coberturas';

                  return (
                    <div key={catName} className="space-y-1.5">
                      <h5 className={`text-xs font-bold uppercase tracking-wider ${catName === 'cortesia' ? 'text-emerald-600' : 'text-slate-400'}`}>{catLabel}</h5>
                      <div className="grid grid-cols-2 gap-2">
                        {list.map((topping) => {
                          const isSelected = selectedToppings.includes(topping.id);
                          return (
                            <button
                              key={topping.id}
                              onClick={() => handleToppingToggle(topping.id)}
                              className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? topping.price === 0
                                    ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 font-bold'
                                    : 'border-amber-500 bg-amber-50/50 text-amber-900 font-bold'
                                  : 'border-slate-100 hover:border-slate-200 text-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                                <span className={`w-2 h-2 rounded-full ${isSelected ? topping.price === 0 ? 'bg-emerald-500' : 'bg-amber-500' : 'bg-slate-200'}`} />
                                <span className="text-xs truncate">{topping.name}</span>
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold flex-shrink-0 ${topping.price === 0 ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-neutral-100 text-neutral-600'}`}>
                                {topping.price === 0 ? 'GRÁTIS' : `+ R$ ${topping.price.toFixed(2)}`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Extra Brownie Products (Only if isLinhaBrownie) */}
            {isLinhaBrownie && (
              <div className="bg-rose-50/20 p-4 rounded-2xl border border-rose-100/60 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">🍫</span>
                  <div>
                    <h4 className="text-sm font-bold text-rose-950">Mais Delícias da Linha Brownie</h4>
                    <p className="text-[10px] text-rose-800 font-medium leading-tight">Quer adicionar outros produtos fresquinhos e irresistíveis ao seu pedido?</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {EXTRA_BROWNIE_PRODUCTS.map((prod) => {
                    const currentQty = extraBrownieProducts[prod.id] || 0;
                    return (
                      <div key={prod.id} className="flex items-center justify-between bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-rose-50/50 hover:border-rose-100 transition-colors shadow-xs">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-800 truncate">{prod.name}</p>
                          <p className="text-[10px] text-slate-500 leading-tight line-clamp-1">{prod.desc}</p>
                          <p className="text-xs text-rose-600 font-extrabold mt-0.5">R$ {prod.price.toFixed(2)}</p>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {currentQty > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setExtraBrownieProducts((prev) => ({
                                  ...prev,
                                  [prod.id]: Math.max(0, currentQty - 1)
                                }));
                              }}
                              className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-lg text-xs cursor-pointer active:scale-95 transition-all"
                            >
                              -
                            </button>
                          )}
                          
                          {currentQty > 0 ? (
                            <span className="text-xs font-black text-rose-600 w-4 text-center">{currentQty}</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setExtraBrownieProducts((prev) => ({
                                  ...prev,
                                  [prod.id]: 1
                                }));
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/50 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                            >
                              Adicionar
                            </button>
                          )}

                          {currentQty > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setExtraBrownieProducts((prev) => ({
                                  ...prev,
                                  [prod.id]: currentQty + 1
                                }));
                              }}
                              className="w-7 h-7 flex items-center justify-center bg-rose-500 hover:bg-rose-600 text-white font-black rounded-lg text-xs cursor-pointer active:scale-95 transition-all"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes Input */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Observações do Pedido</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Mandar a calda separada, colocar a granola no fundo do copo, etc..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none h-14"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-neutral-100 flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddCupToCart}
              disabled={base !== 'acai' && selectedFlavors.length === 0}
              className={`flex-2 py-3 px-6 rounded-2xl font-bold shadow-md transition-all flex items-center justify-center gap-2 text-sm text-white ${
                base === 'acai' || selectedFlavors.length > 0
                  ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-100'
                  : 'bg-neutral-300 cursor-not-allowed shadow-none'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {base === 'acai' || selectedFlavors.length > 0 ? 'Adicionar ao Carrinho' : 'Selecione ao menos 1 Sabor'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
