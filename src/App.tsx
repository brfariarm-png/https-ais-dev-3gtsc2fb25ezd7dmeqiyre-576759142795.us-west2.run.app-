/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Smartphone,
  Settings,
  ShieldAlert,
  RefreshCw,
  Printer,
  Share2
} from 'lucide-react';

import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  FacebookAuthProvider,
  signOut,
  signInAnonymously,
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  onSnapshot, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

import { MenuItem, CartItem, Order, CheckoutDetails, OrderStatus } from './types';
import { MENU_ITEMS, FLAVOR_OPTIONS, TOPPING_OPTIONS, STORE_CONFIG } from './data';
import CupCustomizer from './components/CupCustomizer';
import Checkout from './components/Checkout';
import OrderTracker from './components/OrderTracker';
import PlayStoreMobileHub from './components/PlayStoreMobileHub';
import SupremeLogo from './components/SupremeLogo';
import { printOrderReceipt } from './utils/printHelper';
import AdminPDV from './components/AdminPDV';
import AdminFechamento from './components/AdminFechamento';
import AdminImpressora from './components/AdminImpressora';
import AdminCardapio from './components/AdminCardapio';

const BannerImage = "/assets/images/supreme_banner_1780583592745.png";
const LogoImage = "/assets/images/supreme_logo_1780583608054.png";

interface VisualNotification {
  id: string;
  orderId: string;
  clientName: string;
  itemsCount: number;
  total: number;
  timestamp: Date;
}

