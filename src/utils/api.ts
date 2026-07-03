/**
 * Client API Client with JWT authorization handling for ForteFit Suplementos
 */

const API_BASE = "/api";

export function getAuthToken(): string | null {
  return localStorage.getItem("fortefit_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("fortefit_token", token);
}

export function removeAuthToken() {
  localStorage.removeItem("fortefit_token");
}

async function request(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro na comunicação com o servidor.");
  }

  return response.json();
}

export const api = {
  // Authentication
  login: (credentials: any) => request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  register: (data: any) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => request("/auth/me"),
  updateProfile: (profile: any) => request("/auth/profile", { method: "PUT", body: JSON.stringify(profile) }),

  // Products
  getProducts: (filters: { category?: string; search?: string; minPrice?: number; maxPrice?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append("category", filters.category);
    if (filters.search) params.append("search", filters.search);
    if (filters.minPrice) params.append("minPrice", String(filters.minPrice));
    if (filters.maxPrice) params.append("maxPrice", String(filters.maxPrice));
    return request(`/products?${params.toString()}`);
  },
  getProductDetails: (id: string) => request(`/products/${id}`),
  addProductReview: (id: string, review: { rating: number; comment: string }) => 
    request(`/products/${id}/reviews`, { method: "POST", body: JSON.stringify(review) }),

  // Coupons
  applyCoupon: (code: string, subtotal: number) => 
    request("/coupons/apply", { method: "POST", body: JSON.stringify({ code, subtotal }) }),

  // Orders / Checkout
  createOrder: (orderData: { 
    items: { productId: string; quantity: number }[]; 
    paymentMethod: string; 
    shippingAddress: any; 
    couponCode?: string; 
    shippingCost: number; 
    cardBrand?: string;
    lastFour?: string;
  }) => request("/orders/create", { method: "POST", body: JSON.stringify(orderData) }),
  getOrders: () => request("/orders"),
  payOrder: (id: string) => request(`/orders/${id}/pay`, { method: "POST" }),
  deleteOrder: (id: string) => request(`/orders/${id}`, { method: "DELETE" }),

  // Support tickets
  createTicket: (ticket: { subject: string; message: string }) => 
    request("/tickets", { method: "POST", body: JSON.stringify(ticket) }),
  getTickets: () => request("/tickets"),
  replyTicket: (id: string, message: string) => 
    request(`/tickets/${id}/replies`, { method: "POST", body: JSON.stringify({ message }) }),

  // Chatbot ForteAI
  askAI: (message: string, chatHistory: { sender: "user" | "bot"; text: string }[]) => 
    request("/support/gemini", { method: "POST", body: JSON.stringify({ message, chatHistory }) }),

  // Admin Module (Admin Only)
  getAdminMetrics: () => request("/admin/metrics"),
  getAdminProducts: () => request("/admin/products"),
  createAdminProduct: (product: any) => request("/admin/products", { method: "POST", body: JSON.stringify(product) }),
  updateAdminProduct: (id: string, product: any) => request(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(product) }),
  deleteAdminProduct: (id: string) => request(`/admin/products/${id}`, { method: "DELETE" }),
  getAdminOrders: () => request("/admin/orders"),
  updateAdminOrderStatus: (id: string, status: string) => 
    request(`/admin/orders/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
  getAdminStockMovements: () => request("/admin/stock/movements"),
  createAdminStockMovement: (data: { productId: string; type: "in" | "out"; quantity: number; reason: string }) => 
    request("/admin/stock/movements", { method: "POST", body: JSON.stringify(data) }),
  getAdminCustomers: () => request("/admin/customers"),
  getAdminTickets: () => request("/admin/tickets"),
};
