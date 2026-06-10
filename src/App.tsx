/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Search, 
  Sparkles, 
  Timer, 
  MapPin, 
  Clock, 
  Phone, 
  Instagram, 
  Maximize2, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight, 
  Star, 
  Compass, 
  X, 
  Download, 
  Heart,
  Smartphone
} from 'lucide-react';

import { MenuItem, CartItem, Order, CheckoutDetails, OrderStatus } from './types';
import { MENU_ITEMS, FLAVOR_OPTIONS, TOPPING_OPTIONS } from './data';
import CupCustomizer from './components/CupCustomizer';
import Checkout from './components/Checkout';
import OrderTracker from './components/OrderTracker';
import PlayStoreMobileHub from './components/PlayStoreMobileHub';

const BannerImage = "/src/assets/images/supreme_banner_1780583592745.png";
const LogoImage = "/src/assets/images/supreme_logo_1780583608054.png";

export default function App() {
  const [activeTab, setActiveTab] = useState<'menu' | 'tracker' | 'playstore'>('menu');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'acai' | 'sorvete' | 'milkshake' | 'sundae'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Customizer state
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  // Checkout & orders
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  
  // Privacy policy modal state
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Load orders and cart from local storage on mount
  useEffect(() => {
    const savedOrders = localStorage.getItem('supreme_orders');
    if (savedOrders) {
      try {
        setOrders(JSON.parse(savedOrders));
      } catch (e) {
        console.error('Error parsing saved orders', e);
      }
    }

    const savedCart = localStorage.getItem('supreme_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error parsing saved cart', e);
      }
    }

    // Check for privacy parameter to display policy immediately (perfect for Google Play Store compliance)
    const params = new URLSearchParams(window.location.search);
    if (params.get('privacy') === 'true' || params.get('politica') === 'true') {
      setIsPrivacyOpen(true);
    }
  }, []);

  // Save changes to localstorage
  useEffect(() => {
    localStorage.setItem('supreme_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('supreme_orders', JSON.stringify(orders));
  }, [orders]);

  // Automated Background Timer to simulate order tracking progression
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders((prevOrders) => {
        let updated = false;
        const newOrders = prevOrders.map((order) => {
          if (order.status !== 'completed') {
            updated = true;
            let nextStatus: OrderStatus = order.status;
            
            if (order.status === 'waiting') {
              nextStatus = 'preparing';
            } else if (order.status === 'preparing') {
              nextStatus = 'delivering';
            } else if (order.status === 'delivering') {
              nextStatus = 'completed';
            }
            
            return { ...order, status: nextStatus };
          }
          return order;
        });

        if (updated) {
          // Update active tracking reference too if open
          if (activeTrackingOrder) {
            const currentActive = newOrders.find((o) => o.id === activeTrackingOrder.id);
            if (currentActive) {
              setActiveTrackingOrder(currentActive);
            }
          }
          return newOrders;
        }
        return prevOrders;
      });
    }, 15000); // Progresses status every 15 seconds for illustrative visual demonstration!

    return () => clearInterval(interval);
  }, [activeTrackingOrder]);

  // Handle manually forcing simulation status advance
  const handleForceStatusAdvance = () => {
    if (!activeTrackingOrder) return;
    
    setOrders((prevOrders) => {
      const newOrders = prevOrders.map((order) => {
        if (order.id === activeTrackingOrder.id) {
          let nextStatus: OrderStatus = order.status;
          if (order.status === 'waiting') nextStatus = 'preparing';
          else if (order.status === 'preparing') nextStatus = 'delivering';
          else if (order.status === 'delivering') nextStatus = 'completed';
          
          const updatedOrder = { ...order, status: nextStatus };
          setActiveTrackingOrder(updatedOrder);
          return updatedOrder;
        }
        return order;
      });
      return newOrders;
    });
  };

  // Add standard product to cart
  const handleAddProductToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((cartItem) => cartItem.menuItem.id === item.id && !cartItem.isCustomCup);
      if (existing) {
        return prev.map((cartItem) =>
          cartItem.menuItem.id === item.id && !cartItem.isCustomCup
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${item.id}`,
          menuItem: item,
          quantity: 1,
        },
      ];
    });
  };

  // Add customized cup to cart
  const handleAddCustomCupToCart = (customCartItem: CartItem) => {
    setCart((prev) => [...prev, customCartItem]);
    setIsCartOpen(true);
  };

  // Adjust cart quantities
  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove cart item
  const handleRemoveCartItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Get total cart items count
  const cartItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Get total cart price
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = item.isCustomCup ? (item.customCupPrice || 0) : item.menuItem.price;
      return acc + price * item.quantity;
    }, 0);
  }, [cart]);

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Handle Checkout finish & saving order
  const handlePlaceOrder = (details: CheckoutDetails) => {
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      items: cart,
      total: cartSubtotal + (details.deliveryType === 'delivery' ? 5.00 : 0.00),
      details,
      status: 'waiting',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setOrders((prev) => [newOrder, ...prev]);
    setCart([]); // Clear cart
    setIsCheckoutOpen(false);
    setActiveTrackingOrder(newOrder);
    setActiveTab('tracker');
  };

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans selection:bg-rose-100 selection:text-rose-900 overflow-x-hidden">
      
      {/* 1. Header Area with Logo and Cart controls */}
      <header className="sticky top-0 z-40 bg-white border-b border-rose-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Brand title */}
          <div 
            onClick={() => {
              setActiveTab('menu');
              setActiveTrackingOrder(null);
            }}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-rose-400 rounded-full flex items-center justify-center text-white font-black text-xl shadow-sm overflow-hidden border border-rose-200">
              <img 
                src={LogoImage} 
                alt="Logo Sorveteria Supreme" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-rose-600 uppercase flex items-center gap-1.5 leading-none">
                SUPREME <span className="text-gray-400 font-light italic lowercase text-[15px]">Ice Cream</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">
                  Aberto • Sorocaba
                </span>
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => {
                setActiveTab('menu');
                setActiveTrackingOrder(null);
              }}
              className={`text-xs font-black tracking-widest uppercase transition-colors py-2 px-1 ${
                activeTab === 'menu' && !activeTrackingOrder ? 'text-rose-600 border-b-2 border-rose-500' : 'text-slate-400 hover:text-slate-850'
              }`}
            >
              Cardápio
            </button>
            {orders.length > 0 && (
              <button
                onClick={() => {
                  setActiveTrackingOrder(orders[0]); // defaults to latest order
                  setActiveTab('tracker');
                }}
                className={`text-xs font-black tracking-widest uppercase transition-colors py-2 px-1 ${
                  activeTab === 'tracker' ? 'text-rose-600 border-b-2 border-rose-500' : 'text-slate-400 hover:text-slate-850'
                }`}
              >
                Acompanhar Pedido
              </button>
            )}
            <button
              onClick={() => {
                setActiveTab('playstore');
                setActiveTrackingOrder(null);
              }}
              className={`text-xs font-black tracking-widest uppercase transition-colors py-2 px-1 ${
                activeTab === 'playstore' ? 'text-rose-600 border-b-2 border-rose-500' : 'text-slate-400 hover:text-slate-850'
              }`}
            >
              Baixar App PlayStore
            </button>
          </nav>

          {/* Right Action panel */}
          <div className="flex items-center gap-2.5">
            {/* Quick access to play store on small headers */}
            <button
              onClick={() => {
                setActiveTab('playstore');
                setActiveTrackingOrder(null);
              }}
              className="md:hidden p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              title="Baixar App"
            >
              <Smartphone className="w-5 h-5" />
            </button>

            {/* Float Cart indicator */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-[20px] p-3 px-5 flex items-center gap-2.5 font-black text-xs shadow-md shadow-rose-100 hover:shadow-lg transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{cartItemCount}</span>
              <span className="hidden sm:inline opacity-80 pl-1.5 border-l border-white/20">R$ {cartSubtotal.toFixed(2)}</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. Floating Action Banner for existing active order tracking */}
      {orders.length > 0 && orders[0].status !== 'completed' && activeTab !== 'tracker' && (
        <div className="bg-gradient-to-r from-amber-500 to-rose-500 text-white py-2.5 px-4 flex items-center justify-between text-xs font-bold leading-normal relative z-30 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Seu pedido #{orders[0].id.slice(-6).toUpperCase()} está em preparação: <span className="underline uppercase">{orders[0].status === 'waiting' ? 'Aguardando' : orders[0].status === 'preparing' ? 'Montando Copo' : 'A Caminho'}</span></span>
          </div>
          <button
            onClick={() => {
              setActiveTrackingOrder(orders[0]);
              setActiveTab('tracker');
            }}
            className="bg-white text-rose-600 px-3 py-1 rounded-xl hover:bg-neutral-50 transition-colors flex items-center gap-1 flex-shrink-0"
          >
            Acompanhar <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Main content viewport */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        
        {/* TAB 1: CARDÁPIO (MENU) */}
        {activeTab === 'menu' && !activeTrackingOrder && (
          <div className="space-y-8">
            
            {/* Elegant Hero Banner card */}
            <div className="relative bg-gradient-to-r from-rose-500 to-indigo-650 rounded-3xl h-[260px] md:h-[340px] overflow-hidden shadow-xl flex items-center p-6 md:p-12 text-white">
              <div className="absolute inset-0 z-0">
                <img 
                  src={BannerImage} 
                  alt="Delicious Açaí Bowl and Sunday Gelatos" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-35 hover:scale-105 transition-transform duration-1000" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-pink-950 via-slate-900/80 to-transparent" />
              </div>

              <div className="relative z-10 max-w-lg space-y-4">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 backdrop-blur-md text-amber-300 text-[10px] font-extrabold uppercase rounded-full shadow-inner tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> 100% Artesanal & Natural
                </span>
                <h2 className="text-3xl md:text-5xl font-black leading-tight font-display tracking-tight">
                  Seu Açaí Próprio ou Gelatos Premium
                </h2>
                <p className="text-xs md:text-sm text-neutral-200 font-medium leading-relaxed max-w-md">
                  Escolha na nossa vitrine ou monte seu copo do tamanho da sua fome com ingredientes ilimitados. Entrega garantida, rápida e refrescante em Sorocaba!
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setIsCustomizerOpen(true)}
                    className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold text-xs px-6 py-3.5 rounded-full shadow-lg shadow-rose-950/40 hover:shadow-xl transition-all scale-[1.01] hover:scale-[1.03] flex items-center gap-2 cursor-pointer"
                  >
                    <Compass className="w-4 h-4 animate-spin-slow" /> Monte seu Copo do Seu Jeito
                  </button>
                </div>
              </div>
            </div>
                   {/* Layout Wrapper: Lateral Sidebar on Desktop / Header on Mobile */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              
              {/* Left sidebar: Category pills + Customizer mini widget */}
              <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-5 sticky lg:top-24">
                
                {/* Categories Wrapper Card */}
                <div className="bg-white rounded-[24px] p-5 shadow-xs border border-rose-100/80 flex flex-col gap-4">
                  <div>
                    <span className="text-[10px] bg-rose-50 text-rose-600 font-black tracking-widest uppercase rounded px-2 py-0.5 inline-block">
                      Categorias
                    </span>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mt-1">Explorar Vitrine</h3>
                  </div>
                  
                  <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
                    {[
                      { id: 'all', label: 'Tudo', desc: 'Os mais queridos' },
                      { id: 'acai', label: 'Açaís', desc: 'Combinações divinas' },
                      { id: 'sorvete', label: 'Sorvetes', desc: 'Massa artesanal fina' },
                      { id: 'milkshake', label: 'Milkshakes', desc: 'Batidos e cremosos' },
                      { id: 'sundae', label: 'Taças & Sundaes', desc: 'Sobremesas de colher' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id as any)}
                        className={`text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex-shrink-0 lg:flex-shrink w-auto ${
                          selectedCategory === cat.id
                            ? 'bg-rose-50 border-rose-200 text-rose-700 font-extrabold shadow-xs'
                            : 'bg-transparent border-transparent text-slate-500 hover:bg-rose-50/10 hover:text-slate-800'
                        }`}
                      >
                        <p className={`font-black text-[10px] uppercase tracking-wider ${selectedCategory === cat.id ? 'text-rose-600' : 'text-slate-400'}`}>
                          {cat.label}
                        </p>
                        <p className="text-[11px] font-medium leading-normal mt-0.5 hidden lg:block opacity-85">
                          {cat.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monte seu Copo Quick card */}
                <div className="bg-white rounded-[24px] p-5 shadow-xs border border-rose-100/80 flex flex-col gap-4">
                  <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                    <span className="material-symbols-outlined font-black text-lg">layers</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Monte do Seu Jeito</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                      Escolha copo de 300ml a 700ml e adicione sabores e acompanhamentos ilimitados!
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCustomizerOpen(true)}
                    className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs rounded-[16px] transition-all transform active:scale-95 shadow-xs shadow-rose-100 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-widest"
                  >
                    Customizar Copo
                  </button>
                </div>
              </aside>

              {/* Right section: Products grid area and live search banner */}
              <section className="flex-1 w-full space-y-6">
                
                {/* Search banner */}
                <div className="bg-white p-5 rounded-[24px] border border-rose-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 leading-tight">
                      Sabores que <span className="text-rose-500">encantam o dia.</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Escolha abaixo os melhores açaís e gelatos de Sorocaba</p>
                  </div>

                  <div className="relative w-full sm:max-w-[240px]">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquisar delícias..."
                      className="w-full text-xs p-3 pl-10 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white font-semibold"
                    />
                  </div>
                </div>

                {/* Double action quick launch banner for customizer on mobile highlight banner */}
                <div className="bg-amber-50/50 border border-amber-200/40 rounded-[20px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 lg:hidden">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-white text-lg font-black">
                      +
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-955 uppercase tracking-wide">Monte seu Copo agora!</h4>
                      <p className="text-[11px] text-amber-700">Escolha caldas de canela, trufas, bombons e monte sua sobremesa!</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCustomizerOpen(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-amber-955 font-black text-[10px] py-2 px-4 rounded-xl transition-all shadow-xs"
                  >
                    Personalizar
                  </button>
                </div>

                {/* Grid */}
                {filteredMenuItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMenuItems.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-[32px] p-5 shadow-xs border border-rose-50 flex flex-col justify-between hover:border-rose-200 hover:shadow-md transition-all duration-350 relative group"
                      >
                        {/* Image wrapped in premium frame */}
                        <div>
                          <div className="w-full h-36 bg-rose-50/40 rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center border border-rose-100/20 group">
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500" 
                            />
                            
                            {/* Badges */}
                            <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                              {item.popular && (
                                <span className="bg-rose-500 text-white font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-xs">
                                  Mais Vendido
                                </span>
                              )}
                              {item.tags?.map((tag) => (
                                <span key={tag} className="bg-slate-900/95 text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          <h3 className="text-[17px] font-black text-slate-800 font-display tracking-tight leading-snug line-clamp-1">{item.name}</h3>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1 line-clamp-3">{item.description}</p>
                        </div>

                        {/* Interactive price and checkout trigger */}
                        <div className="flex justify-between items-center mt-5 pt-3 border-t border-rose-50/50">
                          <span className="text-lg font-black text-slate-900">R$ {item.price.toFixed(2)}</span>
                          <button
                            onClick={() => handleAddProductToCart(item)}
                            className="w-10 h-10 bg-rose-500 hover:bg-rose-600 text-white rounded-xl flex items-center justify-center font-black transition-all transform active:scale-90 shadow-xs shadow-rose-100 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-2 bg-white rounded-3xl border border-dashed border-slate-200">
                    <Compass className="w-10 h-10 text-slate-350 mx-auto animate-bounce" />
                    <h4 className="font-bold text-slate-700">Nenhum produto localizado</h4>
                    <p className="text-xs text-slate-400">Verifique se o nome foi digitado corretamente ou mude de categoria.</p>
                  </div>
                )}
              </section>

            </div>

            {/* Testimonials and address block */}
            <div className="bg-white rounded-[32px] border border-rose-100/60 p-6 md:p-8 space-y-6 shadow-xs">
              <h3 className="text-lg font-black text-slate-800 text-center uppercase tracking-wider">Incomparável em Sorocaba! ⭐</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-slate-500">
                <div className="bg-[#FFF9F9] p-5 rounded-2xl border border-rose-50 space-y-2">
                  <div className="flex text-amber-400 gap-0.5"><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /></div>
                  <p className="italic text-slate-650">"O copo montado deles é surreal, mandam muita leite condensado e sorvete de baunilha cremoso!"</p>
                  <p className="font-black text-[9px] uppercase tracking-wider text-rose-500">- Mariana S. (Campolim)</p>
                </div>
                <div className="bg-[#FFF9F9] p-5 rounded-2xl border border-rose-50 space-y-2">
                  <div className="flex text-amber-400 gap-0.5"><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /></div>
                  <p className="italic text-slate-650">"Sempre peço pelo aplicativo, o Pix aprova na hora e o motoboy chega com o sorvete totalmente duro, caprichado!"</p>
                  <p className="font-black text-[9px] uppercase tracking-wider text-rose-500">- Peterson L. (Vila Hortência)</p>
                </div>
                <div className="bg-[#FFF9F9] p-5 rounded-2xl border border-rose-50 space-y-2">
                  <div className="flex text-amber-400 gap-0.5"><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /></div>
                  <p className="italic text-slate-650">"App levíssimo e rápido. Baixei na tela inicial e economiza muito tempo."</p>
                  <p className="font-black text-[9px] uppercase tracking-wider text-rose-500">- Roberto G. (Cerrado)</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: ACOMPANHAMENTO DO PEDIDO (TRACKER) */}
        {activeTab === 'tracker' && activeTrackingOrder && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveTrackingOrder(null);
                  setActiveTab('menu');
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 py-1.5 px-3.5 rounded-xl shadow-xs"
              >
                ← Voltar para Cardápio
              </button>

              <h3 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider">Visualizando Pedido Ativo</h3>
            </div>

            <OrderTracker 
              order={activeTrackingOrder} 
              onClose={() => {
                setActiveTrackingOrder(null);
                setActiveTab('menu');
              }}
              onSimulateStatusProgress={handleForceStatusAdvance}
            />
          </div>
        )}

        {/* If user clicks Orders but tracker was empty, redirect */}
        {activeTab === 'tracker' && !activeTrackingOrder && (
          <div className="text-center py-12 space-y-3 bg-white rounded-3xl border border-dashed border-slate-200">
            <Compass className="w-10 h-10 text-slate-350 mx-auto" />
            <h4 className="font-bold text-slate-700">Nenhum pedido ativo localizado</h4>
            <p className="text-xs text-slate-400">Você ainda não realizou transações nesta sessão. Faça seu primeiro pedido no cardápio!</p>
            <button
              onClick={() => setActiveTab('menu')}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2 px-5 rounded-xl shadow-md cursor-pointer"
            >
              Comprar Gelatos
            </button>
          </div>
        )}

        {/* TAB 3: PLAY STORE HUB */}
        {activeTab === 'playstore' && (
          <div className="space-y-4">
            <button
              onClick={() => setActiveTab('menu')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 py-1.5 px-3.5 rounded-xl shadow-xs"
            >
              ← Voltar para Cardápio
            </button>
            <PlayStoreMobileHub />
          </div>
        )}

      </main>

      {/* 4. Footer info area */}
      <footer className="bg-slate-900 text-white/80 py-8 border-t border-slate-800 text-xs flex-shrink-0 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/5 pb-6">
            <div className="space-y-1">
              <h4 className="text-base font-bold font-display text-white">Sorveteria Supreme</h4>
              <p className="text-[11px] text-white/50">Simulador oficial de pedidos online e integração Google Play.</p>
            </div>
            
            {/* Quick social references */}
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-rose-500" />
                <span className="font-semibold">(15) 99123-4567</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>Av. General Carneiro, 1205 - Vila Lucy - Sorocaba/SP</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-[10px] w-full">
            <p>© 2026 Sorveteria Supreme S.A. Todos os direitos reservados.</p>
            <div className="flex gap-4 items-center flex-wrap justify-center">
              <button 
                onClick={() => setIsPrivacyOpen(true)} 
                className="hover:text-white underline cursor-pointer font-semibold font-sans"
              >
                Política de Privacidade
              </button>
              <span className="text-white/20">•</span>
              <p>Empacotador PWA integrado e otimizado para celulares Android.</p>
            </div>
          </div>
        </div>
      </footer>

      {/* 5. Cart Drawer Overlays */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs" 
            />

            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full"
              >
                
                {/* Drawer header */}
                <div className="p-4 border-b border-rose-100/50 flex justify-between items-center flex-shrink-0">
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-rose-500" /> Meu Carrinho ({cartItemCount})
                  </h3>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="p-1 px-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer content items list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {cart.length > 0 ? (
                    cart.map((item) => {
                      const price = item.isCustomCup ? (item.customCupPrice || 0) : item.menuItem.price;
                      return (
                        <div key={item.id} className="flex gap-3 border-b border-slate-100 pb-3">
                          {/* Mini visual frame */}
                          <div className="w-14 h-14 bg-neutral-100 rounded-xl overflow-hidden flex-shrink-0">
                            <img 
                              src={item.menuItem.image} 
                              alt={item.menuItem.name} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover" 
                            />
                          </div>

                          {/* Detail info */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <h4 className="font-extrabold text-xs text-slate-800 truncate leading-snug">{item.menuItem.name}</h4>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.menuItem.description}</p>
                              {item.notes && (
                                <span className="bg-yellow-50 text-[9px] text-yellow-800 rounded px-1.5 py-0.5 inline-block mt-1 italic">
                                  Obs: {item.notes}
                                </span>
                              )}
                            </div>

                            {/* Quantity settings & price */}
                            <div className="flex items-center justify-between mt-2 pt-0.5">
                              <div className="flex items-center border border-slate-200 rounded-lg bg-neutral-50">
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, -1)}
                                  className="p-1 px-2 text-slate-500 hover:text-rose-500 hover:bg-neutral-100 rounded-l-lg transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-[11px] font-extrabold text-slate-800 px-2">{item.quantity}</span>
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, 1)}
                                  className="p-1 px-2 text-slate-500 hover:text-rose-500 hover:bg-neutral-100 rounded-r-lg transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-slate-700">R$ {(price * item.quantity).toFixed(2)}</span>
                                <button
                                  onClick={() => handleRemoveCartItem(item.id)}
                                  className="text-slate-350 hover:text-rose-500 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-2.5 opacity-60">
                      <ShoppingBag className="w-10 h-10 text-neutral-300" />
                      <div>
                        <h4 className="font-bold text-slate-700">Seu carrinho está vazio</h4>
                        <p className="text-[11px] text-slate-400">Adicione delícias gelatinosas do cardápio e monte seu copo ideal!</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Drawer actions details footer */}
                <div className="p-4 border-t border-rose-100/50 space-y-3.5 flex-shrink-0">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="font-medium">Total Geral do Carrinho:</span>
                    <span className="font-black text-rose-600 text-lg">R$ {cartSubtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="flex-1 py-3 text-xs font-bold bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-xl transition-all"
                    >
                      Continuar Comprando
                    </button>
                    <button
                      disabled={cart.length === 0}
                      onClick={() => {
                        setIsCartOpen(false);
                        setIsCheckoutOpen(true);
                      }}
                      className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all shadow-md text-white ${
                        cart.length > 0 
                          ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-100' 
                          : 'bg-neutral-300 shadow-none cursor-not-allowed'
                      }`}
                    >
                      Pagar e Finalizar
                    </button>
                  </div>
                </div>

              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Customizer Work Modal */}
      <AnimatePresence>
        {isCustomizerOpen && (
          <CupCustomizer 
            onClose={() => setIsCustomizerOpen(false)} 
            onAddToCart={handleAddCustomCupToCart} 
          />
        )}
      </AnimatePresence>

      {/* 7. Checkout Work Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <Checkout 
            cartItems={cart}
            totalAmount={cartSubtotal}
            onClose={() => setIsCheckoutOpen(false)}
            onPlaceOrder={handlePlaceOrder}
          />
        )}
      </AnimatePresence>

      {/* 8. Privacy Policy Modal */}
      <AnimatePresence>
        {isPrivacyOpen && (
          <div className="fixed inset-0 z-55 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPrivacyOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
            />

            {/* Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 relative z-50 animate-fadeIn"
            >
              {/* Header */}
              <div className="p-5 border-b border-rose-50 flex justify-between items-center bg-gradient-to-r from-rose-500/5 to-indigo-500/5">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm font-sans">
                    Política de Privacidade
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">Sorveteria Supreme • Versão Google Play Compliance</p>
                </div>
                <button
                  onClick={() => setIsPrivacyOpen(false)}
                  className="p-1 px-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div id="privacy-policy-text" className="p-6 overflow-y-auto space-y-4 text-xs font-semibold text-slate-600 leading-relaxed">
                <p className="font-extrabold text-slate-800">
                  Última atualização: Junho de 2026
                </p>
                
                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-800 text-xs font-sans">1. Informações Gerais</h4>
                  <p>
                    Este aplicativo ("Sorveteria Supreme") foi desenvolvido para facilitar pedidos online, entrega e consulta de de produtos da Sorveteria Supreme de Sorocaba/SP. Respeitamos a sua privacidade e estamos comprometidos em proteger os dados pessoais que você compartilha conosco.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-800 text-xs font-sans">2. Dados Coletados e Finalidade</h4>
                  <p>
                    Para podermos processar pedidos e realizar a entrega com precisão, o aplicativo poderá solicitar:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-500">
                    <li><strong>Nome Completo:</strong> Para identificação do cliente no pedido.</li>
                    <li><strong>Número de Telefone/WhatsApp:</strong> Para contato direto, suporte e atualizações de entrega.</li>
                    <li><strong>Endereço de Entrega:</strong> Para que possamos calcular rotas e entregar seu pedido corretamente.</li>
                    <li><strong>Tipo de Pagamento (PIX ou Cartão):</strong> Apenas para controle interno do método selecionado de pagamento (não processamos ou armazenamos dados confidenciais de cartões de segurança no aplicativo).</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-800 text-xs font-sans">3. Armazenamento Local e Segurança</h4>
                  <p>
                    A Sorveteria Supreme coleta e gerencia estes dados apenas localmente em seu dispositivo (através do seu navegador web) usando recursos do próprio sistema local (localStorage do PWA). Nenhum dado do seu cartão ou endereço pessoal é transferido para servidores de terceiros ou comercializado para fins de marketing.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-800 text-xs font-sans">4. Direitos do Usuário (LGPD)</h4>
                  <p>
                    De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem total controle sobre seus dados:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-500">
                    <li>Visualizar todos os seus dados e pedidos efetuados.</li>
                    <li>Excluir ou limpar todos os seus dados e histórico de pedidos a qualquer momento (basta limpar o cache do seu navegador ou desinstalar o aplicativo).</li>
                    <li>Recusar o compartilhamento de sua localização aproximada.</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-800 text-xs font-sans">5. Responsável e Contato</h4>
                  <p>
                    Para dúvidas adicionais, solicitações ou suporte, entre em contato diretamente com o responsável de atendimento ao cliente:
                  </p>
                  <p className="bg-slate-50 p-3 rounded-2xl text-[10px] text-slate-700 font-mono space-y-1 mt-1 border border-slate-100">
                    <strong>Sorveteria Supreme Sorocaba</strong><br />
                    Telefone/WhatsApp: (15) 99123-4567<br />
                    Endereço: Av. General Carneiro, 1205 - Vila Lucy - Sorocaba/SP<br />
                    E-mail: brfariarm@gmail.com
                  </p>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 border-t border-rose-50 flex gap-3 items-center bg-slate-50 justify-between">
                <button
                  onClick={() => {
                    const txt = `POLÍTICA DE PRIVACIDADE – SORVETERIA SUPREME

Última atualização: Junho de 2026

1. Informações Gerais
Este aplicativo ("Sorveteria Supreme") foi desenvolvido para facilitar pedidos online, entrega e consulta de produtos da Sorveteria Supreme de Sorocaba/SP. Respeitamos a sua privacidade e estamos comprometidos em proteger os dados pessoais que você compartilha conosco.

2. Dados Coletados e Finalidade
Para podermos processar pedidos e realizar a entrega com precisão, o aplicativo poderá solicitar:
- Nome Completo: Para identificação do cliente no pedido.
- Número de Telefone/WhatsApp: Para contato direto, suporte e atualizações de entrega.
- Endereço de Entrega: Para que possamos calcular rotas e entregar seu pedido corretamente.
- Tipo de Pagamento (PIX ou Cartão): Apenas para controle interno do método selecionado de pagamento (não processamos ou armazenamos dados confidenciais de cartões de segurança no aplicativo).

3. Armazenamento Local e Segurança
A Sorveteria Supreme coleta e gerencia estes dados apenas localmente em seu dispositivo (através do seu navegador web) usando recursos do próprio sistema local (localStorage do PWA). Nenhum dado do seu cartão ou endereço pessoal é transferido para servidores de terceiros ou comercializado para fins de marketing.

4. Direitos do Usuário (LGPD)
De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem total controle sobre seus dados:
- Visualizar todos os seus dados e pedidos efetuados.
- Excluir ou limpar todos os seus dados e histórico de pedidos a qualquer momento (basta limpar o cache do seu navegador ou desinstalar o aplicativo).
- Recusar o compartilhamento de sua localização aproximada.

5. Responsável e Contato
Para dúvidas adicionais, solicitações ou suporte, entre em contato diretamente com o responsável de atendimento ao cliente:
Sorveteria Supreme Sorocaba
Telefone/WhatsApp: (15) 99123-4567
Endereço: Av. General Carneiro, 1205 - Vila Lucy - Sorocaba/SP
E-mail: brfariarm@gmail.com`;
                    navigator.clipboard.writeText(txt);
                    alert("Texto da política copiado para a área de transferência com sucesso!");
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Copiar Texto
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const urlWithQuery = window.location.origin + "/?privacy=true";
                      navigator.clipboard.writeText(urlWithQuery);
                      alert("Link da Política copiado! Use este link exato no Google Play Console.");
                    }}
                    className="bg-white border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Copia o link exato que exibe a política imediatamente"
                  >
                    Copiar Link p/ Console
                  </button>
                  <button
                    onClick={() => setIsPrivacyOpen(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
