/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MenuItem, ToppingOption, FlavorOption } from './types';

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'acai-supreme',
    name: 'Copo Supreme 400ml',
    description: 'Açaí premium montado com generosa camada de Creme de Ninho, creme de Nutella original, morangos frescos fatiados, leite em pó Ninho e bombom Ouro Branco picado.',
    price: 24.90,
    category: 'acai',
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&q=80&w=600',
    tags: ['Mais Vendido', 'Recomendado'],
    popular: true
  },
  {
    id: 'acai-tradicional',
    name: 'Açaí Clássico 400ml',
    description: 'Açaí batido na hora, acompanhado de banana fresca fatiada, granola crocante de mel e castanhas, finalizado com fio de leite condensado.',
    price: 18.90,
    category: 'acai',
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&q=80&w=600',
    tags: ['Clássico']
  },
  {
    id: 'acai-sensacao',
    name: 'Açaí Sensação Baunilha',
    description: 'Deliciosa combinação de açaí intercalado com sorvete de baunilha cremoso, pedaços de morango fresco, gotas de chocolate meio amargo e calda de morango.',
    price: 22.90,
    category: 'acai',
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&q=80&w=600',
    tags: ['Novidade']
  },
  {
    id: 'gelato-supreme',
    name: 'Taça Gelato Premium',
    description: 'Três bolas de sorvete premium à sua escolha, servidas com cobertura quente de chocolate, chantilly artesanal, canudinhos wafer e raspas de chocolate belga.',
    price: 28.90,
    category: 'sorvete',
    image: 'https://images.unsplash.com/photo-1501443762594-e2ad0345304d?auto=format&fit=crop&q=80&w=600',
    popular: true
  },
  {
    id: 'cascao-duplo',
    name: 'Cascão Trufado Duplo',
    description: 'Cascão gigante crocante, com borda trufada de chocolate, duas bolas de sorvete artesanal (escolha seus sabores) e finalizado com confetes coloridos.',
    price: 16.50,
    category: 'sorvete',
    image: 'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'milkshake-nutella',
    name: 'Milkshake Supreme Nutella',
    description: 'Milkshake ultra cremoso de baunilha e chocolate belga batido com muita Nutella original, servido com taça decorada de chocolate e chantilly.',
    price: 23.90,
    category: 'milkshake',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&q=80&w=600',
    popular: true,
    tags: ['Favorito']
  },
  {
    id: 'milkshake-ovomaltine',
    name: 'Milkshake Ovomaltine Crocante',
    description: 'Sorvete de chocolate cremoso batido com calda de caramelo e abundante Ovomaltine crocante, finalizado com calda de chocolate belga nas laterais.',
    price: 21.90,
    category: 'milkshake',
    image: 'https://images.unsplash.com/photo-1534706936160-d5be044c1aff?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'sundae-sensacao',
    name: 'Grand Sundae Especial',
    description: 'Taça gigante com duas bolas de sorvete de baunilha, uma bola de sorvete de morango, bolo de chocolate picado, muita calda quente, farofa de amendoim e cereja.',
    price: 29.90,
    category: 'sundae',
    image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&q=80&w=600',
    tags: ['Especial do Chefe']
  },
  {
    id: 'banana-split',
    name: 'Banana Split Supreme',
    description: 'A clássica sobremesa: uma banana aberta ao meio servindo três bolas de sorvete (morango, baunilha e chocolate), caldas de caramelo, chocolate e morango, chantilly, canudos wafer e cerejas.',
    price: 32.90,
    category: 'sundae',
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&q=80&w=600'
  }
];

export const FLAVOR_OPTIONS: FlavorOption[] = [
  { id: 'acai-trad', name: 'Açaí Puro Orgânico', color: '#311042', secondaryColor: '#1d052a', category: 'acai', description: 'Açaí cremoso saborizado tradicional.' },
  { id: 'acai-banana', name: 'Açaí com Banana', color: '#45165c', secondaryColor: '#e3c234', category: 'acai', description: 'Açaí batido com polpa concentrada de banana.' },
  { id: 'sorv-choc', name: 'Chocolate Belga', color: '#3d251d', secondaryColor: '#1c0f0a', category: 'sorvete', description: 'Chocolate amargo cremoso com pedaços.' },
  { id: 'sorv-ninho', name: 'Ninho Trufado', color: '#fbf7e6', secondaryColor: '#cfb159', category: 'sorvete', description: 'Sorvete cremoso de leite em pó com fios de trufa branca.' },
  { id: 'sorv-morango', name: 'Morango Silvestre', color: '#e03a55', secondaryColor: '#961126', category: 'sorvete', description: 'Sorvete refrescante feito com pedaços de morango.' },
  { id: 'sorv-pistache', name: 'Pistache Italiano', color: '#a2b97c', secondaryColor: '#607a3c', category: 'sorvete', description: 'Sabor clássico e encorpado com pistaches importados.' },
  { id: 'sorv-creme', name: 'Creme Baunilha', color: '#fffbdf', secondaryColor: '#eae1ad', category: 'sorvete', description: 'Clássico de baunilha super aromático.' },
  { id: 'sorv-maracuja', name: 'Mousse de Maracujá', color: '#ebd047', secondaryColor: '#a18814', category: 'sorvete', description: 'Sabor tropical agradavelmente azedo e cremoso.' },
  { id: 'sorv-blue', name: 'Blue Ice (Chiclete)', color: '#47c2eb', secondaryColor: '#1e7ea0', category: 'sorvete', description: 'O preferido das crianças com sabor tutti-frutti.' }
];

export const TOPPING_OPTIONS: ToppingOption[] = [
  { id: 'nutella', name: 'Nutella Original', price: 5.00, category: 'creme' },
  { id: 'creme-ninho', name: 'Leite Ninho Cremoso', price: 4.50, category: 'creme' },
  { id: 'morango', name: 'Morango Picado Fresco', price: 4.00, category: 'fruta' },
  { id: 'banana', name: 'Banana Fatiada', price: 2.00, category: 'fruta' },
  { id: 'uva', name: 'Uva Sem Semente', price: 3.50, category: 'fruta' },
  { id: 'leite-po', name: 'Leite Ninho em Pó', price: 3.00, category: 'crocante' },
  { id: 'granola', name: 'Granola de Castanha', price: 2.00, category: 'crocante' },
  { id: 'ovomaltine', name: 'Ovomaltine', price: 3.00, category: 'crocante' },
  { id: 'confete', name: 'Confeitos de M&M', price: 2.50, category: 'crocante' },
  { id: 'chocoball', name: 'Chocoball', price: 2.00, category: 'crocante' },
  { id: 'bis', name: 'Bis Lacta Picado', price: 3.00, category: 'crocante' },
  { id: 'calda-choco', name: 'Calda de Chocolate', price: 1.50, category: 'calda' },
  { id: 'calda-morango', name: 'Calda de Morango', price: 1.50, category: 'calda' },
  { id: 'calda-caramelo', name: 'Calda de Caramelo', price: 1.50, category: 'calda' },
  { id: 'leite-cond', name: 'Calda de Leite Condensado', price: 2.00, category: 'calda' },
  { id: 'peanuts', name: 'Amendoim Triturado', price: 2.00, category: 'crocante' },
  { id: 'chantilly', name: 'Nuvem de Chantilly', price: 3.50, category: 'creme' }
];

// Helper to calculate total for a custom cup base size
export const getCustomCupBasePrice = (size: '300ml' | '500ml' | '700ml'): number => {
  switch (size) {
    case '300ml': return 16.90;
    case '500ml': return 21.90;
    case '700ml': return 26.90;
    default: return 16.90;
  }
};
