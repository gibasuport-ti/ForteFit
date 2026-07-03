/**
 * Types shared between Client and Server for ForteFit Suplementos
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  brand: string;
  rating: number;
  reviewsCount: number;
  stock: number;
  alertStockLevel: number;
  active: boolean;
  reviews?: Review[];
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer';
  address?: Address;
  savedAddresses?: Address[];
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  paymentMethod: 'pix' | 'credit_card' | 'mercado_pago';
  paymentDetails?: {
    qrCode?: string; // Base64 or string for PIX
    qrCodeCopyPaste?: string; // PIX string
    cardBrand?: string;
    lastFour?: string;
    mpPreferenceId?: string;
  };
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  couponCode?: string;
  createdAt: string;
  paymentDate?: string;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minPurchase: number;
  active: boolean;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  date: string;
}

export interface TicketReply {
  id: string;
  sender: 'user' | 'support';
  message: string;
  date: string;
}

export interface Ticket {
  id: string;
  userId: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'open' | 'replied' | 'closed';
  replies: TicketReply[];
  createdAt: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockCount: number;
  salesByCategory: { category: string; value: number }[];
  salesByDay: { date: string; value: number }[];
}
