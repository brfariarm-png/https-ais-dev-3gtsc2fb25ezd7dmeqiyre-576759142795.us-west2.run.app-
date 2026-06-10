/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, Check, ShoppingBag, Sparkles, Layers } from 'lucide-react';
import { ToppingOption, FlavorOption, CustomCupConfig, CartItem, MenuItem } from '../types';
import { FLAVOR_OPTIONS, TOPPING_OPTIONS, getCustomCupBasePrice } from '../data';

interface CupCustomizerProps {
  onAddToCart: (item: CartItem) => void;
  onClose: () => void;
}

export default function CupCustomizer({ onAddToCart, onClose }: CupCustomizerProps) {
  const [size, setSize] = useState<'300ml' | '500ml' | '700ml'>('500ml');
  const [base, setBase] = useState<'acai' | 'sorvete' | 'casadinho'>('casadinho');
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Max flavors allowed depends on size
  const maxFlavors = size === '300ml' ? 2 : 3;

  // Filter flavors based on base type chosen
  const availableFlavors = useMemo(() => {
    if (base === 'acai') {
      return FLAVOR_OPTIONS.filter((f) => f.category === 'acai');
    }
    if (base === 'sorvete') {
      return FLAVOR_OPTIONS.filter((f) => f.category === 'sorvete');
    }
    return FLAVOR_OPTIONS; // casadinho gets both!
  }, [base]);

  // Toppings sorted by category for clean tabs/sections
  const toppingsByCategory = useMemo(() => {
    const categories: Record<string, ToppingOption[]> = {
      creme: [],
      fruta: [],
      crocante: [],
      calda: [],
    };
    TOPPING_OPTIONS.forEach((topping) => {
      if (categories[topping.category]) {
        categories[topping.category].push(topping);
      }
    });
    return categories;
  }, []);

  const basePrice = getCustomCupBasePrice(size);

  const toppingsPrice = useMemo(() => {
    return selectedToppings.reduce((total, id) => {
      const topping = TOPPING_OPTIONS.find((t) => t.id === id);
      return total + (topping ? topping.price : 0);
    }, 0);
  }, [selectedToppings]);

  const totalPrice = basePrice + toppingsPrice;

  const handleFlavorToggle = (id: string) => {
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
    // Generate a dummy item representing this custom cup
    const representationItem: MenuItem = {
      id: `custom-cup-${Date.now()}`,
      name: `Monte seu Copo (${size})`,
      description: `Copo personalizado de ${size} (${base === 'acai' ? 'Somente Açaí' : base === 'sorvete' ? 'Somente Sorvete' : 'Açaí e Sorvete'}). Sabores: ${
        selectedFlavors.map((fId) => FLAVOR_OPTIONS.find((f) => f.id === fId)?.name).join(', ') || 'Nenhum'
      }. Acompanhamentos: ${
        selectedToppings.map((tId) => TOPPING_OPTIONS.find((t) => t.id === tId)?.name).join(', ') || 'Nenhum'
      }.`,
      price: totalPrice,
      category: base === 'acai' ? 'acai' : 'sorvete',
      image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&q=80&w=600', // Açaí/Ice cream visual representation
      customizable: true,
    };

    const config: CustomCupConfig = {
      size,
      base,
      flavors: selectedFlavors,
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 overflow-y-auto flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 max-h-[90vh]"
      >
        {/* Left pane: Gorgeous Cup Live visualizer (5 columns) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-rose-50 to-amber-50 p-6 flex flex-col justify-between border-r border-rose-100/40 relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-pink-200/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-200/20 rounded-full blur-3xl" />

          {/* Header info */}
          <div className="relative z-10 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full uppercase tracking-wider shadow-sm mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Monte seu Copo
            </span>
            <h3 className="text-2xl font-bold text-slate-800 leading-tight">Monte sua Obra-Prima</h3>
            <p className="text-sm text-slate-500 mt-1">Crie a combinação perfeita de açaí e gelatos com adicionais!</p>
          </div>

          {/* Interactive Live Cup Render */}
          <div className="my-8 flex justify-center items-center relative py-4 flex-1">
            {/* Liquid Cup Container */}
            <div className="relative w-52 h-72 flex flex-col justify-end items-center">
              {/* Cup outlines */}
              <div 
                className="absolute border-2 border-white/60 bg-white/20 backdrop-blur-[2px] rounded-b-3xl z-20 overflow-hidden shadow-lg transition-all duration-300"
                style={{
                  width: size === '300ml' ? '160px' : size === '500ml' ? '185px' : '210px',
                  height: size === '300ml' ? '200px' : size === '500ml' ? '240px' : '280px',
                  borderRadius: '12px 12px 48px 48px',
                }}
              >
                {/* Fill content (rendered list representing selected gelatos / açaí layers) */}
                <div className="h-full w-full flex flex-col justify-end">
                  {renderedFlavorsForVisual.map((flavor, index) => {
                    if (!flavor) return null;
                    return (
                      <motion.div
                        key={flavor.id + '-' + index}
                        initial={{ height: 0 }}
                        animate={{ height: `${100 / renderedFlavorsForVisual.length}%` }}
                        transition={{ type: 'spring', damping: 20 }}
                        style={{
                          background: `linear-gradient(135deg, ${flavor.color}, ${flavor.secondaryColor || flavor.color})`,
                        }}
                        className="w-full relative shadow-[dotted_0_4px_10px_rgba(0,0,0,0.15)] flex justify-center items-center border-t border-white/10"
                      >
                        <span className="text-[10px] text-white/85 font-medium tracking-wide drop-shadow-md text-center px-2 line-clamp-1 pointer-events-none">
                          {flavor.name}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Cup Lip Accent */}
              <div 
                className="absolute top-[-4px] border-b-[3px] border-white/80 bg-white/30 backdrop-blur-[3px] z-25 rounded-md shadow-sm"
                style={{
                  width: size === '300ml' ? '172px' : size === '500ml' ? '198px' : '224px',
                  height: '10px',
                  top: size === '300ml' ? '72px' : size === '500ml' ? '32px' : '0px',
                }}
              />

              {/* Spoon inside cup */}
              <motion.div
                initial={{ y: -30, rotate: -15 }}
                animate={{ y: 0, rotate: -5 }}
                className="absolute z-26 bg-gradient-to-b from-amber-400 to-amber-600 w-3 rounded-full origin-bottom"
                style={{
                  height: size === '300ml' ? '180px' : size === '500ml' ? '220px' : '260px',
                  top: size === '300ml' ? '20px' : size === '500ml' ? '-10px' : '-40px',
                  right: size === '300ml' ? '15px' : size === '500ml' ? '25px' : '35px',
                  borderRadius: '10px 10px 0px 0px',
                  boxShadow: '2px 4px 6px rgba(0,0,0,0.15)',
                }}
              />

              {/* Rendered Toppings on Top */}
              <div 
                className="absolute z-30 flex flex-wrap gap-1 justify-center px-4"
                style={{
                  width: size === '300ml' ? '160px' : size === '500ml' ? '185px' : '210px',
                  top: size === '300ml' ? '60px' : size === '500ml' ? '20px' : '-12px',
                }}
              >
                <AnimatePresence>
                  {selectedToppings.map((tId) => {
                    const topping = TOPPING_OPTIONS.find((t) => t.id === tId);
                    if (!topping) return null;
                    return (
                      <motion.span
                        key={topping.id}
                        initial={{ scale: 0, opacity: 0, y: -10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0, opacity: 0, y: -10 }}
                        className="bg-white/90 text-amber-900 border border-amber-200/50 rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow-md hover:bg-neutral-50"
                      >
                        {topping.name}
                      </motion.span>
                    );
                  })}
                </AnimatePresence>
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
              <p className="font-semibold text-slate-700">Base: R$ {basePrice.toFixed(2)}</p>
              <p>Extras: R$ {toppingsPrice.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Right pane: Customizer options checklist (7 columns) */}
        <div className="lg:col-span-7 bg-white p-6 flex flex-col justify-between overflow-y-auto max-h-[80vh] lg:max-h-[90vh]">
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
              <label className="block text-sm font-bold text-slate-700 mb-2">1. Escolha o Tamanho do Copo</label>
              <div className="grid grid-cols-3 gap-3">
                {(['300ml', '500ml', '700ml'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      setSize(sz);
                      setSelectedFlavors([]); // resets to avoid exceeding limits
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      size === sz
                        ? 'border-rose-500 bg-rose-50/50 text-rose-600 font-extrabold shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 font-semibold'
                    }`}
                  >
                    <p className="text-base">{sz}</p>
                    <p className="text-[11px] opacity-75 mt-0.5">R$ {getCustomCupBasePrice(sz).toFixed(2)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Base Selection (Açai vs Ice Cream) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">2. Qual a base do copo?</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'acai', name: 'Açaí Puro', desc: 'Apenas polpa açaí' },
                  { id: 'sorvete', name: 'Sorvetes', desc: 'Apenas gelatos' },
                  { id: 'casadinho', name: 'Casadinho', desc: 'Açaí + Gelatos' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setBase(b.id as any);
                      setSelectedFlavors([]); // Reset flavors
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

            {/* 3. Flavors / Polpas Selection */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-slate-700">
                  3. Escolha seus sabores{' '}
                  <span className="text-slate-500 font-normal">
                    (Selecione até {maxFlavors})
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
                  return (
                    <button
                      key={flv.id}
                      disabled={!isSelected && isMaxReached}
                      onClick={() => handleFlavorToggle(flv.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/40 text-rose-900 font-medium'
                          : 'border-slate-100 hover:border-slate-200 text-slate-700'
                      } ${!isSelected && isMaxReached ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div 
                        className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0"
                        style={{ background: flv.color }}
                      />
                      <span className="text-xs truncate font-semibold">{flv.name}</span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-0.5">
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
              <label className="block text-sm font-bold text-slate-700 mb-2">4. Toppings & Adicionais Extra (À Vontade)</label>
              
              <div className="space-y-4">
                {(Object.entries(toppingsByCategory) as [string, ToppingOption[]][]).map(([catName, list]) => {
                  const catLabel = 
                    catName === 'creme' ? 'Cremes & Trufas' :
                    catName === 'fruta' ? 'Frutas Frescas' :
                    catName === 'crocante' ? 'Crocantes & Chocolates' : 'Caldas & Coberturas';

                  return (
                    <div key={catName} className="space-y-1.5">
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{catLabel}</h5>
                      <div className="grid grid-cols-2 gap-2">
                        {list.map((topping) => {
                          const isSelected = selectedToppings.includes(topping.id);
                          return (
                            <button
                              key={topping.id}
                              onClick={() => handleToppingToggle(topping.id)}
                              className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? 'border-amber-500 bg-amber-50/50 text-amber-900 font-bold'
                                  : 'border-slate-100 hover:border-slate-200 text-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-500' : 'bg-slate-200'}`} />
                                <span className="text-xs truncate">{topping.name}</span>
                              </div>
                              <span className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded-md font-semibold text-neutral-600 flex-shrink-0">
                                + R$ {topping.price.toFixed(2)}
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
              disabled={selectedFlavors.length === 0}
              className={`flex-2 py-3 px-6 rounded-2xl font-bold shadow-md transition-all flex items-center justify-center gap-2 text-sm text-white ${
                selectedFlavors.length > 0
                  ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-100'
                  : 'bg-neutral-300 cursor-not-allowed shadow-none'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {selectedFlavors.length > 0 ? 'Adicionar ao Carrinho' : 'Selecione ao menos 1 Sabor'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
