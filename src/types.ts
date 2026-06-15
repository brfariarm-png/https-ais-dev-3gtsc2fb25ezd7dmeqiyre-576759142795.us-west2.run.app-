/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'acai' | 'sorvete' | 'milkshake' | 'sundae' | 'combo';
  image: string;
  tags?: string[];
  popular?: boolean;
  customizable?: boolean;
}

export interface ToppingOption {
  id: string;
  name: string;
  price: number; // 0 if free/included
  category: 'calda' | 'fruta' | 'crocante' | 'creme';
}

export interface FlavorOption {
  id: string;
  name: string;
  color: string; // Tailwind class background color or hex code
  secondaryColor?: string; // For nice gradient rendering
  category: 'acai' | 'sorvete';
  description: string;
}

export interface CustomCupConfig {
  size: '300ml' | '400ml' | '500ml' | '700ml';
  base: 'acai' | 'sorvete' | 'casadinho'; // casadinho = açaí + sorvete
  flavors: string[]; // flavor IDs
  toppings: string[]; // topping IDs
}

export interface CartItem {
  id: string; // unique item instance ID
  menuItem: MenuItem;
  quantity: number;
  isCustomCup?: boolean;
  customCupConfig?: CustomCupConfig;
  customCupPrice?: number;
  notes?: string;
}

export type OrderStatus = 'waiting' | 'preparing' | 'delivering' | 'completed';

export type PaymentType = 'pix' | 'card' | 'cash_on_delivery' | 'card_on_delivery';

export interface CheckoutDetails {
  customerName: string;
  customerPhone: string;
  deliveryType: 'delivery' | 'pickup';
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    reference?: string;
  };
  paymentType: PaymentType;
  cardDetails?: {
    number: string;
    name: string;
    expiry: string;
    cvv: string;
  };
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  details: CheckoutDetails;
  status: OrderStatus;
  timestamp: string;
  archived?: boolean;
}
