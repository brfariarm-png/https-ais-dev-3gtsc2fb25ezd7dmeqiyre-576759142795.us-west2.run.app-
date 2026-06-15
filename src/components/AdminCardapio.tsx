import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  IceCream, 
  Image, 
  Check, 
  AlertTriangle, 
  Save, 
  RotateCcw, 
  Tag,
  Star,
  Sparkles,
  Sliders,
  X,
  PlusCircle,
  FolderOpen
} from 'lucide-react';
import { collection, addDoc, setDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { MenuItem } from '../types';

interface AdminCardapioProps {
  menuItems: MenuItem[];
  onRefreshMenu?: () => void;
}

export default function AdminCardapio({ menuItems, onRefreshMenu }: AdminCardapioProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Temporary Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [category, setCategory] = useState<MenuItem['category']>('acai');
  const [imageUrl, setImageUrl] = useState('');
  const [isPopular, setIsPopular] = useState(false);
  const [isCustomizable, setIsCustomizable] = useState(false);
  const [tagsString, setTagsString] = useState('');

  // Status/Messages
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Preset images for convenience
  const PRESET_IMAGES = [
    { label: 'Açaí Tradicional', url: '/assets/images/supreme_acai_cup_1781179584520.jpg' },
    { label: 'Milkshake Premium', url: '/assets/images/milkshake_supreme_1781189062620.jpg' },
    { label: 'Taça e Casquinha', url: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&q=80&w=600' },
    { label: 'Gelato de Frutas', url: 'https://images.unsplash.com/photo-1567206563066-ec1629859596?auto=format&fit=crop&q=80&w=600' },
  ];

  const handleOpenNew = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setPrice(15.00);
    setCategory('acai');
    setImageUrl(PRESET_IMAGES[0].url);
    setIsPopular(false);
    setIsCustomizable(true);
    setTagsString('Novidade, Customizável');
    setErrorMsg('');
    setSuccessMsg('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description);
    setPrice(item.price);
    setCategory(item.category);
    setImageUrl(item.image);
    setIsPopular(!!item.popular);
    setIsCustomizable(!!item.customizable);
    setTagsString(item.tags ? item.tags.join(', ') : '');
    setErrorMsg('');
    setSuccessMsg('');
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErrorMsg('O nome do produto é obrigatório.');
    if (price <= 0) return setErrorMsg('O preço deve ser maior que zero.');

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const tags = tagsString
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const parsedId = editingItem ? editingItem.id : 'item-' + Date.now();
    
    const payload: Omit<MenuItem, 'id'> & { index?: number } = {
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      category,
      image: imageUrl.trim() || PRESET_IMAGES[0].url,
      popular: isPopular,
      customizable: isCustomizable,
      tags: tags.length > 0 ? tags : undefined
    };

    // If a brand new item, we give it a trailing index order
    if (!editingItem) {
      payload.index = menuItems.length;
    } else {
      // Retain existing index if any
      const oldIndex = (editingItem as any).index;
      if (oldIndex !== undefined) {
        payload.index = oldIndex;
      }
    }

    try {
      const docRef = doc(db, 'menu_items', parsedId);
      await setDoc(docRef, payload);
      
      setSuccessMsg(`🏆 Produto "${name}" salvo com sucesso!`);
      setTimeout(() => {
        setIsFormOpen(false);
        setSuccessMsg('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao salvar o item no Firestore. Verifique suas permissões.');
      try {
        handleFirestoreError(err, OperationType.WRITE, `menu_items/${parsedId}`);
      } catch (innerErr) {}
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string, itemName: string) => {
    if (!window.confirm(`Tem certeza absoluta de que deseja excluir o produto "${itemName}"? Esta operação é irreversível.`)) {
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await deleteDoc(doc(db, 'menu_items', itemId));
      setSuccessMsg('🗑️ Produto removido com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Não foi possível remover o item.');
      try {
        handleFirestoreError(err, OperationType.DELETE, `menu_items/${itemId}`);
      } catch (innerErr) {}
    } finally {
      setLoading(false);
    }
  };

  // Re-order and save all items prioritised index in Firebase
  const handleResetToDefault = async () => {
    if (!window.confirm('Deseja reinicializar o cardápio inteiro para os valores padrão originais? Quaisquer novos itens adicionados serão sobrescritas.')) {
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { MENU_ITEMS } = await import('../data');
      const batch = writeBatch(db);
      
      // 1. Delete all currently displayed items first
      menuItems.forEach((item) => {
        const docRef = doc(db, 'menu_items', item.id);
        batch.delete(docRef);
      });

      // 2. Re-insert default items
      MENU_ITEMS.forEach((item, idx) => {
        const docRef = doc(db, 'menu_items', item.id);
        batch.set(docRef, {
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
      setSuccessMsg('✅ Cardápio redefinido com sucesso para os dados padrão!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to reset menu:', err);
      setErrorMsg('Falha ao restaurar dados padrões.');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 text-left space-y-6">
      
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-extrabold text-slate-850 flex items-center gap-2">
            🥣 Controle Flexível do Cardápio
          </h2>
          <p className="text-[11px] text-slate-450 uppercase font-black tracking-wide">
            Adicione, edite preços, detalhes e categorize os produtos reais em tempo de execução
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={handleResetToDefault}
            className="flex-1 sm:flex-none px-3.5 py-2 hover:bg-slate-200/60 rounded-xl text-slate-500 hover:text-slate-700 transition-colors font-extrabold font-mono text-[10px] uppercase border border-slate-200 cursor-pointer"
          >
            🔄 Restaurar Padrões
          </button>
          <button
            onClick={handleOpenNew}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[10px] uppercase tracking-wide rounded-xl shadow-md shadow-rose-100 hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Produto
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Total de Itens</p>
          <p className="text-xl font-black text-rose-650">{menuItems.length} itens</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Mais Populares ⭐</p>
          <p className="text-xl font-black text-amber-500">{menuItems.filter(i => i.popular).length} ativos</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Customizáveis 🎚️</p>
          <p className="text-xl font-black text-sky-600">{menuItems.filter(i => i.customizable).length} itens</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Média Geral de Preço</p>
          <p className="text-xl font-black text-emerald-650">
            R$ {(menuItems.reduce((acc, c) => acc + c.price, 0) / (menuItems.length || 1)).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs flex items-center gap-2 font-bold animate-[pulse_1s_infinite]">
          <Check className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-bold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Grid Filter Tools & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar produto no cardápio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-rose-400 rounded-xl text-xs font-bold text-slate-705 placeholder-slate-400 focus:outline-hidden transition-colors"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex bg-slate-200/50 p-1 rounded-xl overflow-x-auto gap-0.5 max-w-full">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'acai', label: 'Açaí' },
            { value: 'sorvete', label: 'Sorvete' },
            { value: 'milkshake', label: 'Milkshake' },
            { value: 'sundae', label: 'Sundae' },
            { value: 'combo', label: 'Combos' }
          ].map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all ${
                selectedCategory === cat.value
                  ? 'bg-white text-rose-600 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-805'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products list visual grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 ">
            <FolderOpen className="w-12 h-12 text-slate-300 stroke-[1.5] mb-2" />
            <p className="text-xs font-extrabold text-slate-450 uppercase tracking-widest">Nenhum produto correspondente</p>
            <p className="text-[10px] mt-1 text-slate-400">Insira um novo produto usando o botão "Adicionar Produto"</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div 
              key={item.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col relative group hover:border-rose-100 hover:shadow-md transition-all"
            >
              {/* Image & Price Tag */}
              <div className="h-32 bg-slate-100 relative overflow-hidden flex-shrink-0">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2.5 right-2.5 bg-rose-600 text-white px-2.5 py-1 text-[11px] font-black tracking-widest uppercase rounded-lg shadow-sm">
                  R$ {item.price.toFixed(2)}
                </div>

                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                  <span className="bg-slate-900/90 text-white px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide rounded-md">
                    {item.category === 'acai' ? '💜 Açaí' : 
                     item.category === 'sorvete' ? '🍧 Sorvete' :
                     item.category === 'milkshake' ? '🥤 Shake' : 
                     item.category === 'sundae' ? '🍒 Sundae' : '📦 Combo'}
                  </span>
                  {item.popular && (
                    <span className="bg-amber-500 text-white px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide rounded-md flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-current" /> Destaque
                    </span>
                  )}
                  {item.customizable && (
                    <span className="bg-sky-500 text-white px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide rounded-md">
                      🎚️ Customizável
                    </span>
                  )}
                </div>
              </div>

              {/* Info Block */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-800 text-xs tracking-tight line-clamp-1">{item.name}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
                </div>

                {/* Tags inside card item */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag, idx) => (
                      <span key={idx} className="bg-slate-50 text-slate-550 border border-slate-100 text-[8px] font-extrabold tracking-wide uppercase px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                        <Tag className="w-2 h-2" /> {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions Bar */}
                <div className="flex gap-2 pt-2 border-t border-slate-50 flex-shrink-0">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="flex-1 py-1.5 hover:bg-slate-100 border border-slate-150 rounded-lg text-slate-600 font-extrabold text-[9px] uppercase tracking-wide cursor-pointer transition-colors flex items-center justify-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    className="py-1.5 px-3 hover:bg-rose-50 border border-rose-100 rounded-lg text-rose-600 font-extrabold text-[9px] uppercase transition-colors cursor-pointer flex items-center justify-center"
                    title="Excluir produto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Modal for Adding/Editing Item */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-55 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
            />

            {/* Form modal body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl max-w-lg w-full flex flex-col overflow-hidden shadow-2xl border border-slate-100 relative z-50 font-sans"
            >
              {/* Header */}
              <div className="p-5 border-b border-rose-50 flex justify-between items-center bg-rose-50/20">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-500 rounded-xl text-white">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">
                      {editingItem ? '✏️ Editar Produto' : '➕ Novo Produto'}
                    </h3>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wide">
                      {editingItem ? 'Atualizar campos e preços reais' : 'Cadastrar novo item no cardápio online'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Scroll Body */}
              <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-left text-xs font-bold text-slate-600 max-h-[70vh]">
                
                {/* Product Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wide">Nome do Produto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Açaí Premium Mix de Frutas"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-705 placeholder-slate-400 focus:outline-hidden focus:border-rose-450 transition-colors"
                  />
                </div>

                {/* Price and Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wide">Preço (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.10"
                      placeholder="21.90"
                      value={price || ''}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-705 focus:outline-hidden focus:border-rose-450 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wide">Categoria</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as MenuItem['category'])}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-705 focus:outline-hidden focus:border-rose-450 transition-colors cursor-pointer"
                    >
                      <option value="acai">💜 Açaí</option>
                      <option value="sorvete">🍧 Sorvete</option>
                      <option value="milkshake">🥤 Milkshake</option>
                      <option value="sundae">🍒 Sundae</option>
                      <option value="combo">📦 Combo / Especial</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wide">Descrição Comercial</label>
                  <textarea
                    rows={2}
                    placeholder="Descreva os acompanhamentos de cortesia inclusos, sabores recomendados, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-705 placeholder-slate-400 focus:outline-hidden focus:border-rose-450 transition-colors resize-none"
                  />
                </div>

                {/* Image Selection & pasting */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wide">URL ou Predefinição da Imagem</label>
                  <input
                    type="text"
                    placeholder="Past item photo URL..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] text-slate-600 placeholder-slate-400 focus:outline-hidden focus:border-rose-450 transition-colors"
                  />
                  
                  {/* Preset Quick Images */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {PRESET_IMAGES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImageUrl(preset.url)}
                        className={`p-1.5 border rounded-xl overflow-hidden text-left hover:border-rose-350 cursor-pointer transition-all flex flex-col gap-1 ${
                          imageUrl === preset.url ? 'border-rose-500 bg-rose-50/25 ring-2 ring-rose-200' : 'border-slate-100 bg-slate-50'
                        }`}
                      >
                        <img src={preset.url} alt="" className="h-10 w-full object-cover rounded-md" referrerPolicy="no-referrer" />
                        <span className="text-[7.5px] font-black uppercase text-center block w-full text-slate-500 truncate">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options Switches (Popular, Customizable) & Tags */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={isPopular}
                      onChange={(e) => setIsPopular(e.target.checked)}
                      className="w-4 h-4 text-rose-500 border-slate-300 rounded-xs focus:ring-rose-400 cursor-pointer"
                    />
                    <div>
                      <span className="block text-[10px] font-bold text-slate-700">Destaque ⭐</span>
                      <span className="text-[8px] text-slate-400 block font-normal leading-tight">Aparece na seção 'Mais Vendido'.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={isCustomizable}
                      onChange={(e) => setIsCustomizable(e.target.checked)}
                      className="w-4 h-4 text-rose-500 border-slate-300 rounded-xs focus:ring-rose-400 cursor-pointer"
                    />
                    <div>
                      <span className="block text-[10px] font-bold text-slate-700">Customizável 🎚️</span>
                      <span className="text-[8px] text-slate-400 block font-normal leading-tight">Escolha de caldas/adicionais e tamanhos.</span>
                    </div>
                  </label>
                </div>

                {/* Custom Tags */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wide flex items-center justify-between">
                    <span>Tags Empreendedoras (Separadas por vírgula)</span>
                    <span className="text-[8.5px] text-slate-400 font-normal">Ex: Mais Vendido, Novidade, Gourmet</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Gourmet, Favorito, Saudável"
                    value={tagsString}
                    onChange={(e) => setTagsString(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-705 placeholder-slate-400 focus:outline-hidden focus:border-rose-450 transition-colors"
                  />
                </div>

              </form>

              {/* Action Buttons */}
              <div className="p-4 border-t border-slate-50 bg-slate-50/80 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer text-[10px] uppercase font-extrabold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-100 transition-all cursor-pointer text-[10px] uppercase font-extrabold flex items-center gap-1"
                >
                  {loading ? (
                    <span className="animate-pulse">Calculando...</span>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Salvar Produto
                    </>
                  )}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
