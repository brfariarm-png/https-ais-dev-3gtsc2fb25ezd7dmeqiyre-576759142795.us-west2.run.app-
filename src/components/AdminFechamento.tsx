import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  CheckCircle2, 
  Layers, 
  Lock, 
  FileText, 
  Calendar, 
  User, 
  Printer, 
  Inbox, 
  Coins,
  ChevronRight,
  AlertCircle,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Archive
} from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Order } from '../types';
import { printCloseoutReceipt as printCloseoutExternal } from '../utils/printHelper';

interface AdminFechamentoProps {
  orders: Order[];
  storeSettings: any;
  onRefreshOrders: () => void;
  setOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
}

interface CloseoutData {
  id: string;
  closedAt: string;
  closedBy: string;
  ordersCount: number;
  totalSales: number;
  pixSales: number;
  cardSales: number;
  cashSales: number;
  notes: string;
  orderIds: string[];
}

export default function AdminFechamento({ orders, storeSettings, onRefreshOrders, setOrders }: AdminFechamentoProps) {
  const [pastCloseouts, setPastCloseouts] = useState<CloseoutData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConfirmingCloseout, setIsConfirmingCloseout] = useState(false);
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Filter current active shift orders: completed and NOT archived
  // (We assume completed orders without archived property or archived !== true are available for current stats)
  const shiftOrders = orders.filter((o) => o.status === 'completed' && !(o as any).archived);

  // All active/unarchived orders of any status to be cleared/zeroed on closeout
  const allActiveOrders = orders.filter((o) => !(o as any).archived);

  // Statistics calculations
  const ordersCount = shiftOrders.length;
  const totalSales = shiftOrders.reduce((sum, o) => sum + o.total, 0);
  
  // Breakdown by payment type
  const pixSales = shiftOrders
    .filter((o) => o.details.paymentType === 'pix')
    .reduce((sum, o) => sum + o.total, 0);

  const cardSales = shiftOrders
    .filter((o) => o.details.paymentType === 'card' || o.details.paymentType === 'card_on_delivery')
    .reduce((sum, o) => sum + o.total, 0);

  const cashSales = shiftOrders
    .filter((o) => o.details.paymentType === 'cash_on_delivery')
    .reduce((sum, o) => sum + o.total, 0);

  // Group closeouts by day and month (e.g. "15/06" folder name, and "15 de Junho" folder label)
  const getDirGroupName = (dateIso: string) => {
    const d = new Date(dateIso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  const getDirGroupLabel = (dateIso: string) => {
    const d = new Date(dateIso);
    const day = d.getDate();
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${day} de ${monthNames[d.getMonth()]}`;
  };

  const getCloseoutOrders = (orderIds: string[]) => {
    if (!orderIds) return [];
    return orders.filter(o => orderIds.includes(o.id));
  };

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (key: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Fetch past closeouts from Firebase
  const fetchPastCloseouts = async () => {
    try {
      const q = query(collection(db, 'closeouts'), orderBy('closedAt', 'desc'));
      const snap = await getDocs(q);
      const list: CloseoutData[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          closedAt: data.closedAt,
          closedBy: data.closedBy,
          ordersCount: data.ordersCount,
          totalSales: data.totalSales,
          pixSales: data.pixSales,
          cardSales: data.cardSales,
          cashSales: data.cashSales,
          notes: data.notes || '',
          orderIds: data.orderIds || []
        });
      });

      // Merge with local closeouts if any exist
      const cachedCloseoutsStr = localStorage.getItem('supreme_completed_closeouts');
      if (cachedCloseoutsStr) {
        try {
          const localCloseouts: CloseoutData[] = JSON.parse(cachedCloseoutsStr);
          localCloseouts.forEach((lc) => {
            if (!list.some(item => item.id === lc.id)) {
              list.push(lc);
            }
          });
          // Sort merged list
          list.sort((a, b) => b.closedAt.localeCompare(a.closedAt));
        } catch (e) {
          console.error('Error parsing local closeouts on merge:', e);
        }
      }

      setPastCloseouts(list);
    } catch (err: any) {
      console.error('Failed to fetch past closeouts, loading local cash instead:', err);
      // Fallback to local closeouts
      const cachedCloseoutsStr = localStorage.getItem('supreme_completed_closeouts');
      if (cachedCloseoutsStr) {
        try {
          const localCloseouts: CloseoutData[] = JSON.parse(cachedCloseoutsStr);
          setPastCloseouts(localCloseouts);
        } catch (e) {
          console.error('Failed to load pure local closeouts:', e);
        }
      }
    }
  };

  useEffect(() => {
    fetchPastCloseouts();
  }, []);

  // Compute final grouped collection for collapsible render
  const groupedCloseouts = pastCloseouts.reduce((acc, item) => {
    const key = getDirGroupName(item.closedAt);
    const label = getDirGroupLabel(item.closedAt);
    if (!acc[key]) {
      acc[key] = {
        key,
        label,
        items: []
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { key: string; label: string; items: CloseoutData[] }>);

  // Sort grouped list so latest day folders appear first
  const groupedList = Object.values(groupedCloseouts).sort((a, b) => {
    const dateA = a.items[0]?.closedAt || '';
    const dateB = b.items[0]?.closedAt || '';
    return dateB.localeCompare(dateA);
  });

  // Auto-expand the newest day folder when they load
  useEffect(() => {
    if (groupedList.length > 0 && Object.keys(expandedFolders).length === 0) {
      setExpandedFolders({ [groupedList[0].key]: true });
    }
  }, [pastCloseouts, groupedList]);

  // Handle closing / closeout submit
  const handlePerformCloseout = async () => {
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const orderIds = allActiveOrders.map((o) => o.id);
      const closeoutPayload = {
        closedAt: new Date().toISOString(),
        closedBy: storeSettings.email || 'brfariarm@gmail.com',
        ordersCount,
        totalSales,
        pixSales,
        cardSales,
        cashSales,
        notes,
        orderIds
      };

      // 1. Create closeout record
      const docRef = await addDoc(collection(db, 'closeouts'), closeoutPayload);

      // 2. Batch update ALL unarchived active orders of the day so we fully zero the view!
      if (allActiveOrders.length > 0) {
        const batch = writeBatch(db);
        allActiveOrders.forEach((o) => {
          const orderRef = doc(db, 'orders', o.id);
          batch.update(orderRef, { archived: true });
        });
        await batch.commit();

        // Instantly clean the orders panel locally with zero delay
        if (setOrders) {
          setOrders((prevOrders) =>
            prevOrders.map((ordersItem) =>
              orderIds.includes(ordersItem.id) ? { ...ordersItem, archived: true } : ordersItem
            )
          );
        }
      }

      setNotes('');
      setSuccessMsg('🏆 Fechamento de Caixa realizado com sucesso! Os pedidos correspondentes foram arquivados.');
      
      // Auto reprint/print closeout ticket in terminal format
      try {
        printCloseoutReceipt({ id: docRef.id, ...closeoutPayload });
      } catch (printErr) {
        console.error('Failed to print closeout receipt:', printErr);
      }

      await fetchPastCloseouts();
      onRefreshOrders();
    } catch (err: any) {
      console.error('Error performing closeout in Firestore, falling back to local closeout:', err);
      
      // Contingency Local Fallback: Save to localStorage and update state!
      try {
        const orderIds = allActiveOrders.map((o) => o.id);
        const closeoutPayload: CloseoutData = {
          id: `clo-local-${Date.now()}`,
          closedAt: new Date().toISOString(),
          closedBy: storeSettings.email || 'brfariarm@gmail.com',
          ordersCount,
          totalSales,
          pixSales,
          cardSales,
          cashSales,
          notes,
          orderIds
        };

        // If local update setter exists, call it to immediately update parent Orders state
        if (setOrders) {
          setOrders((prevOrders) =>
            prevOrders.map((ordersItem) =>
              orderIds.includes(ordersItem.id) ? { ...ordersItem, archived: true } : ordersItem
            )
          );
        }

        // Cache the local closeout custom receipt
        const cachedCloseoutsStr = localStorage.getItem('supreme_completed_closeouts');
        let cachedList: CloseoutData[] = [];
        if (cachedCloseoutsStr) {
          try {
            cachedList = JSON.parse(cachedCloseoutsStr);
          } catch (e) {
            console.error(e);
          }
        }
        cachedList.unshift(closeoutPayload);
        localStorage.setItem('supreme_completed_closeouts', JSON.stringify(cachedList));

        // Let the state load local closeouts immediately
        setPastCloseouts((prev) => [closeoutPayload, ...prev]);

        setNotes('');
        setSuccessMsg('🏆 Fechamento de Turno concluído localmente com sucesso! (Modo de contingência offline ativo)');
        
        try {
          printCloseoutReceipt(closeoutPayload);
        } catch (printErr) {
          console.error('Failed to print closeout receipt:', printErr);
        }

        onRefreshOrders();
      } catch (fallbackErr: any) {
        console.error('Fallback closeout process also failed:', fallbackErr);
        setErrorMsg('Ocorreu um erro ao gravar o fechamento no banco de dados: ' + err.message);
      }
    } finally {
      setLoading(false);
      setIsConfirmingCloseout(false);
    }
  };

  // Delegate printing to the robust persistent iframe helper
  const printCloseoutReceipt = (data: Omit<CloseoutData, 'notes'> & { notes?: string }) => {
    printCloseoutExternal(data, storeSettings);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header and description */}
      <div className="bg-gradient-to-r from-violet-650 to-indigo-600 p-6 rounded-[28px] text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10 space-y-1">
          <span className="text-[10px] bg-white/20 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Módulo Financeiro 🔐
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight font-sans">Fechamento de Caixa & Estatísticas</h2>
          <p className="text-xs text-white/85 font-medium">Calcule o faturamento do turno por Pix, Cartão e Dinheiro, salve no histórico e feche o expediente.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Current Active Shift Statistics */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-6">
          <div>
            <h3 className="font-extrabold text-base text-slate-800 uppercase tracking-wider font-sans flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-600" />
              Turno Atual em Aberto
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Estatísticas acumuladas de pedidos concluídos desde o último fechamento.</p>
          </div>

          {/* Core metrics visualizer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-violet-50/50 p-4 rounded-2xl border border-violet-100/50">
              <span className="text-[10px] font-black text-violet-700 uppercase tracking-widest block">Vendas Concluídas</span>
              <span className="text-2xl font-black text-violet-900 block mt-1">R$ {totalSales.toFixed(2)}</span>
              <p className="text-[9px] text-violet-600 font-bold mt-1">{ordersCount} pedidos faturados</p>
            </div>

            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">Recebimento Pix</span>
              <span className="text-2xl font-black text-emerald-900 block mt-1">R$ {pixSales.toFixed(2)}</span>
              <p className="text-[9px] text-emerald-600 font-bold mt-1">Método conveniente online</p>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest block">Apenas Cartão</span>
              <span className="text-2xl font-black text-blue-900 block mt-1">R$ {cardSales.toFixed(2)}</span>
              <p className="text-[9px] text-blue-600 font-bold mt-1">Maquininha ou App</p>
            </div>

            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest block">Dinheiro / Espécie</span>
              <span className="text-2xl font-black text-amber-900 block mt-1">R$ {cashSales.toFixed(2)}</span>
              <p className="text-[9px] text-amber-600 font-bold mt-1">Dinheiro em mãos</p>
            </div>
          </div>

          {/* Closeout action form */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">
                Observações de Fechamento (Opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Diferença de R$ 2,00 no caixa de dinheiro. Tudo correto no Pix."
                className="w-full min-h-[80px] p-3 rounded-2xl border border-slate-200 text-xs font-medium focus:border-violet-500 outline-none transition-colors"
              />
            </div>

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 p-3 rounded-xl text-xs font-bold leading-normal flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-250 text-rose-800 p-3 rounded-xl text-xs font-bold leading-normal flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isConfirmingCloseout && (
              <div className="bg-amber-50/70 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs font-bold leading-normal space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    {shiftOrders.length === 0 && allActiveOrders.length === 0
                      ? 'Confirmar fechamento de caixa zerado (R$ 0,00)? Seus dados atuais estão em branco.'
                      : 'Deseja realmente efetuar o Fechamento de Caixa deste turno? Todos os pedidos ativos e concluídos deste período serão arquivados para iniciar um novo caixa zerado.'}
                  </span>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setIsConfirmingCloseout(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold uppercase text-[10px] tracking-widest transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handlePerformCloseout}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold uppercase text-[10px] tracking-widest transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processando...' : 'Sim, Fechar Caixa'}
                  </button>
                </div>
              </div>
            )}

            {!isConfirmingCloseout && (
              <button
                onClick={() => setIsConfirmingCloseout(true)}
                disabled={loading}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  loading
                    ? 'bg-slate-300 shadow-none cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-950/20 active:scale-[0.99]'
                }`}
              >
                <Lock className="w-4 h-4" />
                {loading ? 'Processando Fechamento...' : 'Efetuar Fechamento de Caixa'}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Past Shift Closeouts Log */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-6 flex flex-col">
          <div>
            <h3 className="font-extrabold text-base text-slate-800 uppercase tracking-wider font-sans flex items-center gap-2">
              <Inbox className="w-5 h-5 text-violet-600" />
              Histórico de Fechamentos
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Turnos fechados e salvos com segurança no banco de dados.</p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[460px] space-y-4 pr-1">
            {pastCloseouts.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-bold">Nenhum fechamento registrado no banco de dados ainda.</p>
              </div>
            ) : (
              groupedList.map((folder) => {
                const isExpanded = !!expandedFolders[folder.key];
                return (
                  <div key={folder.key} className="bg-slate-50/50 rounded-2xl border border-slate-200/60 overflow-hidden shadow-xs transition-all">
                    {/* Folder Header */}
                    <button
                      onClick={() => toggleFolder(folder.key)}
                      className="w-full flex items-center justify-between p-4 bg-slate-100 hover:bg-slate-150 transition-colors border-b border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shadow-xs">
                          {isExpanded ? (
                            <FolderOpen className="w-5 h-5" />
                          ) : (
                            <Folder className="w-5 h-5" />
                          )}
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs font-black text-slate-800 tracking-wide font-sans flex items-center gap-1.5 uppercase">
                            📁 Pasta: {folder.label}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                            {folder.items.length} {folder.items.length === 1 ? 'Fechamento' : 'Fechamentos'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-450" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-450" />
                        )}
                      </div>
                    </button>

                    {/* Folder Documents (Expanded view) */}
                    {isExpanded && (
                      <div className="p-3.5 space-y-4 bg-white divide-y divide-slate-100 text-left">
                        {folder.items.map((item, idx) => {
                          const associatedOrders = getCloseoutOrders(item.orderIds);
                          return (
                            <div key={item.id} className="pt-4 first:pt-0 space-y-3.5">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest font-mono select-all">
                                    REF: {item.id.slice(-8).toUpperCase()}
                                  </span>
                                  <h5 className="text-xs font-black text-slate-800 flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    Hora: {new Date(item.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </h5>
                                </div>
                                <span className="text-xs font-black text-rose-650 font-sans">
                                  R$ {item.totalSales.toFixed(2)}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[10.5px] font-semibold text-slate-500">
                                <div className="flex items-center justify-between">
                                  <span>Pedidos:</span>
                                  <span className="font-bold text-slate-750">{item.ordersCount} un</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Responsável:</span>
                                  <span className="font-bold text-slate-750 truncate max-w-[85px]">
                                    {item.closedBy.split('@')[0]}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>PIX:</span>
                                  <span className="font-bold text-emerald-700">R$ {item.pixSales.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Cartão/Money:</span>
                                  <span className="font-bold text-slate-755">
                                    R$ {(item.cardSales + item.cashSales).toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {item.notes && (
                                <p className="text-[10px] text-slate-400 bg-slate-100 p-2.5 rounded-xl italic border border-slate-200/50">
                                  Obs: {item.notes}
                                </p>
                              )}

                              {/* Nested closed orders mini viewer inside the folder closeout block */}
                              {associatedOrders.length > 0 && (
                                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl space-y-1.5">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                                    📋 Itens contidos nesta pasta ({associatedOrders.length}):
                                  </span>
                                  <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                                    {associatedOrders.map((o) => (
                                      <div key={o.id} className="text-[10px] font-medium text-slate-600 flex justify-between gap-2 border-b border-dashed border-slate-200/50 py-1 last:border-0 hover:bg-slate-100/50 px-1 rounded-md">
                                        <span className="font-bold block truncate max-w-[120px] text-slate-750">{o.details.customerName}</span>
                                        <span className="text-slate-400 font-mono">#{o.id.slice(-4).toUpperCase()}</span>
                                        <span className="font-black text-rose-650 font-mono">R$ {o.total.toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <button
                                onClick={() => printCloseoutReceipt(item)}
                                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-705 font-black text-[9.5px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-500" />
                                Reimprimir Cupom
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