export default function App() {
  // State for authenticated firebase user
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Store dynamic configurations with local persistence
  const [storeSettings, setStoreSettings] = useState(() => {
    const saved = localStorage.getItem('supreme_store_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Migrate legacy Sorocaba and helper placeholders to the new defaults
        const city = (parsed.city === 'Sorocaba' || !parsed.city) ? STORE_CONFIG.city : parsed.city;
        const address = (parsed.address === 'Av. General Carneiro, 1205 - Vila Lucy - Sorocaba/SP' || 
                         parsed.address === 'Av. General Carneiro, 1205 - Vila Lucy - Monte Mor/SP' || 
                         !parsed.address) ? STORE_CONFIG.address : parsed.address;
        const phone = (parsed.phone === '(15) 99123-4567' || !parsed.phone) ? STORE_CONFIG.phone : parsed.phone;

        return {
          name: parsed.name ?? STORE_CONFIG.name,
          shortName: parsed.shortName ?? STORE_CONFIG.shortName,
          city: city,
          address: address,
          phone: phone,
          email: parsed.email ?? STORE_CONFIG.email,
          openTime: parsed.openTime ?? "11:00",
          closeTime: parsed.closeTime ?? "23:00",
          statusOverride: parsed.statusOverride ?? "auto",
          printerPaperWidth: parsed.printerPaperWidth ?? "80mm",
          printerNumCopies: parsed.printerNumCopies ?? 1,
          printerFontSize: parsed.printerFontSize ?? 12,
          printerFontType: parsed.printerFontType ?? "monospace",
          printerShowAddress: parsed.printerShowAddress ?? true,
          printerHeaderMessage: parsed.printerHeaderMessage ?? "Comprovante de Pedido",
          printerFooterMessage: parsed.printerFooterMessage ?? "Muito obrigado pela preferência!",
          instagram: parsed.instagram ?? STORE_CONFIG.instagram
        };
      } catch (e) {
        console.error('Error parsing store settings', e);
      }
    }
    return {
      ...STORE_CONFIG,
      openTime: "11:00",
      closeTime: "23:00",
      statusOverride: "auto" as "auto" | "open" | "closed",
      printerPaperWidth: "80mm" as "58mm" | "80mm",
      printerNumCopies: 1,
      printerFontSize: 12,
      printerFontType: "monospace" as "monospace" | "sans-serif" | "serif",
      printerShowAddress: true,
      printerHeaderMessage: "Comprovante de Pedido",
      printerFooterMessage: "Muito obrigado pela preferência!",
    };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showShareQrModal, setShowShareQrModal] = useState(false);

  const isDevUrl = useMemo(() => {
    return window.location.hostname.includes('ais-dev-');
  }, []);

  // Helper to handle and format Firebase auth errors beautifully in Portuguese
  const handleAuthError = (err: any) => {
    const code = err?.code || '';
    if (code === 'auth/unauthorized-domain') {
      setAuthError(`O domínio "${window.location.hostname}" não está habilitado/autorizado no seu projeto Firebase. Para corrigir, acesse o Console do Firebase (https://console.firebase.google.com/), navegue até "Authentication" -> "Configurações" -> "Domínios Autorizados", e adicione o endereço "${window.location.hostname}" ao checklist. Isso é obrigatório para testar logins em celulares ou urls secundárias.`);
    } else if (code === 'auth/operation-not-allowed') {
      setAuthError('O provedor de login selecionado (Google ou Facebook) ou o login Anônimo não está habilitado no Console do Firebase. Para corrigir, acesse o Console (https://console.firebase.google.com/), navegue até "Authentication" -> "Sign-in method" (Método de login), e ative o "Google", o "Facebook" e o login "Anônimo".');
    } else if (code === 'auth/popup-closed-by-user') {
      setAuthError('A janela de login foi fechada antes de ser finalizada. Por favor, tente novamente.');
    } else if (code === 'auth/popup-blocked') {
      setAuthError('O seu navegador bloqueou a janela pop-up de login. Por favor, ative as pop-ups nas configurações do navegador para entrar.');
    } else if (code === 'auth/account-exists-with-different-credential') {
      setAuthError('Já existe uma conta com o mesmo e-mail vinculada a outro provedor de login (por exemplo, Google). Tente fazer login usando o outro provedor.');
    } else {
      setAuthError(err?.message || 'Ocorreu um erro ao tentar realizar o login.');
    }
  };

  // Sign in logic with Google popup or anonymous
  const handleSignIn = async (providerType: 'google' | 'anonymous') => {
    try {
      setAuthError(null);
      if (providerType === 'google') {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
          prompt: 'select_account'
        });
        await signInWithPopup(auth, provider);
      } else {
        await signInAnonymously(auth);
      }
    } catch (e: any) {
      console.error("Sign-In error:", e);
      handleAuthError(e);
    }
  };

  const handleSignInAuto = async () => {
    setIsAuthModalOpen(true);
  };

  // Listen for redirect results on mount (Google Sign-In page callback)
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          setCurrentUser(result.user);
        }
      } catch (err: any) {
        console.error("Redirect check result error:", err);
        handleAuthError(err);
      }
    };
    checkRedirect();
  }, []);

  // 1. Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Erro no login anônimo silencioso:", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Load settings from Firestore when application boots up
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'store_config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setStoreSettings((prev) => ({
          ...prev,
          name: data.name ?? prev.name,
          shortName: data.shortName ?? prev.shortName,
          city: data.city ?? prev.city,
          address: data.address ?? prev.address,
          phone: data.phone ?? prev.phone,
          email: data.email ?? prev.email,
          openTime: data.openTime ?? prev.openTime,
          closeTime: data.closeTime ?? prev.closeTime,
          statusOverride: data.statusOverride ?? prev.statusOverride,
          printerPaperWidth: data.printerPaperWidth ?? prev.printerPaperWidth,
          printerNumCopies: data.printerNumCopies ?? prev.printerNumCopies,
          printerFontSize: data.printerFontSize ?? prev.printerFontSize,
          printerFontType: data.printerFontType ?? prev.printerFontType,
          printerShowAddress: data.printerShowAddress ?? prev.printerShowAddress,
          printerHeaderMessage: data.printerHeaderMessage ?? prev.printerHeaderMessage,
          printerFooterMessage: data.printerFooterMessage ?? prev.printerFooterMessage,
        }));
      }
    }, (error) => {
      console.log('Read settings skipped or restricted (admin setting):', error.message);
    });
    return () => unsub();
  }, []);

  // 2b. Load dynamic menu from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'menu_items'), (snapshot) => {
      if (!snapshot.empty) {
        const itemsList: MenuItem[] = [];
        snapshot.forEach((docSnap) => {
          itemsList.push({ id: docSnap.id, ...docSnap.data() } as MenuItem);
        });
        // Sort by index, then alphabetically
        itemsList.sort((a, b) => {
          const idxA = (a as any).index ?? 999;
          const idxB = (b as any).index ?? 999;
          if (idxA !== idxB) return idxA - idxB;
          return a.name.localeCompare(b.name);
        });
        setMenuItems(itemsList);
        localStorage.setItem('supreme_menu_items', JSON.stringify(itemsList));
      }
    }, (error) => {
      console.error('Failed to listen to menu_items from Firestore:', error);
    });
    return () => unsub();
  }, []);

  // 2c. Seed default menu items if db is empty (for admin)
  useEffect(() => {
    const seedMenuIfEmpty = async () => {
      if (currentUser?.email === 'brfariarm@gmail.com') {
        try {
          const snap = await getDocs(collection(db, 'menu_items'));
          if (snap.empty) {
            console.log('Database menu_items is empty. Seeding default items...');
            const batch = writeBatch(db);
            MENU_ITEMS.forEach((item, idx) => {
              const itemRef = doc(db, 'menu_items', item.id);
              batch.set(itemRef, {
                name: item.name,
                description: item.description,
                price: item.price,
                category: item.category,
                image: item.image,
                popular: !!item.popular,
                customizable: !!item.customizable,
                tags: item.tags || null,
                index: idx
              });
            });
            await batch.commit();
            console.log('Cohesive seeding of dynamic menu items completed!');
          }
        } catch (e) {
          console.error("Error seeding default menu_items collection:", e);
        }
      }
    };
    if (currentUser) {
      seedMenuIfEmpty();
    }
  }, [currentUser]);

  // 3. Save changes in-place to LocalStorage
  useEffect(() => {
    localStorage.setItem('supreme_store_settings', JSON.stringify(storeSettings));
  }, [storeSettings]);

  // Determine if store is open based on hours or manual override
  const isOpen = useMemo(() => {
    if (storeSettings.statusOverride === 'open') return true;
    if (storeSettings.statusOverride === 'closed') return false;

    // Automatic calculation
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    const [openHour, openMin] = (storeSettings.openTime || "11:00").split(':').map(Number);
    const [closeHour, closeMin] = (storeSettings.closeTime || "23:00").split(':').map(Number);
    
    const openTotalMinutes = openHour * 60 + openMin;
    const closeTotalMinutes = closeHour * 60 + closeMin;

    if (closeTotalMinutes > openTotalMinutes) {
      // Normal range e.g. 11:00 to 23:00
      return currentTotalMinutes >= openTotalMinutes && currentTotalMinutes < closeTotalMinutes;
    } else {
      // Overnight range e.g. 18:00 to 02:00
      return currentTotalMinutes >= openTotalMinutes || currentTotalMinutes < closeTotalMinutes;
    }
  }, [storeSettings.statusOverride, storeSettings.openTime, storeSettings.closeTime]);

  const [activeTab, setActiveTab] = useState<'menu' | 'tracker'>('menu');
  const [isPrinterConfigOpen, setIsPrinterConfigOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [adminSubTab, setAdminSubTab] = useState<'orders' | 'pdv' | 'fechamento' | 'impressora' | 'cardapio'>('orders');
  const [isRingingLoop, setIsRingingLoop] = useState(false);
  const [visualNotifications, setVisualNotifications] = useState<VisualNotification[]>([]);
  const [autoPrintOnNew, setAutoPrintOnNew] = useState(() => {
    return localStorage.getItem('auto_print_on_new') === 'true';
  });
  const [autoPrintOnPrep, setAutoPrintOnPrep] = useState(() => {
    return localStorage.getItem('auto_print_on_prep') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('auto_print_on_new', String(autoPrintOnNew));
  }, [autoPrintOnNew]);

  useEffect(() => {
    localStorage.setItem('auto_print_on_prep', String(autoPrintOnPrep));
  }, [autoPrintOnPrep]);

  const playNotificationSound = () => {
    if (!isSoundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      // Ding (Note 1)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Dong (Note 2) - played slightly delayed
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.15); // E5
      gain2.gain.setValueAtTime(0, now + 0.15);
      gain2.gain.linearRampToValueAtTime(0.4, now + 0.20);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.85);
    } catch (e) {
      console.error("Audio error", e);
    }
  };

  // Dynamic menu items state
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const cached = localStorage.getItem('supreme_menu_items');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Error parsing cached menu items:', e);
      }
    }
    return MENU_ITEMS;
  });

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'acai' | 'sorvete' | 'milkshake' | 'sundae'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Customizer state
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  // Checkout & orders
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isConfirmingConcludeAll, setIsConfirmingConcludeAll] = useState(false);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [completedCelebrationOrder, setCompletedCelebrationOrder] = useState<Order | null>(null);
  const [notificationToast, setNotificationToast] = useState<{ title: string; message: string } | null>(null);

  // Auto-clear helper for toasts
  useEffect(() => {
    if (notificationToast) {
      const timer = setTimeout(() => {
        setNotificationToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notificationToast]);

  // Keep track of order statuses to trigger real-time audio alerts and local toast notifications for clients
  const prevStatusesRef = useRef<Record<string, OrderStatus>>({});

  useEffect(() => {
    if (currentUser?.email === 'brfariarm@gmail.com') return; // Only for customers (both guests and registered ones)

    orders.forEach((o) => {
      const prevStatus = prevStatusesRef.current[o.id];
      if (prevStatus && prevStatus !== o.status) {
        // Status changed! Let's notify!
        let statusTitle = '';
        let statusDesc = '';

        if (o.status === 'preparing') {
          statusTitle = '🥣 Preparando seu Pedido!';
          statusDesc = `O seu copo ou taça #${o.id.slice(-6).toUpperCase()} entrou em preparação na cozinha.`;
        } else if (o.status === 'delivering') {
          statusTitle = o.details.deliveryType === 'delivery' ? '🛵 A Caminho!' : '📦 Pronto para Retirada!';
          statusDesc = o.details.deliveryType === 'delivery' 
            ? `Seu pedido #${o.id.slice(-6).toUpperCase()} saiu para entrega!` 
            : `Seu pedido #${o.id.slice(-6).toUpperCase()} está pronto no balcão!`;
        } else if (o.status === 'completed') {
          statusTitle = '✅ Pedido Entregue!';
          statusDesc = `O pedido #${o.id.slice(-6).toUpperCase()} foi concluído com sucesso. Bom apetite!`;
          
          // Trigger celebration modal to delight the customer
          setCompletedCelebrationOrder(o);
        }

        if (statusTitle) {
          try {
            playNotificationSound();
          } catch (soundErr) {
            console.warn(soundErr);
          }
          setNotificationToast({ title: statusTitle, message: statusDesc });
        }
      }
      // Save current status to ref
      prevStatusesRef.current[o.id] = o.status;
    });
  }, [orders, currentUser]);

  // Derived active uncompleted order for the customer
  const activeOrderToTrack = useMemo(() => {
    return orders.find(o => o.status !== 'completed' && !(o as any).archived);
  }, [orders]);

  const [customerSubTab, setCustomerSubTab] = useState<'active' | 'history'>('active');

  const customerHistoryOrders = useMemo(() => {
    // 1. Get all completed orders from live state (which can be archived or completed)
    const completedLive = orders.filter(o => o.status === 'completed');
    
    // 2. Get history from localStorage
    const savedHistoryStr = localStorage.getItem('supreme_completed_history');
    let savedHistory: Order[] = [];
    if (savedHistoryStr) {
      try {
        savedHistory = JSON.parse(savedHistoryStr);
      } catch (e) {
        console.warn(e);
      }
    }
    
    // Merge both live completed and local historical completed, deduplicating by ID
    const mergedMap = new Map<string, Order>();
    // Add saved history first (so newer completed can override if they exist in both)
    savedHistory.forEach(o => mergedMap.set(o.id, o));
    completedLive.forEach(o => mergedMap.set(o.id, o));
    
    // Convert back to sorted list by epoch digits descending
    const mergedList = Array.from(mergedMap.values());
    mergedList.sort((a, b) => {
      const timeA = parseInt(a.id.match(/\d+$/)?.[0] || '0', 10);
      const timeB = parseInt(b.id.match(/\d+$/)?.[0] || '0', 10);
      return timeB - timeA;
    });
    
    return mergedList;
  }, [orders]);

  const handleRepeatOrder = (order: Order) => {
    const newCartItems: CartItem[] = order.items.map((item) => ({
      ...item,
      id: `${item.isCustomCup ? 'custom' : 'item'}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    }));

    setCart((prev) => [...prev, ...newCartItems]);
    setIsCartOpen(true);
    
    // Notify user with elegant, clean message or alert
    alert("🍦 Itens do pedido anterior adicionados ao seu carrinho com sucesso!");
  };
  
  // Privacy policy modal state
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Order dashboard filtering and search states
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'waiting' | 'preparing' | 'delivering' | 'completed'>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // 4. Real-time sync of orders from Firestore
  useEffect(() => {
    let guestUid = localStorage.getItem('guest_uid');
    if (!guestUid || !guestUid.startsWith('guest-')) {
      guestUid = `guest-${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('guest_uid', guestUid);
    }

    const ordersCol = collection(db, 'orders');

    // Connect to Firestore orders matching current user or guest fallback
    let q;
    if (currentUser) {
      if (currentUser.email === 'brfariarm@gmail.com') {
        q = query(ordersCol);
      } else {
        q = query(ordersCol, where('ownerId', 'in', [currentUser.uid, guestUid]));
      }
    } else {
      q = query(ordersCol, where('ownerId', '==', guestUid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders: Order[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedOrders.push({
          id: data.id,
          items: data.items,
          total: data.total,
          details: data.details,
          status: data.status,
          timestamp: data.timestamp,
          archived: data.archived || false,
        });
      });
      
      // Sort client-side of list retrieval to avoid Firestore index requisites on empty creation
      // Orders can be styled as `ord-171839...` or `ord-pdv-171839...`. Extract digits to compare epoch timestamps.
      fetchedOrders.sort((a, b) => {
        const timeA = parseInt(a.id.match(/\d+$/)?.[0] || '0', 10);
        const timeB = parseInt(b.id.match(/\d+$/)?.[0] || '0', 10);
        return timeB - timeA;
      });
      
      setOrders(fetchedOrders);

      // Cache client orders locally
      const isAdminMode = currentUser && currentUser.email === 'brfariarm@gmail.com';
      if (!isAdminMode) {
        localStorage.setItem('supreme_orders', JSON.stringify(fetchedOrders));
      }
    }, (error) => {
      console.error('Failed to subscribe to orders query:', error);
      // Fallback: Load saved local orders when offline/restricted
      const savedOrders = localStorage.getItem('supreme_orders');
      if (savedOrders) {
        try {
          setOrders(JSON.parse(savedOrders));
        } catch (e) {
          console.error('Error parsing saved orders', e);
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Keep active tracking order in sync with live Firestore document updates
  useEffect(() => {
    if (!activeTrackingOrder?.id) return;

    const docRef = doc(db, 'orders', activeTrackingOrder.id);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const updatedOrder: Order = {
          id: data.id,
          items: data.items,
          total: data.total,
          details: data.details,
          status: data.status,
          timestamp: data.timestamp,
        };
        
        // If status changed or details changed, update active tracking order.
        setActiveTrackingOrder((prev) => {
          if (!prev || prev.status !== updatedOrder.status || JSON.stringify(prev.details) !== JSON.stringify(updatedOrder.details)) {
            return updatedOrder;
          }
          return prev;
        });

        // Also update inside localized orders list
        setOrders((prevOrders) => 
          prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o)
        );
      }
    }, (error) => {
      console.error("Failed to sync individual tracking order:", error);
    });

    return () => unsubscribe();
  }, [activeTrackingOrder?.id]);

  // Keep activeTrackingOrder in sync with live orders list changes
  useEffect(() => {
    if (activeTrackingOrder) {
      const liveOrder = orders.find(o => o.id === activeTrackingOrder.id);
      if (liveOrder && JSON.stringify(liveOrder) !== JSON.stringify(activeTrackingOrder)) {
        setActiveTrackingOrder(liveOrder);
      }
    }
  }, [orders, activeTrackingOrder]);

  // Sync completed orders to localStorage 'supreme_completed_history'
  useEffect(() => {
    if (currentUser?.email === 'brfariarm@gmail.com') return; // Do not do this for Admin

    const completedFromList = orders.filter(o => o.status === 'completed');
    if (completedFromList.length > 0) {
      const savedHistory = localStorage.getItem('supreme_completed_history');
      let historyList: Order[] = [];
      if (savedHistory) {
        try {
          historyList = JSON.parse(savedHistory);
        } catch (e) {
          console.error(e);
        }
      }
      
      let changed = false;
      completedFromList.forEach(completedOrder => {
        if (!historyList.some(h => h.id === completedOrder.id)) {
          historyList.unshift(completedOrder); // Add to top of history
          changed = true;
        } else {
          // If already in history but status or items changed (fallback update)
          const index = historyList.findIndex(h => h.id === completedOrder.id);
          if (index !== -1 && JSON.stringify(historyList[index]) !== JSON.stringify(completedOrder)) {
            historyList[index] = completedOrder;
            changed = true;
          }
        }
      });

      if (changed) {
        localStorage.setItem('supreme_completed_history', JSON.stringify(historyList));
      }
    }
  }, [orders, currentUser]);

  // Proactively upload guest/local orders from localStorage to Firestore
  useEffect(() => {
    const syncExistingLocalOrders = async () => {
      if (!currentUser) return; // Wait until an authenticated session is established
      const isAdminMode = currentUser.email === 'brfariarm@gmail.com';
      if (isAdminMode) {
        localStorage.removeItem('supreme_orders'); // Auto clear admin browser cache
        return;
      }
      const savedOrders = localStorage.getItem('supreme_orders');
      if (savedOrders) {
        try {
          const parsed: Order[] = JSON.parse(savedOrders);
          if (parsed && parsed.length > 0) {
            for (const order of parsed) {
              if (order.id.startsWith('ord-pdv-')) continue; // Skip POS orders
              const ordRef = doc(db, 'orders', order.id);
              
              // CRITICAL: Check if document already exists on Firestore. If it does,
              // we must NOT overwrite it with stale status/details from localStorage.
              const docSnap = await getDoc(ordRef);
              if (docSnap.exists()) {
                continue;
              }

              await setDoc(ordRef, {
                id: order.id,
                ownerId: currentUser.uid,
                items: JSON.parse(JSON.stringify(order.items)),
                total: order.total,
                details: JSON.parse(JSON.stringify(order.details)),
                status: order.status || 'waiting',
                timestamp: order.timestamp,
                createdAt: serverTimestamp()
              });
            }
            console.log('Successfully synced guest orders to Firestore!');
            localStorage.removeItem('supreme_orders');
          }
        } catch (err) {
          console.error('Failed to sync guest orders to Firestore on mount:', err);
        }
      }
    };
    syncExistingLocalOrders();
  }, [currentUser]);

  // Load cart on boot
  useEffect(() => {
    const savedCart = localStorage.getItem('supreme_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error parsing saved cart', e);
      }
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('privacy') === 'true' || params.get('politica') === 'true') {
      setIsPrivacyOpen(true);
    }

    // Recover lost/new-session orders from URL tracking parameter (?track=order-ID)
    const trackId = params.get('track');
    if (trackId) {
      const loadTrackedOrder = async () => {
        try {
          const docRef = doc(db, 'orders', trackId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            const retrievedOrder: Order = {
              id: data.id,
              items: data.items,
              total: data.total,
              details: data.details,
              status: data.status,
              timestamp: data.timestamp,
            };
            
            // Activate tracking tab and order
            setActiveTrackingOrder(retrievedOrder);
            setActiveTab('tracker');

            // Add order to local memory if not present yet
            setOrders((prev) => {
              if (!prev.some(o => o.id === retrievedOrder.id)) {
                const nextOrders = [retrievedOrder, ...prev];
                const isAdmin = currentUser && currentUser.email === 'brfariarm@gmail.com';
                if (!isAdmin) {
                  localStorage.setItem('supreme_orders', JSON.stringify(nextOrders));
                }
                return nextOrders;
              }
              return prev;
            });
          }
        } catch (err) {
          console.error("Erro ao carregar pedido rastreado via URL:", err);
        }
      };
      loadTrackedOrder();
    }
  }, [currentUser]);

  // Save cart changes to localstorage
  useEffect(() => {
    localStorage.setItem('supreme_cart', JSON.stringify(cart));
  }, [cart]);

  // Save custom local orders to localstorage (if client-side user/guest)
  useEffect(() => {
    const isAdminMode = currentUser && currentUser.email === 'brfariarm@gmail.com';
    if (isAdminMode) {
      localStorage.removeItem('supreme_orders');
      return;
    }
    const hasGuestOrders = orders.some(o => !o.id.startsWith('ord-pdv-') && !(o as any).archived);
    if (orders.length > 0 && hasGuestOrders) {
      localStorage.setItem('supreme_orders', JSON.stringify(orders));
    }
  }, [orders, currentUser]);

  // Real-time door bell chimes when new orders arrive (only for store admin)
  const prevWaitingIdsRef = useRef<string[]>([]);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (currentUser?.email !== 'brfariarm@gmail.com') return;

    // Delayed load activation to avoid false rings on startup snap releases
    const timer = setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.email !== 'brfariarm@gmail.com') return;

    const currentWaitingIds = orders
      .filter((o) => o.status === 'waiting')
      .map((o) => o.id);

    // Initial load check: update reference and skip ringing
    if (isInitialLoadRef.current) {
      prevWaitingIdsRef.current = currentWaitingIds;
      return;
    }

    // Check if there is any new order in the queue compared to the reference list
    const newWaitingIds = currentWaitingIds.filter((id) => !prevWaitingIdsRef.current.includes(id));
    if (newWaitingIds.length > 0) {
      setIsRingingLoop(true);
      
      // Auto-printing and Toast Notification on new arrival!
      newWaitingIds.forEach((id) => {
        const newOrder = orders.find(o => o.id === id);
        if (newOrder) {
          const newToast: VisualNotification = {
            id: `toast-${Date.now()}-${id}`,
            orderId: newOrder.id,
            clientName: newOrder.details?.customerName || 'Cliente Convidado',
            itemsCount: newOrder.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
            total: newOrder.total || 0,
            timestamp: new Date()
          };
          setVisualNotifications((prev) => [newToast, ...prev]);

          // Automatically clear each toast after 10 seconds
          setTimeout(() => {
            setVisualNotifications((prev) => prev.filter((t) => t.id !== newToast.id));
          }, 10000);

          if (autoPrintOnNew) {
            try {
              printOrderReceipt(newOrder, storeSettings);
            } catch (err) {
              console.error("Auto print failure on new order:", err);
            }
          }
        }
      });
    }

    prevWaitingIdsRef.current = currentWaitingIds;
  }, [orders, currentUser, autoPrintOnNew, storeSettings]);

  // Handle looping notification sound every 4.5 seconds like an iFood bell
  useEffect(() => {
    if (currentUser?.email !== 'brfariarm@gmail.com' || !isSoundEnabled || !isRingingLoop) return;

    // Play once immediately
    playNotificationSound();

    const interval = setInterval(() => {
      // Loop while there are still waiting orders
      const hasWaiting = orders.some((o) => o.status === 'waiting');
      if (hasWaiting) {
        playNotificationSound();
      } else {
        setIsRingingLoop(false);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isRingingLoop, isSoundEnabled, orders, currentUser]);

  // Handle manually forcing simulation status advance
  const handleForceStatusAdvance = async () => {
    if (!activeTrackingOrder) return;
    
    let nextStatus: OrderStatus = activeTrackingOrder.status;
    if (activeTrackingOrder.status === 'waiting') nextStatus = 'preparing';
    else if (activeTrackingOrder.status === 'preparing') nextStatus = 'delivering';
    else if (activeTrackingOrder.status === 'delivering') nextStatus = 'completed';

    if (currentUser) {
      try {
        await updateDoc(doc(db, 'orders', activeTrackingOrder.id), {
          status: nextStatus
        });

        // Auto print on preparing if enabled
        if (nextStatus === 'preparing' && autoPrintOnPrep) {
          try {
            printOrderReceipt(activeTrackingOrder, storeSettings);
          } catch (e) {
            console.error("Auto print error on simulation prep:", e);
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `orders/${activeTrackingOrder.id}`);
      }
    } else {
      // Local fallback
      setOrders((prevOrders) => {
        const newOrders = prevOrders.map((order) => {
          if (order.id === activeTrackingOrder.id) {
            const updatedOrder = { ...order, status: nextStatus };
            setActiveTrackingOrder(updatedOrder);
            return updatedOrder;
          }
          return order;
        });
        return newOrders;
      });
    }
  };

  // Handle manually updating status of any general order from the list
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          status: newStatus
        });

        // Auto print on preparing if enabled
        if (newStatus === 'preparing' && autoPrintOnPrep && targetOrder) {
          try {
            printOrderReceipt(targetOrder, storeSettings);
          } catch (e) {
            console.error("Auto print error on initiating prep:", e);
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `orders/${orderId}`);
      }
    } else {
      // Local fallback
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    }
  };

  // Handle concluding all active/non-completed orders at once
  const handleConcludeAllOrders = async () => {
    const activeOrders = orders.filter(o => o.status !== 'completed' && !(o as any).archived);
    if (activeOrders.length === 0) {
      return;
    }

    if (!isConfirmingConcludeAll) {
      setIsConfirmingConcludeAll(true);
      // Auto cancel confirmation after 4 seconds if not clicked again
      setTimeout(() => {
        setIsConfirmingConcludeAll(false);
      }, 4000);
      return;
    }

    if (currentUser) {
      try {
        const batch = writeBatch(db);
        activeOrders.forEach((o) => {
          const orderRef = doc(db, 'orders', o.id);
          batch.update(orderRef, { status: 'completed' });
        });
        await batch.commit();
        setIsConfirmingConcludeAll(false);
      } catch (e) {
        console.error("Failed to conclude all orders in Firestore, falling back to local state update:", e);
        // Local state update fallback on Firestore error
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.status !== 'completed' && !(order as any).archived
              ? { ...order, status: 'completed' }
              : order
          )
        );
        setIsConfirmingConcludeAll(false);
      }
    } else {
      // Local fallback
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.status !== 'completed' && !(order as any).archived
            ? { ...order, status: 'completed' }
            : order
        )
      );
      setIsConfirmingConcludeAll(false);
    }
  };

  const handleUpdatePrinterSetting = async (key: string, value: any) => {
    const updated = {
      ...storeSettings,
      [key]: value,
      updatedAt: new Date().toISOString()
    };
    setStoreSettings(updated);
    if (currentUser && currentUser.email === 'brfariarm@gmail.com') {
      try {
        await setDoc(doc(db, 'settings', 'store_config'), updated);
      } catch (err) {
        console.error("Erro ao salvar config da impressora:", err);
      }
    }
  };

  const handleSaveStoreSettingsToFirestore = async (settings: typeof storeSettings) => {
    if (currentUser?.email === 'brfariarm@gmail.com') {
      try {
        await setDoc(doc(db, 'settings', 'store_config'), {
          name: settings.name || '',
          shortName: settings.shortName || '',
          city: settings.city || '',
          address: settings.address || '',
          phone: settings.phone || '',
          email: settings.email || '',
          openTime: settings.openTime || "11:00",
          closeTime: settings.closeTime || "23:00",
          statusOverride: settings.statusOverride || "auto",
          printerPaperWidth: settings.printerPaperWidth || "80mm",
          printerNumCopies: settings.printerNumCopies || 1,
          printerFontSize: settings.printerFontSize || 12,
          printerFontType: settings.printerFontType || "monospace",
          printerShowAddress: settings.printerShowAddress !== false,
          printerHeaderMessage: settings.printerHeaderMessage || "Comprovante de Pedido",
          printerFooterMessage: settings.printerFooterMessage || "Muito obrigado pela preferência!",
          updatedAt: serverTimestamp()
        });
        console.log("Settings synced successfully to Firestore!");
      } catch (e) {
        console.error('Failed to sync settings to Firestore:', e);
      }
    }
  };

  // Helper to construct WhatsApp redirect links with custom status messages
  const getWhatsAppStatusText = (order: Order, status: OrderStatus) => {
    const orderIdShort = order.id.slice(-6).toUpperCase();
    const customerName = order.details?.customerName || 'Cliente';
    const shopName = storeSettings.shortName;
    const trackingLink = `${window.location.origin}?track=${order.id}`;

    switch (status) {
      case 'waiting':
        return `Olá, ${customerName}! Recebemos o seu pedido #${orderIdShort} na ${shopName}! 🍨 Já recebemos aqui e logo daremos início à montagem. Agradecemos a sua preferência!\n\nAcompanhe seu pedido em tempo real pelo link:\n${trackingLink}`;
      case 'preparing':
        return `Olá, ${customerName}! Boas notícias! Seu pedido #${orderIdShort} na ${shopName} já entrou em preparo! 🥣 Nossos atendentes estão montando tudo caprichado com muito carinho!\n\nAcompanhe progresso em tempo real:\n${trackingLink}`;
      case 'delivering':
        return `Olá, ${customerName}! Seu delicioso açaí/sorvete do pedido #${orderIdShort} na ${shopName} já foi montado com sucesso e está a caminho do seu endereço com o motoboy! 🛵 Prepare-se para se refrescar!\n\nAcompanhe a entrega em tempo real:\n${trackingLink}`;
      case 'completed':
        return `Olá, ${customerName}! Seu pedido #${orderIdShort} na ${shopName} foi entregue com sucesso! 🎉 Esperamos que você ame o nosso açaí gourmet e sorvetes premium. Se puder, nos divulgue no Instagram @sorveteriagourmetsupreme! Obrigado pela preferência e até a próxima! 🍦\n\nDetalhes do seu pedido finalizado:\n${trackingLink}`;
      default:
        return '';
    }
  };

  const getWhatsAppStatusUrl = (order: Order, status: OrderStatus) => {
    const phone = order.details?.customerPhone || '';
    const rawPhone = phone.replace(/\D/g, '');
    const formattedPhone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
    const text = getWhatsAppStatusText(order, status);
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  };

  // Add standard product to cart
  const handleAddProductToCart = (item: MenuItem) => {
    if (item.customizable) {
      setCustomizingItem(item);
      setIsCustomizerOpen(true);
      return;
    }
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
    setIsCartOpen(true);
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
    return menuItems.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Handle Checkout finish & saving order
  const handlePlaceOrder = async (details: CheckoutDetails) => {
    const orderId = `ord-${Date.now()}`;
    const newOrder: Order = {
      id: orderId,
      items: cart,
      total: cartSubtotal + (details.deliveryType === 'delivery' ? 5.00 : 0.00),
      details,
      status: 'waiting',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    const guestUid = localStorage.getItem('guest_uid') || `guest-${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('guest_uid', guestUid);
    const ownerId = (currentUser && !currentUser.isAnonymous) ? currentUser.uid : guestUid;

    try {
      await setDoc(doc(db, 'orders', orderId), {
        id: orderId,
        ownerId: ownerId,
        items: JSON.parse(JSON.stringify(cart)), // Ensure standard JS plain objects
        total: newOrder.total,
        details: JSON.parse(JSON.stringify(details)),
        status: 'waiting',
        timestamp: newOrder.timestamp,
        createdAt: serverTimestamp()
      });
    } catch (e: any) {
      console.error('Failed to create Firestore order, falling back to local list:', e);
      setOrders((prev) => {
        const next = [newOrder, ...prev];
        const isAdminMode = currentUser && currentUser.email === 'brfariarm@gmail.com';
        if (!isAdminMode) {
          localStorage.setItem('supreme_orders', JSON.stringify(next));
        }
        return next;
      });
      alert(`⚠️ Seu pedido foi realizado com sucesso, mas não pôde ser sincronizado online com o painel por uma restrição do Firebase (domínio não autorizado ou falta de login no projeto).\n\nSalvamos o pedido com segurança no seu aparelho para você poder acompanhar!\n\nSe você é o proprietário fazendo testes, por favor, verifique se ativou os logins do "Google" e "Anônimo" e colocou o domínio "${window.location.hostname}" no Console do seu Firebase.`);
    }

    setCart([]); // Clear cart
    setIsCheckoutOpen(false);
    setActiveTrackingOrder(newOrder);
    setActiveTab('tracker');
  };

  // Handle POS/PDV order checkouts
  const handlePlacePDVOrder = async (pdvOrder: Order, shouldPrint: boolean) => {
    const ownerId = (currentUser && !currentUser.isAnonymous) ? currentUser.uid : 'guest-pdv-fallback';
    
    try {
      await setDoc(doc(db, 'orders', pdvOrder.id), {
        id: pdvOrder.id,
        ownerId: ownerId,
        items: JSON.parse(JSON.stringify(pdvOrder.items)),
        total: pdvOrder.total,
        details: JSON.parse(JSON.stringify(pdvOrder.details)),
        status: pdvOrder.status,
        timestamp: pdvOrder.timestamp,
        createdAt: serverTimestamp()
      });
    } catch (e: any) {
      console.error('Failed to write PDV order to Firestore. Falling back locally:', e);
      setOrders((prev) => [pdvOrder, ...prev]);
    }

    if (shouldPrint) {
      try {
        printOrderReceipt(pdvOrder, storeSettings);
      } catch (err) {
        console.error("Print receipt error from PDV:", err);
      }
    }
  };

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans selection:bg-rose-100 selection:text-rose-900 overflow-x-hidden">
      
      {/* Firebase Auth Error Modal Dialog */}
      <AnimatePresence>
        {authError && (
          <div className="fixed inset-0 z-55 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-red-100 relative"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <span className="p-3 bg-red-50 rounded-2xl">
                  <Settings className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
                </span>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Aviso do Firebase</h3>
              </div>
              
              <div className="text-slate-600 text-xs font-semibold leading-relaxed space-y-3.5 mb-5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p>{authError}</p>
                <p className="text-[10px] text-slate-450 uppercase tracking-widest border-t border-slate-200/60 pt-2.5">
                  ID do Projeto: <code className="font-mono text-rose-600 font-bold bg-rose-50 px-1 rounded">{db.app.options.projectId}</code>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex-1 bg-slate-850 hover:bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest py-3 rounded-2xl cursor-pointer transition-all text-center"
                >
                  Configurações
                </button>
                <button
                  onClick={() => {
                    setAuthError(null);
                    setIsAuthModalOpen(true);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase tracking-widest py-3 rounded-2xl cursor-pointer transition-all text-center"
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={() => setAuthError(null)}
                  className="px-5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-black uppercase tracking-widest py-3 rounded-2xl cursor-pointer transition-all text-center"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* 1. Header Area with Logo and Cart controls */}
      <header className="sticky top-0 z-40 bg-white border-b border-rose-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Brand title with Opening settings button trigger */}
          <div className="flex items-center gap-3.5">
            <div 
              onClick={() => {
                setActiveTab('menu');
                setActiveTrackingOrder(null);
              }}
              className="w-12 h-12 flex items-center justify-center transition-transform duration-300 hover:scale-110 cursor-pointer"
            >
              <SupremeLogo size={48} className="w-full h-full" />
            </div>
            {currentUser?.email === 'brfariarm@gmail.com' ? (
              <div 
                onClick={() => setIsSettingsOpen(true)}
                className="group cursor-pointer select-none p-1.5 rounded-2xl hover:bg-rose-50/60 transition-colors"
                title="Configurar Horário e Informações da Loja"
              >
                <h1 className="text-xl font-black tracking-tight text-rose-600 uppercase flex items-center gap-1 leading-none group-hover:text-rose-700 transition-colors">
                  {storeSettings.shortName.split(' ')[0]} <span className="text-gray-450 font-light italic lowercase text-[15px]">{storeSettings.shortName.split(' ').slice(1).join(' ')}</span>
                  <Settings className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:rotate-45 transition-all inline-block ml-1" />
                </h1>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isOpen ? 'text-emerald-600 font-extrabold' : 'text-rose-500 font-semibold'}`}>
                    {isOpen ? 'Aberto' : 'Fechado'} • {storeSettings.city}
                    <span className="text-slate-400 font-normal tracking-normal text-[9px] lowercase">({storeSettings.openTime} às {storeSettings.closeTime})</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="select-none p-1.5 rounded-2xl">
                <h1 className="text-xl font-black tracking-tight text-rose-600 uppercase flex items-center gap-1 leading-none">
                  {storeSettings.shortName.split(' ')[0]} <span className="text-gray-450 font-light italic lowercase text-[15px]">{storeSettings.shortName.split(' ').slice(1).join(' ')}</span>
                </h1>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isOpen ? 'text-emerald-600 font-extrabold' : 'text-rose-500 font-semibold'}`}>
                    {isOpen ? 'Aberto' : 'Fechado'} • {storeSettings.city}
                    <span className="text-slate-400 font-normal tracking-normal text-[9px] lowercase">({storeSettings.openTime} às {storeSettings.closeTime})</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-6">
            {currentUser?.email === 'brfariarm@gmail.com' ? (
              <>
                <button
                  onClick={() => {
                    setActiveTab('tracker');
                    setActiveTrackingOrder(null);
                    setAdminSubTab('orders');
                  }}
                  className={`text-xs font-black tracking-widest uppercase transition-colors py-2 px-1 cursor-pointer ${
                    activeTab === 'tracker' && adminSubTab === 'orders' ? 'text-rose-600 border-b-2 border-rose-500' : 'text-slate-400 hover:text-slate-850'
                  }`}
                >
                  Painel de Pedidos 👑
                </button>
                <button
                  onClick={() => {
                    setActiveTab('tracker');
                    setActiveTrackingOrder(null);
                    setAdminSubTab('pdv');
                  }}
                  className={`text-xs font-black tracking-widest uppercase transition-colors py-2 px-1 cursor-pointer ${
                    activeTab === 'tracker' && adminSubTab === 'pdv' ? 'text-rose-600 border-b-2 border-rose-500' : 'text-slate-400 hover:text-slate-850'
                  }`}
                >
                  PDV Balcão 🖥️
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setActiveTab('menu');
                    setActiveTrackingOrder(null);
                  }}
                  className={`text-xs font-black tracking-widest uppercase transition-colors py-2 px-1 cursor-pointer ${
                    activeTab === 'menu' && !activeTrackingOrder ? 'text-rose-600 border-b-2 border-rose-500' : 'text-slate-400 hover:text-slate-850'
                  }`}
                >
                  Cardápio
                </button>
                <button
                  onClick={() => {
                    if (orders.length === 1) {
                      setActiveTrackingOrder(orders[0]);
                    } else {
                      setActiveTrackingOrder(null);
                    }
                    setActiveTab('tracker');
                  }}
                  className={`text-xs font-black tracking-widest uppercase transition-colors py-2 px-1 cursor-pointer ${
                    activeTab === 'tracker' ? 'text-rose-600 border-b-2 border-rose-500' : 'text-slate-400 hover:text-slate-850'
                  }`}
                >
                  Meus Pedidos 📋
                </button>
              </>
            )}
          </nav>

          {/* Right Action panel */}
          <div className="flex items-center gap-2.5">
            {/* Firebase Auth Avatar & Controller */}
            {currentUser && !currentUser.isAnonymous ? (
              <div className="flex items-center gap-2 bg-rose-50/55 p-1.5 pr-3.5 rounded-full border border-rose-100/40">
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || 'Usuário'} 
                    className="w-7 h-7 rounded-full object-cover shadow-xs border border-rose-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center font-black text-[10px] uppercase">
                    {currentUser.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black leading-none text-slate-800 line-clamp-1 flex items-center gap-1">
                    {currentUser.displayName?.split(' ')[0] || 'Cliente'}
                    {currentUser.email === 'brfariarm@gmail.com' && <span className="text-amber-500 text-xs text-shadow-xs" title="Administrador Master">👑</span>}
                  </span>
                  <button 
                    onClick={() => signOut(auth)} 
                    className="text-[9px] font-black text-rose-500 hover:text-rose-700 text-left cursor-pointer uppercase tracking-wider inline-block mt-0.5"
                  >
                    Sair
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full border border-rose-100 text-[10px] font-black uppercase tracking-wider text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all cursor-pointer shadow-xs bg-rose-50/20"
              >
                Entrar
              </button>
            )}

            {/* Float Cart indicator */}
            {currentUser?.email !== 'brfariarm@gmail.com' && (
              <button
                onClick={() => setIsCartOpen(true)}
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-[20px] p-3 px-5 flex items-center gap-2.5 font-black text-xs shadow-md shadow-rose-100 hover:shadow-lg transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{cartItemCount}</span>
                <span className="hidden sm:inline opacity-80 pl-1.5 border-l border-white/20">R$ {cartSubtotal.toFixed(2)}</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* 2. Floating Action Banner for existing active order tracking */}
      {currentUser?.email !== 'brfariarm@gmail.com' && activeOrderToTrack && activeTab !== 'tracker' && (
        <div className="bg-gradient-to-r from-amber-500 to-rose-500 text-white py-2.5 px-4 flex items-center justify-between text-xs font-bold leading-normal relative z-30 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Seu pedido #{activeOrderToTrack.id.slice(-6).toUpperCase()} está em preparação: <span className="underline uppercase">{activeOrderToTrack.status === 'waiting' ? 'Aguardando' : activeOrderToTrack.status === 'preparing' ? 'Montando Copo' : 'A Caminho'}</span></span>
          </div>
          <button
            onClick={() => {
              setActiveTrackingOrder(activeOrderToTrack);
              setActiveTab('tracker');
            }}
            className="bg-white text-rose-600 px-3 py-1 rounded-xl hover:bg-neutral-50 transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer"
          >
            Acompanhar <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-48 bg-white border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-safe select-none">
        <div className="flex justify-around items-center h-16">
          {currentUser?.email === 'brfariarm@gmail.com' ? (
            <>
              <button
                onClick={() => {
                  setActiveTab('tracker');
                  setActiveTrackingOrder(null);
                  setAdminSubTab('orders');
                }}
                className={`flex flex-col items-center justify-center w-full h-full transition-colors font-sans cursor-pointer ${
                  activeTab === 'tracker' && adminSubTab === 'orders' ? 'text-rose-600' : 'text-slate-400 hover:text-rose-600/80'
                }`}
              >
                <Compass className="w-5 h-5 mb-1 animate-pulse" />
                <span className="text-[10px] font-black tracking-wide uppercase">Painel 👑</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('tracker');
                  setActiveTrackingOrder(null);
                  setAdminSubTab('pdv');
                }}
                className={`flex flex-col items-center justify-center w-full h-full transition-colors font-sans cursor-pointer ${
                  activeTab === 'tracker' && adminSubTab === 'pdv' ? 'text-rose-600' : 'text-slate-400 hover:text-rose-600/80'
                }`}
              >
                <ShoppingBag className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-black tracking-wide uppercase">PDV 🖥️</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setActiveTab('menu');
                  setActiveTrackingOrder(null);
                }}
                className={`flex flex-col items-center justify-center w-full h-full transition-colors font-sans cursor-pointer ${
                  activeTab === 'menu' && !activeTrackingOrder ? 'text-rose-600' : 'text-slate-400 hover:text-rose-600/80'
                }`}
              >
                <ShoppingBag className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-black tracking-wide uppercase">Cardápio</span>
              </button>
              <button
                onClick={() => {
                  if (orders.length === 1) {
                    setActiveTrackingOrder(orders[0]);
                  } else {
                    setActiveTrackingOrder(null);
                  }
                  setActiveTab('tracker');
                }}
                className={`flex flex-col items-center justify-center w-full h-full transition-colors font-sans cursor-pointer ${
                  activeTab === 'tracker' ? 'text-rose-600' : 'text-slate-400 hover:text-rose-600/80'
                }`}
              >
                <Compass className="w-5 h-5 mb-1 animate-pulse" />
                <span className="text-[10px] font-black tracking-wide uppercase">Meus Pedidos</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3. Main content viewport */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6 w-full">
        
        {/* TAB 1: CARDÁPIO (MENU) */}
        {activeTab === 'menu' && !activeTrackingOrder && (
          <div className="space-y-8">
            
            {/* Elegant Hero Banner card */}
            <div className="relative bg-gradient-to-r from-rose-500 to-indigo-650 rounded-3xl h-[260px] md:h-[340px] overflow-hidden shadow-xl flex items-center p-6 md:p-12 text-white">
              <div className="absolute inset-0 z-0">
                <img 
                  src={BannerImage} 
                  alt="Delicioso Açaí Gourmet e Sorvetes" 
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
                  Seu Açaí Próprio ou Sorvetes Premium
                </h2>
                <p className="text-xs md:text-sm text-neutral-200 font-medium leading-relaxed max-w-md">
                  Escolha as melhores opções na nossa vitrine do tamanho da sua fome com acompanhamentos selecionados. Entrega garantida, rápida e refrescante em Monte Mor!
                </p>
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


              </aside>

              {/* Right section: Products grid area and live search banner */}
              <section className="flex-1 w-full space-y-6">
                
                {/* Search banner */}
                <div className="bg-white p-5 rounded-[24px] border border-rose-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 leading-tight">
                      Sabores que <span className="text-rose-500">encantam o dia.</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Escolha abaixo os melhores açaís e sorvetes de Monte Mor</p>
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
                          {item.customizable ? (
                            <span className="text-xs font-black text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100 uppercase tracking-wider">
                              Monte o seu!
                            </span>
                          ) : (
                            <span className="text-lg font-black text-slate-900">R$ {item.price.toFixed(2)}</span>
                          )}
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
              <h3 className="text-lg font-black text-slate-800 text-center uppercase tracking-wider">Incomparável em Monte Mor! ⭐</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-slate-500">
                <div className="bg-[#FFF9F9] p-5 rounded-2xl border border-rose-50 space-y-2">
                  <div className="flex text-amber-400 gap-0.5"><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /></div>
                  <p className="italic text-slate-650">"O copo montado deles é surreal, mandam muita leite condensado e sorvete de baunilha cremoso!"</p>
                  <p className="font-black text-[9px] uppercase tracking-wider text-rose-500">- Marina S. (Centro)</p>
                </div>
                <div className="bg-[#FFF9F9] p-5 rounded-2xl border border-rose-50 space-y-2">
                  <div className="flex text-amber-400 gap-0.5"><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /></div>
                  <p className="italic text-slate-650">"Sempre peço pelo aplicativo, o Pix aprova na hora e o motoboy chega com o sorvete totalmente duro, caprichado!"</p>
                  <p className="font-black text-[9px] uppercase tracking-wider text-rose-500">- Peterson L. (Jd Panorama)</p>
                </div>
                <div className="bg-[#FFF9F9] p-5 rounded-2xl border border-rose-50 space-y-2">
                  <div className="flex text-amber-400 gap-0.5"><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /><Star className="w-3.5 h-3.5 fill-current" /></div>
                  <p className="italic text-slate-650">"App levíssimo e rápido. Baixei na tela inicial e economiza muito tempo."</p>
                  <p className="font-black text-[9px] uppercase tracking-wider text-rose-500">- Roberto G. (Cidade Jardim)</p>
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
                  if (currentUser?.email !== 'brfariarm@gmail.com' && orders.length <= 1) {
                    setActiveTab('menu');
                  }
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 py-1.5 px-3.5 rounded-xl shadow-xs cursor-pointer"
              >
                ← Voltar
              </button>

              <h3 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider">Visualizando Pedido Ativo</h3>
            </div>

            <OrderTracker 
              order={activeTrackingOrder} 
              onClose={() => {
                setActiveTrackingOrder(null);
                if (currentUser?.email !== 'brfariarm@gmail.com' && orders.length <= 1) {
                  setActiveTab('menu');
                }
              }}
              onSimulateStatusProgress={currentUser?.email === 'brfariarm@gmail.com' ? handleForceStatusAdvance : undefined}
              storeSettings={storeSettings}
            />
          </div>
        )}

        {/* TAB 2 CONTROLLER: ACTIVE TRACKING OR SELECTION DASHBOARD */}
        {activeTab === 'tracker' && !activeTrackingOrder && (
          <div className="space-y-6">
            {orders.length === 0 && currentUser?.email !== 'brfariarm@gmail.com' ? (
              // Empty State
              <div className="text-center py-12 space-y-3 bg-white rounded-3xl border border-dashed border-slate-200">
                <Compass className="w-10 h-10 text-slate-350 mx-auto animate-pulse" />
                <h4 className="font-bold text-slate-700">Nenhum pedido localizado</h4>
                <p className="text-xs text-slate-400">Você ainda não realizou transações. Faça seu primeiro pedido no cardápio!</p>
                <button
                  onClick={() => setActiveTab('menu')}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2 px-5 rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Comprar Delícias Geladas
                </button>
              </div>
            ) : (
              // We have orders! Render Dashboard or PDV
              <div className="space-y-6 animate-fade-in">
                
                {currentUser?.email === 'brfariarm@gmail.com' ? (
                  // Admin Header and metrics
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-rose-500 to-indigo-600 p-6 rounded-[28px] text-white shadow-xl relative overflow-hidden">
                      <div className="absolute right-[-20px] top-[-20px] w-40 h-40 bg-white/5 rounded-full blur-2xl" />
                      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] bg-white/20 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                            Painel Administrativo Master 👑
                          </span>
                          <h2 className="text-xl sm:text-2xl font-black tracking-tight font-sans">Gerenciamento de Pedidos Real-time</h2>
                          <p className="text-xs text-white/80 font-medium">Acompanhe novos pedidos de clientes, altere os status e faça a gestão em tempo real.</p>
                        </div>
                        <div className="shrink-0">
                          <button
                            onClick={() => {
                              const sharedUrl = "https://ais-pre-3gtsc2fb25ezd7dmeqiyre-576759142795.us-west2.run.app";
                              navigator.clipboard.writeText(sharedUrl);
                              alert("🍦 Link oficial de clientes copiado com sucesso!\n\nEnvie este link para que seus clientes façam pedidos online:\n" + sharedUrl);
                            }}
                            className="w-full sm:w-auto bg-white text-rose-600 hover:bg-rose-50 active:scale-[0.98] font-black text-[10.5px] uppercase tracking-wider py-3 px-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-950/20 border-none cursor-pointer"
                          >
                            <Share2 className="w-4 h-4 shrink-0" />
                            Copiar Link de Clientes
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">✅ Concluídos</span>
                        <span className="text-lg font-black text-rose-600">
                          {orders.filter(o => o.status === 'completed' && !(o as any).archived).length}
                        </span>
                        <p className="text-[9px] text-emerald-600 font-bold mt-1">Pedidos entregues no turno</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">⌛ Pendentes</span>
                        <span className="text-lg font-black text-amber-600">
                          {orders.filter(o => o.status === 'waiting' && !(o as any).archived).length}
                        </span>
                        <p className="text-[9px] text-slate-400 font-medium mt-1">Aguardando início</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🥣 Preparando</span>
                        <span className="text-lg font-black text-indigo-650">
                          {orders.filter(o => o.status === 'preparing' && !(o as any).archived).length}
                        </span>
                        <p className="text-[9px] text-slate-400 font-medium mt-1 font-sans">Sendo montados</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🛵 Em Trânsito</span>
                        <span className="text-lg font-black text-rose-500">
                          {orders.filter(o => o.status === 'delivering' && !(o as any).archived).length}
                        </span>
                        <p className="text-[9px] text-slate-400 font-medium mt-1">Saiu com motoboy</p>
                      </div>
                    </div>

                    {/* Ringing Alarm Loop alert banner */}
                    {isRingingLoop && (
                      <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-rose-600 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md shadow-rose-250 animate-pulse text-left border border-rose-700"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🛎️</span>
                          <div>
                            <h4 className="font-extrabold text-xs uppercase tracking-wider">Novo Pedido Pendente no Painel!</h4>
                            <p className="text-[9.5px] text-zinc-100 leading-relaxed font-semibold">Campainha tocando tipo iFood no navegador. Atenda ou modifique o status para calar!</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setIsRingingLoop(false);
                          }}
                          className="w-full sm:w-auto px-4.5 py-2.5 bg-white text-rose-600 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-zinc-100 transition-all cursor-pointer shadow-sm shadow-rose-950/20 font-mono"
                        >
                          🔕 Silenciar Alerta
                        </button>
                      </motion.div>
                    )}

                      {/* Twin subtab switcher: Desk vs PDV vs Relatórios */}
                      <div className="flex bg-slate-200/60 p-1.5 rounded-2xl gap-1 flex-wrap sm:flex-nowrap">
                        <button
                          onClick={() => setAdminSubTab('orders')}
                          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            adminSubTab === 'orders'
                              ? 'bg-white text-rose-650 shadow-sm'
                              : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          📋 Delivery ({orders.filter(o => o.status !== 'completed' && !(o as any).archived).length} Ativos)
                        </button>
                        <button
                          onClick={() => setAdminSubTab('pdv')}
                          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            adminSubTab === 'pdv'
                              ? 'bg-white text-rose-650 shadow-sm'
                              : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          🖥️ PDV Balcão
                        </button>
                        <button
                          onClick={() => setAdminSubTab('fechamento')}
                          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            adminSubTab === 'fechamento'
                              ? 'bg-white text-rose-650 shadow-sm'
                              : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          🔒 Fechamento
                        </button>
                        <button
                          onClick={() => setAdminSubTab('impressora')}
                          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            adminSubTab === 'impressora'
                              ? 'bg-white text-rose-650 shadow-sm'
                              : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          🖨️ Impressora
                        </button>
                        <button
                          onClick={() => setAdminSubTab('cardapio')}
                          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            adminSubTab === 'cardapio'
                              ? 'bg-white text-rose-650 shadow-sm'
                              : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          🥣 Cardápio
                        </button>
                      </div>

                    {/* Conditional rendering for PDV versus Normal Desktop workflow */}
                    {adminSubTab === 'pdv' ? (
                      <AdminPDV onPlacePDVOrder={handlePlacePDVOrder} storeSettings={storeSettings} menuItems={menuItems} />
                    ) : adminSubTab === 'fechamento' ? (
                      <AdminFechamento 
                        orders={orders} 
                        storeSettings={storeSettings} 
                        onRefreshOrders={() => {
                          // Standard snapshot updates handle this Reactively
                        }} 
                        setOrders={setOrders}
                      />
                    ) : adminSubTab === 'impressora' ? (
                      <AdminImpressora 
                        storeSettings={storeSettings} 
                        handleUpdatePrinterSetting={handleUpdatePrinterSetting} 
                        playNotificationSound={playNotificationSound} 
                        isSoundEnabled={isSoundEnabled} 
                        setIsSoundEnabled={setIsSoundEnabled} 
                        autoPrintOnNew={autoPrintOnNew} 
                        setAutoPrintOnNew={setAutoPrintOnNew} 
                        autoPrintOnPrep={autoPrintOnPrep} 
                        setAutoPrintOnPrep={setAutoPrintOnPrep} 
                      />
                    ) : adminSubTab === 'cardapio' ? (
                      <AdminCardapio menuItems={menuItems} />
                    ) : (
                      <div className="space-y-6">

                    {/* Control Center: Audio Alert & Thermal Printer Customization */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden text-left">
                      <div 
                        onClick={() => setIsPrinterConfigOpen(!isPrinterConfigOpen)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
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
                            }}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-650 rounded-lg transition-all border-none cursor-pointer flex items-center justify-center"
                            title="Clique diretamente aqui para imprimir um cupom de teste!"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <div>
                            <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Configurações de Impressora & Avisos ⚙️</h4>
                            <p className="text-[10px] text-slate-400 font-medium">Ajuste bobina térmica, vias e habilite a campainha tipo iFood</p>
                          </div>
                        </div>
                        <span className="text-rose-500 font-extrabold text-[11px] uppercase tracking-wider">
                          {isPrinterConfigOpen ? "▲ Recolher" : "► Ajustar Impressora ⚙️"}
                        </span>
                      </div>
                      
                      {isPrinterConfigOpen && (
                        <div className="p-5 border-t border-slate-100/60 space-y-5">
                          {/* Part 1: Audio Bell controls */}
                          <div className="bg-rose-50/15 border border-rose-100/30 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5 text-left">
                              <span className="text-[10px] font-black text-rose-550 uppercase tracking-wide block">🔔 Campainha iFood (Som de Novos Pedidos)</span>
                              <p className="text-[11px] text-slate-450 leading-relaxed">
                                Toca automaticamente um &ldquo;Ding-Dong&rdquo; acústico assim que um novo cliente finaliza e envia um pedido.
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={playNotificationSound}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-extrabold uppercase tracking-wide cursor-pointer flex items-center gap-1"
                                title="Libera permissão de áudio no navegador e testa o gongo de alerta."
                              >
                                🔊 Testar Som
                              </button>
                              
                              <button
                                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  isSoundEnabled
                                    ? 'bg-emerald-500 text-white shadow-xs'
                                    : 'bg-slate-200 text-slate-500 hover:bg-slate-350 hover:text-slate-700'
                                }`}
                              >
                                {isSoundEnabled ? '● Ativado' : '○ Desativado'}
                              </button>
                            </div>
                          </div>

                          {/* Part 2: Thermal Printer Fields */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-slate-600">
                            {/* Paper size */}
                            <div className="space-y-1">
                              <label className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Largura da Bobina</label>
                              <select
                                value={storeSettings.printerPaperWidth || '80mm'}
                                onChange={(e) => handleUpdatePrinterSetting('printerPaperWidth', e.target.value)}
                                className="w-full p-2.5 rounded-xl border border-slate-200 outline-none bg-slate-50 text-slate-700 font-bold cursor-pointer"
                              >
                                <option value="80mm">80mm (Padrão Completo)</option>
                                <option value="58mm">58mm (Bobina Compacta)</option>
                              </select>
                            </div>

                            {/* Font Size */}
                            <div className="space-y-1">
                              <label className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Tamanho da Fonte (px)</label>
                              <input
                                type="number"
                                min={10}
                                max={14}
                                value={storeSettings.printerFontSize || 12}
                                onChange={(e) => handleUpdatePrinterSetting('printerFontSize', Number(e.target.value))}
                                className="w-full p-2.5 rounded-xl border border-slate-200 outline-none bg-slate-50 text-slate-700 font-bold"
                              />
                            </div>

                            {/* Font style */}
                            <div className="space-y-1">
                              <label className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Estilo de Letra</label>
                              <select
                                value={storeSettings.printerFontType || 'monospace'}
                                onChange={(e) => handleUpdatePrinterSetting('printerFontType', e.target.value)}
                                className="w-full p-2.5 rounded-xl border border-slate-200 outline-none bg-slate-50 text-slate-700 font-bold cursor-pointer"
                              >
                                <option value="monospace">Monospace (Mais Recomendada)</option>
                                <option value="sans-serif">Sem Serifa (Moderna)</option>
                                <option value="serif">Com Serifa</option>
                              </select>
                            </div>

                            {/* Number of Copies */}
                            <div className="space-y-1">
                              <label className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Nº de Vias por Cupom</label>
                              <input
                                type="number"
                                min={1}
                                max={3}
                                value={storeSettings.printerNumCopies || 1}
                                onChange={(e) => handleUpdatePrinterSetting('printerNumCopies', Number(e.target.value))}
                                className="w-full p-2.5 rounded-xl border border-slate-200 outline-none bg-slate-50 text-slate-700 font-bold"
                              />
                            </div>

                            {/* Show Address */}
                            <div className="space-y-1">
                              <label className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Exibir Endereço</label>
                              <select
                                value={storeSettings.printerShowAddress ? 'yes' : 'no'}
                                onChange={(e) => handleUpdatePrinterSetting('printerShowAddress', e.target.value === 'yes')}
                                className="w-full p-2.5 rounded-xl border border-slate-200 outline-none bg-slate-50 text-slate-700 font-bold cursor-pointer"
                              >
                                <option value="yes">Sim, mostrar</option>
                                <option value="no">Não, omitir</option>
                              </select>
                            </div>

                            {/* Print header custom */}
                            <div className="space-y-1">
                              <label className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Cabeçalho Personalizado</label>
                              <input
                                type="text"
                                value={storeSettings.printerHeaderMessage || ''}
                                onChange={(e) => handleUpdatePrinterSetting('printerHeaderMessage', e.target.value)}
                                placeholder="Ex: Via de Cozinha"
                                className="w-full p-2.5 rounded-xl border border-slate-200 outline-none bg-slate-50 text-slate-700 font-bold"
                              />
                            </div>

                            {/* Print footer custom */}
                            <div className="space-y-1 sm:col-span-3">
                              <label className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Mensagem Adicional de Rodapé</label>
                              <input
                                type="text"
                                value={storeSettings.printerFooterMessage || ''}
                                onChange={(e) => handleUpdatePrinterSetting('printerFooterMessage', e.target.value)}
                                placeholder="Muito obrigado pelo seu pedido! Saboreie com prazer!"
                                className="w-full p-2.5 rounded-xl border border-slate-200 outline-none bg-slate-50 text-slate-700 font-bold"
                              />
                            </div>
                          </div>

                          {/* Part 3: Automatic Print Toggles */}
                          <div className="pt-3 border-t border-slate-150/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-105 rounded-xl cursor-pointer border border-slate-150 select-none transition-colors">
                              <input 
                                type="checkbox" 
                                checked={autoPrintOnNew} 
                                onChange={(e) => setAutoPrintOnNew(e.target.checked)}
                                className="w-4.5 h-4.5 accent-rose-600 cursor-pointer rounded"
                              />
                              <div>
                                <h5 className="font-extrabold text-[10.5px] uppercase text-slate-800 leading-tight">Imprimir Novos Pedidos Automaticamente 🖨️</h5>
                                <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">Disparar impressão assim que chegar o pedido no painel de entregas</p>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-105 rounded-xl cursor-pointer border border-slate-150 select-none transition-colors">
                              <input 
                                type="checkbox" 
                                checked={autoPrintOnPrep} 
                                onChange={(e) => setAutoPrintOnPrep(e.target.checked)}
                                className="w-4.5 h-4.5 accent-rose-600 cursor-pointer rounded"
                              />
                              <div>
                                <h5 className="font-extrabold text-[10.5px] uppercase text-slate-800 leading-tight">Imprimir ao Iniciar Preparo 🥣</h5>
                                <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">Disparar quando clicar no botão "Iniciar Preparo"</p>
                              </div>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Filters and Search Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center">
                      {/* Search Bar */}
                      <div className="relative w-full md:max-w-xs">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-[13px]" />
                        <input
                          type="text"
                          value={orderSearchQuery}
                          onChange={(e) => setOrderSearchQuery(e.target.value)}
                          placeholder="Buscar cliente, tel ou ID..."
                          className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-rose-300 focus:bg-white transition-all text-slate-700"
                        />
                      </div>

                      {/* Status Tab Filters */}
                      <div className="flex flex-wrap gap-1.5 w-full md:w-auto items-center justify-end">
                        {(['all', 'waiting', 'preparing', 'delivering', 'completed'] as const).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setOrderStatusFilter(filter)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all select-none cursor-pointer ${
                              orderStatusFilter === filter
                                ? 'bg-rose-500 text-white shadow-xs'
                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200/40'
                            }`}
                          >
                            {filter === 'all' ? 'Ver Todos' :
                             filter === 'waiting' ? '⌛ Pendentes' :
                             filter === 'preparing' ? '🥣 Preparo' :
                             filter === 'delivering' ? '🛵 A Caminho' : '✅ Entregues'}
                          </button>
                        ))}

                        {/* Batch conclude action button */}
                        {orders.filter(o => o.status !== 'completed' && !(o as any).archived).length > 0 && (
                          <button
                            onClick={handleConcludeAllOrders}
                            className={`px-3.5 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all select-none cursor-pointer flex items-center gap-1 shadow-sm border border-emerald-650/30 hover:scale-[1.01] active:scale-[0.99] ${
                              isConfirmingConcludeAll 
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10'
                            }`}
                          >
                            {isConfirmingConcludeAll 
                              ? '⚠️ Confirmar Conclusão' 
                              : `✅ Concluir Todos (${orders.filter(o => o.status !== 'completed' && !(o as any).archived).length})`}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
                  // Customer Header + Subtabs
                  <div className="space-y-4">
                    <div className="text-left bg-rose-50/20 px-5 py-4 border border-rose-100/40 rounded-2xl">
                      <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest block">Minhas Compras</span>
                      <h3 className="text-base font-black text-slate-800">Seu Painel de Pedidos</h3>
                      <p className="text-xs text-slate-400">Aqui você gerencia seus pedidos na loja e visualiza seu histórico completo.</p>
                    </div>

                    {/* Customer Subtab Switcher */}
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                      <button
                        onClick={() => setCustomerSubTab('active')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          customerSubTab === 'active'
                            ? 'bg-white text-rose-650 shadow-xs'
                            : 'text-slate-500 hover:text-slate-850'
                        }`}
                      >
                        🥣 Ativos ({orders.filter(o => o.status !== 'completed' && !(o as any).archived).length})
                      </button>
                      <button
                        onClick={() => setCustomerSubTab('history')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          customerSubTab === 'history'
                            ? 'bg-white text-rose-650 shadow-xs'
                            : 'text-slate-500 hover:text-slate-850'
                        }`}
                      >
                        📜 Histórico ({customerHistoryOrders.length})
                      </button>
                    </div>
                  </div>
                )}

                {/* ORDERS GRID LISTING */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(currentUser?.email === 'brfariarm@gmail.com'
                    ? orders.filter((o) => {
                        // Filter out archived completed orders from active view
                        const isArchived = (o as any).archived === true;
                        if (isArchived) return false;

                        const matchesSearch = !orderSearchQuery ? true : (
                          o.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                          o.details.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                          o.details.customerPhone.includes(orderSearchQuery)
                        );
                        const matchesStatus = orderStatusFilter === 'all' ? true : o.status === orderStatusFilter;
                        return matchesSearch && matchesStatus;
                      })
                    : (customerSubTab === 'active'
                        ? orders.filter(o => o.status !== 'completed' && !(o as any).archived)
                        : customerHistoryOrders
                      )
                  ).map((o) => (
                    <div key={o.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-all space-y-4 text-left">
                      <div className="flex justify-between items-start gap-2 border-b border-rose-50/50 pb-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">ID: {o.id.slice(-6).toUpperCase()}</span>
                          <h4 className="font-extrabold text-slate-800 text-sm leading-snug">{o.details.customerName}</h4>
                          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <span>📱 {o.details.customerPhone}</span>
                            <a
                              href={getWhatsAppStatusUrl(o, o.status)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md font-bold text-[9px] uppercase ml-1.5 transition-colors"
                            >
                              WhatsApp 💬
                            </a>
                          </p>
                          <p className="text-[10px] text-stone-400 font-medium mt-0.5">Realizado às {o.timestamp}</p>
                        </div>
                        <div>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full select-none ${
                            o.status === 'waiting' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                            o.status === 'preparing' ? 'bg-indigo-100 text-indigo-800' :
                            o.status === 'delivering' ? 'bg-rose-100 text-rose-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {o.status === 'waiting' ? '⌛ Aguardando' :
                             o.status === 'preparing' ? '🥣 Preparando' :
                             o.status === 'delivering' ? '🛵 A Caminho' :
                             '✅ Entregue'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs space-y-2.5">
                        {/* Items brief listing */}
                        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[11px] leading-relaxed text-slate-600">
                          <label className="font-bold text-slate-450 uppercase text-[9px] tracking-wider block mb-1">Itens do Pedido ({o.items.length}):</label>
                          {o.items.map((item, index) => (
                            <div key={index} className="border-b border-dashed border-slate-200/50 py-1.5 last:border-0 flex flex-col gap-1">
                              <div className="flex justify-between text-slate-700 font-semibold">
                                <span>{item.quantity}x {item.menuItem.name}</span>
                                <span className="font-mono text-slate-500">R$ {((item.customCupPrice || item.menuItem.price) * item.quantity).toFixed(2)}</span>
                              </div>
                              {item.isCustomCup && item.customCupConfig && (
                                <div className="text-[10px] text-indigo-650 font-semibold leading-normal space-y-0.5">
                                  <p>🥣 Base: {item.customCupConfig.base === 'acai' ? 'Açaí' : item.customCupConfig.base === 'sorvete' ? 'Sorvete' : 'Casadinho'} | Tamanho: {item.customCupConfig.size}</p>
                                  {item.customCupConfig.flavors && item.customCupConfig.flavors.length > 0 && (
                                    <p className="text-slate-500 font-medium pl-3">• Sabores: {item.customCupConfig.flavors.map(fid => FLAVOR_OPTIONS.find(f => f.id === fid)?.name || fid).join(', ')}</p>
                                  )}
                                  {item.customCupConfig.toppings && item.customCupConfig.toppings.length > 0 && (
                                    <p className="text-slate-500 font-medium pl-3">• Adicionais: {item.customCupConfig.toppings.map(tid => TOPPING_OPTIONS.find(t => t.id === tid)?.name || tid).join(', ')}</p>
                                  )}
                                </div>
                              )}
                              {item.notes && (() => {
                                const lower = item.notes.toLowerCase();
                                const isRetire = lower.includes('retir') || lower.includes('tirar') || lower.includes('sem ') || lower.includes('tire');
                                const isSeparado = lower.includes('separad') || lower.includes('mande separ') || lower.includes('pote') || lower.includes('potinho') || lower.includes('mandar separ');
                                
                                if (isRetire && isSeparado) {
                                  return (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide flex items-center gap-1">
                                      <span>⚠️ RETIRAR & SEPARAR:</span>
                                      <span className="font-bold text-slate-700 normal-case">"{item.notes}"</span>
                                    </div>
                                  );
                                }
                                if (isRetire) {
                                  return (
                                    <div className="bg-amber-50 border border-amber-250 text-amber-800 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide flex items-center gap-1">
                                      <span>🚫 RETIRAR INGREDIENTE:</span>
                                      <span className="font-bold text-slate-755 normal-case">"{item.notes}"</span>
                                    </div>
                                  );
                                }
                                if (isSeparado) {
                                  return (
                                    <div className="bg-cyan-50 border border-cyan-200 text-cyan-850 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide flex items-center gap-1">
                                      <span>📦 MANDAR SEPARADO:</span>
                                      <span className="font-bold text-slate-755 normal-case">"{item.notes}"</span>
                                    </div>
                                  );
                                }
                                return (
                                  <p className="text-[9px] text-slate-400 italic">Obs: {item.notes}</p>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                        
                        {/* Payment details */}
                        <div className="flex justify-between items-center bg-rose-50/20 px-3 py-1.5 rounded-xl border border-rose-100/30">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block">Pagamento</span>
                            <span className="font-extrabold text-slate-700 text-xs uppercase leading-none">
                              {o.details.paymentType === 'pix' ? '💳 PIX Online' :
                               o.details.paymentType === 'card' ? '💳 Cartão App' :
                               o.details.paymentType === 'cash_on_delivery' ? '💵 Dinheiro' : '💳 Cartão na Entrega'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-bold block">Total Pago</span>
                            <span className="font-black text-rose-650 text-sm">R$ {o.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Order action row */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100/60">
                        <button
                          onClick={() => {
                            setActiveTrackingOrder(o);
                            setActiveTab('tracker');
                          }}
                          className="flex-1 min-w-[70px] bg-slate-105 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all select-none cursor-pointer text-center border border-slate-250/20"
                        >
                          Abrir Detalhes 📄
                        </button>

                        {currentUser?.email !== 'brfariarm@gmail.com' && (
                          <button
                            onClick={() => handleRepeatOrder(o)}
                            className="flex-shrink-0 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider py-2 px-3.5 rounded-xl transition-all select-none cursor-pointer flex items-center gap-1"
                            title="Adicionar todos os itens deste pedido novamente ao carrinho"
                          >
                            🔄 Repetir Pedido
                          </button>
                        )}

                        {currentUser?.email === 'brfariarm@gmail.com' && (
                          <>
                            <button
                              onClick={() => printOrderReceipt(o, storeSettings)}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all flex items-center justify-center border border-slate-200 cursor-pointer"
                              title="Imprimir Cupom da Cozinha"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={getWhatsAppStatusUrl(o, o.status)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all flex items-center justify-center cursor-pointer text-xs font-semibold"
                              title="Notificar Cliente p/ WhatsApp"
                            >
                              <span className="font-extrabold uppercase tracking-wide text-[10px]">Zap 💬</span>
                            </a>
                          </>
                        )}
                        
                        {/* Admin State Transitions */}
                        {currentUser?.email === 'brfariarm@gmail.com' && (
                          <>
                            {o.status === 'waiting' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(o.id, 'preparing')}
                                className="flex-1 min-w-[100px] bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                              >
                                🥣 Iniciar Preparo
                              </button>
                            )}
                            {o.status === 'preparing' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(o.id, 'delivering')}
                                className="flex-1 min-w-[100px] bg-indigo-650 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                              >
                                🛵 Enviar p/ Entrega
                              </button>
                            )}
                            {o.status === 'delivering' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(o.id, 'completed')}
                                className="flex-1 min-w-[100px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                              >
                                ✅ Concluir Pedido
                              </button>
                            )}
                            {o.status === 'completed' && (
                              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-2 rounded-xl select-none inline-block w-full text-center">
                                🎉 Concluído
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                
                {(currentUser?.email === 'brfariarm@gmail.com'
                  ? orders.filter((o) => {
                      // Filter out archived completed orders
                      const isArchived = (o as any).archived === true;
                      if (isArchived) return false;

                      const matchesSearch = !orderSearchQuery ? true : (
                        o.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                        o.details.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                        o.details.customerPhone.includes(orderSearchQuery)
                      );
                      const matchesStatus = orderStatusFilter === 'all' ? true : o.status === orderStatusFilter;
                      return matchesSearch && matchesStatus;
                    })
                  : (customerSubTab === 'active'
                      ? orders.filter(o => o.status !== 'completed' && !(o as any).archived)
                      : customerHistoryOrders
                    )
                ).length === 0 && (
                  <div className="col-span-1 md:col-span-2 text-center py-8 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-400 font-bold w-full">
                    {currentUser?.email === 'brfariarm@gmail.com'
                      ? 'Nenhum pedido encontrado utilizando os filtros selecionados.'
                      : (customerSubTab === 'active'
                          ? 'Você não possui nenhum pedido ativo no momento.'
                          : 'Seu histórico de pedidos concluídos está vazio.'
                        )
                    }
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      </main>

      {/* 4. Footer info area */}
      <footer className="bg-slate-900 text-white/80 py-8 border-t border-slate-800 text-xs flex-shrink-0 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/5 pb-6">
            <div className="flex items-center gap-3.5">
              <SupremeLogo size={42} />
              <div className="space-y-0.5">
                <h4 className="text-base font-bold font-display text-white">{storeSettings.name}</h4>
                <p className="text-[11px] text-white/50">O sabor supremo do açaí gourmet, taças deliciosas e sorvetes premium.</p>
              </div>
            </div>
            
            {/* Quick social references */}
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-rose-500" />
                <span className="font-semibold">{storeSettings.phone}</span>
              </div>
              <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors" onClick={() => setIsSettingsOpen(true)} title="Clique para editar endereço">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>{storeSettings.address}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-500" />
                <span className="font-semibold flex items-center gap-1">Horário: {storeSettings.openTime} - {storeSettings.closeTime}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-[10px] w-full">
            <p>© 2026 {storeSettings.name} S.A. Todos os direitos reservados.</p>
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
            customizingItem={customizingItem}
            onClose={() => {
              setIsCustomizerOpen(false);
              setCustomizingItem(null);
            }} 
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
            storeAddress={storeSettings.address}
            currentUser={currentUser}
            onSignIn={handleSignInAuto}
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
                  <p className="text-[10px] text-slate-400 font-mono">Sorveteria Supreme • Termos de Privacidade</p>
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
                    Este aplicativo ("{storeSettings.name}") foi desenvolvido para facilitar pedidos online, entrega e consulta de produtos em {storeSettings.city}. Respeitamos a sua privacidade e estamos comprometidos em proteger os dados pessoais que você compartilha conosco.
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
                    O aplicativo coleta e gerencia estes dados apenas localmente em seu dispositivo (através do seu navegador web) usando recursos do próprio sistema local (localStorage do PWA). Nenhum dado do seu cartão ou endereço pessoal é transferido para servidores de terceiros ou comercializado para fins de marketing.
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
                    <strong>{storeSettings.name}</strong><br />
                    Telefone/WhatsApp: {storeSettings.phone}<br />
                    Endereço: {storeSettings.address}<br />
                    E-mail: {storeSettings.email}
                  </p>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 border-t border-rose-50 flex gap-3 items-center bg-slate-50 justify-between">
                <button
                  onClick={() => {
                    const txt = `POLÍTICA DE PRIVACIDADE – ${storeSettings.name.toUpperCase()}

Última atualização: Junho de 2026

1. Informações Gerais
Este aplicativo ("${storeSettings.name}") foi desenvolvido para facilitar pedidos online, entrega e consulta de produtos da nossa loja em ${storeSettings.city}. Respeitamos a sua privacidade e estamos comprometidos em proteger os dados pessoais que você compartilha conosco.

2. Dados Coletados e Finalidade
Para podermos processar pedidos e realizar a entrega com precisão, o aplicativo poderá solicitar:
- Nome Completo: Para identificação do cliente no pedido.
- Número de Telefone/WhatsApp: Para contato direto, suporte e atualizações de entrega.
- Endereço de Entrega: Para que possamos calcular rotas e entregar seu pedido corretamente.
- Tipo de Pagamento (PIX ou Cartão): Apenas para controle interno do método selecionado de pagamento (não processamos ou armazenamos dados confidenciais de cartões de segurança no aplicativo).

3. Armazenamento Local e Segurança
O aplicativo coleta e gerencia estes dados apenas localmente em seu dispositivo (através do seu navegador web) usando recursos do próprio sistema local (localStorage do PWA). Nenhum dado do seu cartão ou endereço pessoal é transferido para servidores de terceiros ou comercializado para fins de marketing.

4. Direitos do Usuário (LGPD)
De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem total controle sobre seus dados:
- Visualizar todos os seus dados e pedidos efetuados.
- Excluir ou limpar todos os seus dados e histórico de pedidos a qualquer momento (basta limpar o cache do seu navegador ou desinstalar o aplicativo).
- Recusar o compartilhamento de sua localização aproximada.

5. Responsável e Contato
Para dúvidas adicionais, solicitações ou suporte, entre em contato diretamente com o responsável de atendimento ao cliente:
${storeSettings.name}
Telefone/WhatsApp: ${storeSettings.phone}
Endereço: ${storeSettings.address}
E-mail: ${storeSettings.email}`;
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
                      alert("Link da Política de Privacidade copiado para a área de transferência!");
                    }}
                    className="bg-white border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Copia o link exato que exibe a política imediatamente"
                  >
                    Copiar Link Direto
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

      {/* 8.5. QR Code Share Modal */}
      <AnimatePresence>
        {showShareQrModal && (
          <div className="fixed inset-0 z-55 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareQrModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
            />

            {/* Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl max-w-sm w-full flex flex-col overflow-hidden shadow-2xl border border-rose-100 relative z-50 font-sans p-5 text-center"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">Acesso em outro aparelho</span>
                <button 
                  type="button"
                  onClick={() => setShowShareQrModal(false)}
                  className="p-1 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col items-center space-y-3.5">
                <span className="bg-rose-500 text-white font-black text-[9px] tracking-wider px-2.5 py-1 rounded-full uppercase select-none animate-pulse">
                  LEIA: Ativação Obrigatória ⚠️
                </span>

                <div className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-xs">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.href.replace('ais-dev-', 'ais-pre-'))}`} 
                    alt="QR Code do App" 
                    className="w-40 h-40"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                  Como liberar o acesso mobile?
                </h3>
                
                <div className="text-[11px] text-slate-600 leading-normal font-semibold text-left bg-slate-50 border border-slate-150 p-3 rounded-2xl space-y-2">
                  <p>
                    O Google bloqueia acessos externos por padrão. Para abrir o app em outro celular de forma pública:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-700 text-[10.5px]">
                    <li>No seu computador, no menu superior do <strong>Google AI Studio</strong>, clique em <strong className="text-rose-600">"Compartilhar" (Share)</strong>.</li>
                    <li>Crie/Ative o link público de visualização.</li>
                    <li>Acesse o link público <strong className="text-rose-600">ais-pre-...</strong> pelo QR Code ou copie-o no botão abaixo.</li>
                  </ol>
                </div>

                <div className="w-full text-[9.5px] font-mono font-bold text-rose-600 bg-rose-50/55 border border-rose-105 p-2 rounded-xl break-all">
                  {window.location.href.replace('ais-dev-', 'ais-pre-')}
                </div>

                <div className="w-full flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const publicUrl = window.location.href.replace('ais-dev-', 'ais-pre-');
                      navigator.clipboard.writeText(publicUrl);
                      alert("✓ LINK PÚBLICO COPIADO! Cole no WhatsApp do seu celular para abrir na hora sem erro de login!");
                    }}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                  >
                    Copiar URL Pública
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowShareQrModal(false)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9.1 Connection & Diagnostics Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-55 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
            />

            {/* Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl max-w-md w-full flex flex-col overflow-hidden shadow-2xl border border-slate-100 relative z-50 font-sans text-xs text-slate-600 font-semibold"
            >
              {/* Header */}
              <div className="p-5 border-b border-rose-50 flex justify-between items-center bg-rose-50/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-550/10 flex items-center justify-center text-rose-500">
                    🍧
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">
                      Acessar SUPREME ID
                    </h3>
                    <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Identidade digital de cliente</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAuthModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto space-y-4 max-h-[70vh]">
                <p className="text-[11px] text-slate-450 leading-relaxed font-normal">
                  Sua conta pessoal na Supreme. Com ela você acompanha seu açaí e sorvetes favoritos em tempo real e salva seu histórico.
                </p>

                {/* Authentication login options */}
                <div className="space-y-3">
                  <button
                    onClick={async () => {
                      setIsAuthModalOpen(false);
                      await handleSignIn('google');
                    }}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-md shadow-rose-100 cursor-pointer text-xs uppercase"
                  >
                    <span className="font-black tracking-wider">SUPREME ID</span>
                    <span className="text-[10px] text-white/90 font-normal lowercase tracking-normal">(via Google Pop-up)</span>
                  </button>
                </div>

                {/* Guest Account option */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <h4 className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest text-left">
                    Pedido sem Cadastro
                  </h4>
                  <button
                    onClick={async () => {
                      setIsAuthModalOpen(false);
                      await handleSignIn('anonymous');
                    }}
                    className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-[10px] tracking-wide rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-100 cursor-pointer"
                  >
                    Fazer Pedido como Convidado
                  </button>
                  <p className="text-[10px] text-slate-450 leading-relaxed font-normal text-center">
                    (Seu pedido será enviado instantaneamente ao painel sem necessidade de login!)
                  </p>
                </div>

                {/* Administrator / Owner troubleshooting instructions info */}
                <div className="pt-3.5 border-t border-slate-100 space-y-2">
                  <h4 className="text-[11px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5 text-left">
                    <ShieldAlert className="w-3.5 h-3.5" /> Se os logins falharem:
                  </h4>
                  <div className="bg-amber-50/50 border border-amber-200/40 p-3.5 rounded-2xl space-y-2 text-[10px] text-slate-500 leading-normal font-normal text-left">
                    <p>
                      Se você é o proprietário do app e o login falhar, certifique-se de realizar estas configurações no seu Firebase Console:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>
                        <strong>Ativar Provedores:</strong> Em <em>Authentication</em> &gt; <em>Sign-in method</em>, ative o login do <strong>Google</strong> e o login <strong>Anônimo</strong>.
                      </li>
                      <li>
                        <strong>Autorizar Domínios de Teste:</strong> Na seção de domínios autorizados, adicione o endereço de teste atual:
                        <div className="mt-1 font-mono font-bold text-slate-800 bg-white p-1.5 rounded-lg border border-amber-200 select-all text-[9.5px]">
                          {window.location.hostname}
                        </div>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-50 bg-slate-50/80 flex justify-end">
                <button
                  onClick={() => setIsAuthModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer text-xs font-bold"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* 9. Store Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && currentUser?.email === 'brfariarm@gmail.com' && (
          <div className="fixed inset-0 z-55 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
            />

            {/* Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl max-w-md w-full flex flex-col overflow-hidden shadow-2xl border border-slate-100 relative z-50 font-sans"
            >
              {/* Header */}
              <div className="p-5 border-b border-rose-50 flex justify-between items-center bg-rose-50/20">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-rose-500 animate-[spin_4s_linear_infinite]" />
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">
                      Configurações do Estabelecimento
                    </h3>
                    <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Ajustes locais da simulação</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 overflow-y-auto space-y-4 text-xs font-semibold text-slate-600 max-h-[70vh]">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Nome Oficial</label>
                  <input
                    type="text"
                    value={storeSettings.name}
                    onChange={(e) => setStoreSettings({ ...storeSettings, name: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-505 bg-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Nome Curto (Header)</label>
                    <input
                      type="text"
                      value={storeSettings.shortName}
                      onChange={(e) => setStoreSettings({ ...storeSettings, shortName: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Cidade principal</label>
                    <input
                      type="text"
                      value={storeSettings.city}
                      onChange={(e) => setStoreSettings({ ...storeSettings, city: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Endereço de Atendimento</label>
                  <input
                    type="text"
                    value={storeSettings.address}
                    onChange={(e) => setStoreSettings({ ...storeSettings, address: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={storeSettings.phone}
                      onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">E-mail de Contato</label>
                    <input
                      type="email"
                      value={storeSettings.email}
                      onChange={(e) => setStoreSettings({ ...storeSettings, email: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <h4 className="text-[11px] font-black text-rose-550 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Horário de Funcionamento
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Abertura (HH:MM)</label>
                      <input
                        type="text"
                        value={storeSettings.openTime}
                        placeholder="Ex: 11:00"
                        onChange={(e) => setStoreSettings({ ...storeSettings, openTime: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Fechamento (HH:MM)</label>
                      <input
                        type="text"
                        value={storeSettings.closeTime}
                        placeholder="Ex: 23:00"
                        onChange={(e) => setStoreSettings({ ...storeSettings, closeTime: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Simulação de Status</label>
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                      <button
                        onClick={() => setStoreSettings({ ...storeSettings, statusOverride: 'auto' })}
                        className={`text-[10px] font-black py-2 rounded-xl transition-all uppercase ${
                          storeSettings.statusOverride === 'auto'
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-850 hover:bg-slate-100'
                        }`}
                      >
                        Automático
                      </button>
                      <button
                        onClick={() => setStoreSettings({ ...storeSettings, statusOverride: 'open' })}
                        className={`text-[10px] font-black py-2 rounded-xl transition-all uppercase ${
                          storeSettings.statusOverride === 'open'
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-850 hover:bg-slate-100'
                        }`}
                      >
                        Forçar Aberto
                      </button>
                      <button
                        onClick={() => setStoreSettings({ ...storeSettings, statusOverride: 'closed' })}
                        className={`text-[10px] font-black py-2 rounded-xl transition-all uppercase ${
                          storeSettings.statusOverride === 'closed'
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-850 hover:bg-slate-100'
                        }`}
                      >
                        Forçar Fechado
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-450 leading-relaxed font-normal">
                      <strong>Automático:</strong> Compara a hora local do seu dispositivo com os campos de abertura e fechamento acima.<br />
                      <strong>Forçar:</strong> Útil para validar o comportamento visual do app aberto ou fechado em qualquer hora do dia.
                    </p>
                  </div>
                </div>

                {/* 9.2 Thermal Printer Settings Section */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <h4 className="text-[11px] font-black text-rose-550 uppercase tracking-widest flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
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
                      }}
                      className="p-1 bg-rose-500/15 hover:bg-rose-500 hover:text-white rounded-lg transition-all border-none cursor-pointer text-rose-650 flex items-center justify-center"
                      title="Clique aqui para testar a impressora!"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <span>Impressora Térmica</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Largura da Bobina</label>
                      <select
                        value={storeSettings.printerPaperWidth || '80mm'}
                        onChange={(e) => setStoreSettings({ ...storeSettings, printerPaperWidth: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                      >
                        <option value="80mm">80mm (Mesa / Balcão / USB)</option>
                        <option value="58mm">58mm (Portátil / Bluetooth)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Vias / Cópias</label>
                      <select
                        value={storeSettings.printerNumCopies || 1}
                        onChange={(e) => setStoreSettings({ ...storeSettings, printerNumCopies: Number(e.target.value) })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                      >
                        <option value={1}>1 Via (Padrão)</option>
                        <option value={2}>2 Vias (Cozinha + Entrega)</option>
                        <option value={3}>3 Vias (Produção + Entrega + Controle)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Tamanho da Fonte</label>
                      <select
                        value={storeSettings.printerFontSize || 12}
                        onChange={(e) => setStoreSettings({ ...storeSettings, printerFontSize: Number(e.target.value) })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                      >
                        <option value={10}>10px (Compacto / Econômico)</option>
                        <option value={11}>11px (Pequeno)</option>
                        <option value={12}>12px (Médio / Ideal)</option>
                        <option value={14}>14px (Grande / Legível)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Tipo de Fonte</label>
                      <select
                        value={storeSettings.printerFontType || 'monospace'}
                        onChange={(e) => setStoreSettings({ ...storeSettings, printerFontType: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                      >
                        <option value="monospace">Monospace (Tradicional)</option>
                        <option value="sans-serif">Sans-serif (Moderno)</option>
                        <option value="serif">Serifado (Elegant/Vintage)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Título do Comprovante</label>
                    <input
                      type="text"
                      value={storeSettings.printerHeaderMessage || ''}
                      placeholder="Ex: Via de Produção"
                      onChange={(e) => setStoreSettings({ ...storeSettings, printerHeaderMessage: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Mensagem do Rodapé</label>
                    <input
                      type="text"
                      value={storeSettings.printerFooterMessage || ''}
                      placeholder="Ex: Muito obrigado pela preferência!"
                      onChange={(e) => setStoreSettings({ ...storeSettings, printerFooterMessage: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-1 select-none">
                    <input
                      type="checkbox"
                      id="printerShowAddress"
                      checked={storeSettings.printerShowAddress !== false}
                      onChange={(e) => setStoreSettings({ ...storeSettings, printerShowAddress: e.target.checked })}
                      className="w-4 h-4 rounded-md border-slate-350 text-rose-500 focus:ring-rose-500 cursor-pointer"
                    />
                    <label htmlFor="printerShowAddress" className="text-[10px] font-bold uppercase tracking-wide text-slate-600 cursor-pointer">
                      Mostrar Endereço e Telefone da Loja no Cupom
                    </label>
                  </div>

                  <div className="bg-rose-50/50 border border-rose-100 p-3 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-rose-600 leading-normal font-semibold">
                        Quer testar se sua impressora térmica está respondendo corretamente?
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const mockOrder = {
                            id: 'TEST99',
                            timestamp: new Date().toLocaleString('pt-BR'),
                            status: 'preparing' as const,
                            total: 39.90,
                            details: {
                              customerName: 'Cliente de Teste 🍦',
                              customerPhone: '(11) 98765-4321',
                              deliveryType: 'delivery' as const,
                              address: {
                                street: 'Rua das Palmeiras de Teste',
                                number: '123',
                                neighborhood: 'Bairro Jardim Doce',
                                city: storeSettings.city,
                                reference: 'Próximo à Praça Central'
                              },
                              paymentType: 'pix' as const
                            },
                            items: [
                              {
                                id: 'item-1',
                                menuItem: {
                                  id: '1',
                                  name: 'Copo Supreme 400ml',
                                  description: 'Copo montado personalizado',
                                  price: 24.90,
                                  category: 'acai' as const,
                                  image: ''
                                },
                                quantity: 1,
                                isCustomCup: true,
                                customCupConfig: {
                                  size: '400ml' as const,
                                  base: 'acai' as const,
                                  flavors: [],
                                  toppings: []
                                },
                                customCupPrice: 24.90,
                                notes: 'Sem banana e com bastante leite condensado'
                              },
                              {
                                id: 'item-2',
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
                        }}
                        className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xs flex items-center gap-1 cursor-pointer select-none"
                      >
                        <Printer className="w-3 h-3" /> Imprimir Teste
                      </button>
                    </div>
                  </div>
                </div>

                {/* Diagnostics / Clear cache troubleshooting helper */}
                <div className="pt-2.5 border-t border-slate-100 space-y-3">
                  <h4 className="text-[11px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Solução de Problemas
                  </h4>
                  <div className="bg-amber-50/50 border border-amber-200/40 p-3.5 rounded-2xl space-y-2">
                    <p className="text-[10px] text-slate-500 leading-relaxed font-normal">
                      Caso o aplicativo esteja enfrentando lentidão, travando ou apresentando tela branca em outros aparelhos, limpe o cache antigo para carregar a versão mais recente diretamente.
                    </p>
                    <button
                      onClick={async () => {
                        if (confirm("Deseja realmente limpar todos os dados em cache e recarregar o aplicativo? Isso removerá o carrinho atual.")) {
                          try {
                            if ('serviceWorker' in navigator) {
                              const registrations = await navigator.serviceWorker.getRegistrations();
                              for (const registration of registrations) {
                                await registration.unregister();
                              }
                            }
                            if ('caches' in window) {
                              const keys = await caches.keys();
                              for (const key of keys) {
                                await caches.delete(key);
                              }
                            }
                            localStorage.removeItem('supreme_store_settings');
                            localStorage.removeItem('supreme_cart');
                            localStorage.removeItem('supreme_orders');
                            window.location.href = window.location.origin + '?nocache=' + Date.now();
                          } catch (e) {
                            window.location.reload();
                          }
                        }
                      }}
                      className="w-full py-2.5 bg-amber-550 hover:bg-amber-600 text-slate-950 font-black uppercase text-[9px] tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 animate-[spin_6s_linear_infinite]" />
                      Limpar Cache e Forçar Atualização
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-50 bg-slate-50/80 flex justify-end gap-2.5">
                <button
                  onClick={async () => {
                    // Reset to defaults
                    if (window.confirm("Deseja redefinir as configurações para os dados originais?")) {
                      const defaults = {
                        ...STORE_CONFIG,
                        openTime: "11:00",
                        closeTime: "23:00",
                        statusOverride: "auto",
                        printerPaperWidth: "80mm",
                        printerNumCopies: 1,
                        printerFontSize: 12,
                        printerFontType: "monospace",
                        printerShowAddress: true,
                        printerHeaderMessage: "Comprovante de Pedido",
                        printerFooterMessage: "Muito obrigado pela preferência!",
                      };
                      setStoreSettings(defaults);
                      await handleSaveStoreSettingsToFirestore(defaults);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer text-xs font-bold"
                >
                  Restaurar Padrão
                </button>
                <button
                  onClick={async () => {
                    await handleSaveStoreSettingsToFirestore(storeSettings);
                    setIsSettingsOpen(false);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-100 transition-all cursor-pointer text-xs font-extrabold"
                >
                  Salvar e Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast notifications container for admin */}
      {currentUser?.email === 'brfariarm@gmail.com' && (
        <div className="fixed bottom-6 right-6 z-[999] p-4 pointer-events-none flex flex-col gap-3 max-w-sm w-full">
          <AnimatePresence>
            {visualNotifications.map((toast) => (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                className="pointer-events-auto bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-slate-800 flex flex-col gap-2.5 relative overflow-hidden"
              >
                {/* Decorative neon pulse */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-indigo-500 animate-pulse" />
                
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="flex gap-2">
                    <span className="text-xl shrink-0" role="img" aria-label="Açaí Cup">🥣</span>
                    <div className="text-left">
                      <span className="text-[9px] font-black uppercase tracking-widest text-rose-450 block mb-0.5 animate-pulse">🛎️ Novo Pedido Recebido</span>
                      <h4 className="text-xs font-black text-white leading-tight mb-1 truncate max-w-[200px]">
                        {toast.clientName}
                      </h4>
                      <p className="text-[10px] text-slate-300 font-bold">
                        {toast.itemsCount} {toast.itemsCount === 1 ? 'item' : 'itens'} • <strong className="text-slate-100">R$ {toast.total.toFixed(2).replace('.', ',')}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setVisualNotifications((prev) => prev.filter((t) => t.id !== toast.id))}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-800/60 justify-between">
                  <span className="text-[9px] text-slate-400 font-mono">
                    {toast.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        const ord = orders.find(o => o.id === toast.orderId);
                        if (ord) {
                          try {
                            printOrderReceipt(ord, storeSettings);
                          } catch (err) {
                            console.error("Manual print on toast click failed:", err);
                          }
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-[8.5px] tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      title="Imprimir Cupom"
                    >
                      <Printer className="w-3 h-3" /> Imprimir
                    </button>
                    <button
                      onClick={() => {
                        setVisualNotifications((prev) => prev.filter((t) => t.id !== toast.id));
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[8.5px] tracking-wider rounded-lg transition-all cursor-pointer"
                    >
                      Ok
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Toast notifications container for CUSTOMERS */}
      <AnimatePresence>
        {currentUser?.email !== 'brfariarm@gmail.com' && notificationToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] max-w-md w-[90%] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl p-4 border border-rose-500/20 flex gap-3.5 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-550 to-amber-500 animate-pulse" />
              
              <div className="text-left flex-1 col-span-3">
                <h4 className="text-xs font-black text-white leading-tight uppercase tracking-wider mb-1">
                  {notificationToast.title}
                </h4>
                <p className="text-[11px] text-slate-300 font-bold leading-normal">
                  {notificationToast.message}
                </p>
              </div>
              
              <button
                onClick={() => setNotificationToast(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 align-top self-start"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Celebration Modal for Completed Orders */}
      <AnimatePresence>
        {completedCelebrationOrder && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-white rounded-[32px] shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100 flex flex-col items-center gap-4 relative overflow-hidden"
            >
              {/* Decorative top wave */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-rose-500 to-violet-500 animate-gradient" />
              
              {/* Ice cream celebration graphic / emoji banner */}
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-4xl animate-bounce mb-2">
                🍨
              </div>

              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                Seu Pedido está Pronto! 🎉
              </h3>
              
              <p className="text-xs text-slate-500 font-medium px-2 leading-relaxed">
                O pedido <span className="font-bold text-slate-800">#{completedCelebrationOrder.id.slice(-6).toUpperCase()}</span> foi preparado com todo carinho, carimbado e entregue! Desejamos uma experiência deliciosa! 🥰
              </p>

              {/* Quick review indicator stars */}
              <div className="flex gap-1 py-1 text-amber-500 animate-pulse">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>

              <p className="text-[10px] text-slate-400 font-bold block mb-1">
                Gostou? Deixe sua avaliação de 5 estrelas!
              </p>

              <button
                onClick={() => setCompletedCelebrationOrder(null)}
                className="w-full py-3 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] transition-all text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-rose-100 cursor-pointer"
              >
                Muito Obrigado! ❤️
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
