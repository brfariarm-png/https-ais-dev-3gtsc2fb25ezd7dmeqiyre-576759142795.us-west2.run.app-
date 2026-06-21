/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MenuItem, ToppingOption, FlavorOption } from './types';

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'acai-supreme',
    name: 'Açaí Gourmet Supreme',
    description: 'Escolha o tamanho da sua vontade, temos 4 tamanhos e em todos com cortesia leite condensado, leite em po, banana, morango e granola. O melhor acai preparado com ingredientes selecionados e de boa qualidade.',
    price: 21.00,
    category: 'acai',
    image: '/assets/images/supreme_acai_cup_1781179584520.jpg',
    tags: ['Mais Vendido', 'Recomendado', 'Customizável'],
    popular: true,
    customizable: true
  },
  {
    id: 'milkshake-gourmet-supreme',
    name: 'Milkshake Gourmet Supreme',
    description: 'Milkshake irresistivelmente cremoso. Escolha 1 sabor de sorvete, se preferir selecione seu adicional favorito para deixar seu milkshake ainda mais saboroso',
    price: 20.90,
    category: 'milkshake',
    image: '/assets/images/milkshake_supreme_1781189062620.jpg',
    tags: ['Gourmet', 'Novidade', 'Customizável'],
    customizable: true
  },
  {
    id: 'acai-sensacao',
    name: 'Linha Brownie',
    description: 'Deliciosa combinação da nossa Linha Brownie! Açaí intercalado com sorvete de baunilha cremoso, pedaços de brownie artesanal, pedaços de morango fresco, gotas de chocolate e calda de morango.',
    price: 22.90,
    category: 'acai',
    image: '/assets/images/supreme_acai_cup_1781179584520.jpg',
    tags: ['Linha Brownie', 'Novidade', 'Customizável'],
    customizable: true
  },
  {
    id: 'gelato-supreme',
    name: 'Taça Sorvete Premium',
    description: 'Três bolas de sorvete premium à sua escolha, servidas com cobertura quente de chocolate, chantilly artesanal, canudinhos wafer e raspas de chocolate belga.',
    price: 28.90,
    category: 'sorvete',
    image: '/assets/images/supreme_acai_cup_1781179584520.jpg',
    popular: true
  },
  {
    id: 'cascao-duplo',
    name: 'Cascão Trufado Duplo',
    description: 'Cascão gigante crocante, com borda trufada de chocolate, duas bolas de sorvete artesanal (escolha seus sabores) e finalizado com confetes coloridos.',
    price: 16.50,
    category: 'sorvete',
    image: '/assets/images/supreme_acai_cup_1781179584520.jpg'
  },
  {
    id: 'milkshake-nutella',
    name: 'Milkshake Supreme Nutella',
    description: 'Milkshake ultra cremoso de baunilha e chocolate belga batido com muita Nutella original, servido com taça decorada de chocolate e chantilly.',
    price: 23.90,
    category: 'milkshake',
    image: '/assets/images/supreme_acai_cup_1781179584520.jpg',
    popular: true,
    tags: ['Favorito']
  },
  {
    id: 'milkshake-ovomaltine',
    name: 'Milkshake Ovomaltine Crocante',
    description: 'Sorvete de chocolate cremoso batido com calda de caramelo e abundante Ovomaltine crocante, finalizado com calda de chocolate belga nas laterais.',
    price: 21.90,
    category: 'milkshake',
    image: '/assets/images/supreme_acai_cup_1781179584520.jpg'
  },
  {
    id: 'sundae-sensacao',
    name: 'Grand Sundae Especial',
    description: 'Taça gigante com duas bolas de sorvete de baunilha, uma bola de sorvete de morango, bolo de chocolate picado, muita calda quente, farofa de amendoim e cereja.',
    price: 29.90,
    category: 'sundae',
    image: '/assets/images/supreme_acai_cup_1781179584520.jpg',
    tags: ['Especial do Chefe']
  },
  {
    id: 'banana-split',
    name: 'Banana Split Supreme',
    description: 'A clássica sobremesa: uma banana aberta ao meio servindo three bolas de sorvete (morango, baunilha e chocolate), caldas de caramelo, chocolate e morango, chantilly, canudos wafer e cerejas.',
    price: 32.90,
    category: 'sundae',
    image: '/assets/images/supreme_acai_cup_1781179584520.jpg'
  }
];

export const FLAVOR_OPTIONS: FlavorOption[] = [
  { id: 'acai-puro-organico', name: 'Açaí Puro Orgânico', color: '#311042', secondaryColor: '#1d052a', category: 'acai', description: 'Delicioso açaí natural e orgânico, rico em antioxidantes.' },
  { id: 'cupuacu', name: 'Cupuaçu', color: '#fbf8eb', secondaryColor: '#ebd7a0', category: 'acai', description: 'Creme de cupuaçu silvestre super cremoso e azedinho.' },
  { id: 'chocolate', name: 'Chocolate', color: '#3d251d', secondaryColor: '#1c0f0a', category: 'sorvete', description: 'Chocolate cremoso e irresistível.' },
  { id: 'ninho-trufado', name: 'Ninho Trufado', color: '#fbf7e6', secondaryColor: '#cfb159', category: 'sorvete', description: 'Sorvete cremoso de leite em pó com fios de trufa branca.' },
  { id: 'iogurte-frutas-vermelhas', name: 'Iogurte com Frutas Vermelhas', color: '#ffedf0', secondaryColor: '#bd3c51', category: 'sorvete', description: 'Iogurte leve e refrescante com mesclas de blueberry, amora e morango.' },
  { id: 'baunilha', name: 'Baunilha', color: '#fffbdf', secondaryColor: '#eae1ad', category: 'sorvete', description: 'Clássico de baunilha super aromático e cremoso.' },
  { id: 'morango', name: 'Morango', color: '#e03a55', secondaryColor: '#961126', category: 'sorvete', description: 'Sorvete refrescante feito com polpa e pedaços de morango.' },
  { id: 'morango-nutella', name: 'Morango com Nutella', color: '#bf1f3f', secondaryColor: '#451a02', category: 'sorvete', description: 'O match perfeito de morango fresco com creme de avelã Nutella.' },
  { id: 'banana-nutella', name: 'Banana com Nutella', color: '#faecc0', secondaryColor: '#451a02', category: 'sorvete', description: 'A deliciosa e consagrada combinação de banana suave com creme de avelã.' },
  { id: 'maracuja', name: 'Maracujá', color: '#ebd047', secondaryColor: '#a18814', category: 'sorvete', description: 'Sabor tropical agradavelmente azedo e cremoso como mousse.' },
  { id: 'maracuja-trufado', name: 'Maracujá Trufado', color: '#f2dc5d', secondaryColor: '#5e4f0c', category: 'sorvete', description: 'Creme de maracujá silvestre com mesclas de chocolate trufado.' }
];

export const TOPPING_OPTIONS: ToppingOption[] = [
  // Cortesias Inclusas (Grátis!)
  { id: 'gratis-leite-cond', name: 'Leite Condensado (Cortesia)', price: 0.00, category: 'calda' },
  { id: 'gratis-leite-po', name: 'Leite em Pó (Cortesia)', price: 0.00, category: 'crocante' },
  { id: 'gratis-banana', name: 'Banana Fatiada (Cortesia)', price: 0.00, category: 'fruta' },
  { id: 'gratis-morango', name: 'Morango Picado (Cortesia)', price: 0.00, category: 'fruta' },
  { id: 'gratis-granola', name: 'Granola Crocante (Cortesia)', price: 0.00, category: 'crocante' },

  // Adicionais Extra (Pados)
  { id: 'calda-morango-gratis', name: 'Calda de Morango', price: 0.00, category: 'calda' },
  { id: 'calda-caramelo-gratis', name: 'Calda de Caramelo', price: 0.00, category: 'calda' },
  { id: 'calda-frutas-vermelhas-gratis', name: 'Calda de Frutas Vermelhas', price: 0.00, category: 'calda' },
  { id: 'nutella', name: 'Nutella', price: 7.00, category: 'creme' },
  { id: 'copo-trufado-nutella', name: 'Copo Trufado com Nutella', price: 8.00, category: 'creme' },
  { id: 'calda-choco-leite', name: 'Calda Chocolate ao Leite', price: 7.00, category: 'calda' },
  { id: 'brownie', name: 'Brownie', price: 10.00, category: 'crocante' },
  { id: 'chantilly', name: 'Chantilly', price: 6.00, category: 'creme' },
  { id: 'ovomaltine', name: 'Ovomaltine', price: 4.00, category: 'crocante' },
  { id: 'amendoim-moido', name: 'Amendoim Moído', price: 4.00, category: 'crocante' },
  { id: 'pacoca', name: 'Paçoca', price: 4.00, category: 'crocante' },
  { id: 'cereja', name: 'Cereja em Calda', price: 7.00, category: 'crocante' },
  { id: 'dobro-morango', name: 'Dobro de Morango', price: 6.00, category: 'fruta' },
  { id: 'dobro-banana', name: 'Dobro de Banana', price: 4.00, category: 'fruta' },
  { id: 'canudo-waffle', name: 'Canudo de Waffle', price: 4.00, category: 'crocante' },
  { id: 'disquete', name: 'Disquete', price: 4.00, category: 'crocante' }
];

// Helper to calculate total for a custom cup base size
export const getCustomCupBasePrice = (size: '300ml' | '400ml' | '500ml' | '700ml'): number => {
  switch (size) {
    case '300ml': return 15.00;
    case '400ml': return 18.00;
    case '500ml': return 21.00;
    case '700ml': return 25.00;
    default: return 15.00;
  }
};

export const STORE_CONFIG = {
  name: "Sorveteria Gourmet Supreme",
  shortName: "SUPREME Gourmet",
  city: "Monte Mor",
  address: "Rua Chequer Assis, 195 - ao lado do extra supermercado - Monte Mor/SP",
  phone: "(19) 97411-8672",
  email: "contato@sorveteriasupreme.com.br",
  instagram: "@sorveteria.supreme",
  customDomain: "sorveteriasupreme.vercel.app"
};
