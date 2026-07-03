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

// SIMULATION ENGINE FOR OFFLINE / GITHUB PAGES DEPLOYMENTS
interface SimDb {
  users: any[];
  products: any[];
  orders: any[];
  tickets: any[];
  stockMovements: any[];
}

let isSimMode = localStorage.getItem("fortefit_sim_mode") === "true";
let simDb: SimDb | null = null;

async function getSimDb(): Promise<SimDb> {
  if (simDb) return simDb;
  const saved = localStorage.getItem("fortefit_sim_db");
  if (saved) {
    simDb = JSON.parse(saved);
    return simDb!;
  }

  // Fetch db.json statically to seed the simulation database
  try {
    const res = await fetch("./db.json");
    if (res.ok) {
      const data = await res.json();
      simDb = {
        users: data.users || [],
        products: data.products || [],
        orders: data.orders || [],
        tickets: data.tickets || [],
        stockMovements: data.stockMovements || []
      };
      localStorage.setItem("fortefit_sim_db", JSON.stringify(simDb));
      return simDb;
    }
  } catch (err) {
    console.error("Falha ao carregar semente db.json para simulação:", err);
  }

  // Pure memory fallback if fetch fails
  simDb = { users: [], products: [], orders: [], tickets: [], stockMovements: [] };
  return simDb;
}

function saveSimDb() {
  if (simDb) {
    localStorage.setItem("fortefit_sim_db", JSON.stringify(simDb));
  }
}

async function simulatedRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const db = await getSimDb();
  const token = getAuthToken();
  const currentUser = token && token.startsWith("mock-token-") 
    ? db.users.find(u => u.id === token.replace("mock-token-", "")) 
    : null;

  // Normalize endpoint to extract pathname and query parameters
  const url = new URL(endpoint, "http://mock.api");
  const path = url.pathname;
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body as string) : null;

  const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

  // AUTH ENDPOINTS
  if (path === "/auth/login") {
    const user = db.users.find(u => u.email === body.email);
    if (!user) {
      throw new Error("E-mail ou senha incorretos.");
    }
    const mockToken = `mock-token-${user.id}`;
    return { token: mockToken, user };
  }

  if (path === "/auth/register") {
    if (db.users.some(u => u.email === body.email)) {
      throw new Error("E-mail já cadastrado.");
    }
    const newUser = {
      id: generateId("user"),
      name: body.name,
      email: body.email,
      role: body.email.includes("admin") || body.email === "gibasuporte@gmail.com" ? "admin" : "customer",
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    saveSimDb();
    const mockToken = `mock-token-${newUser.id}`;
    return { token: mockToken, user: newUser };
  }

  if (path === "/auth/me") {
    if (!currentUser) throw new Error("Não autorizado.");
    return currentUser;
  }

  if (path === "/auth/profile") {
    if (!currentUser) throw new Error("Não autorizado.");
    Object.assign(currentUser, body);
    saveSimDb();
    return currentUser;
  }

  // PRODUCTS ENDPOINTS
  if (path === "/products") {
    let list = [...db.products];
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    if (category && category !== "all") {
      list = list.filter(p => p.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return list;
  }

  if (path.startsWith("/products/") && path.endsWith("/reviews")) {
    const prodId = path.split("/")[2];
    const prod = db.products.find(p => p.id === prodId);
    if (!prod) throw new Error("Produto não encontrado.");
    const newReview = {
      id: generateId("rev"),
      userId: currentUser?.id || "anonymous",
      userName: currentUser?.name || "Cliente Anônimo",
      rating: body.rating,
      comment: body.comment,
      date: new Date().toISOString()
    };
    if (!prod.reviews) prod.reviews = [];
    prod.reviews.push(newReview);
    const totalRating = prod.reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
    prod.rating = parseFloat((totalRating / prod.reviews.length).toFixed(1));
    prod.reviewsCount = prod.reviews.length;
    saveSimDb();
    return prod;
  }

  if (path.startsWith("/products/")) {
    const prodId = path.split("/")[2];
    const prod = db.products.find(p => p.id === prodId);
    if (!prod) throw new Error("Produto não encontrado.");
    return prod;
  }

  // COUPONS ENDPOINTS
  if (path === "/coupons/apply") {
    const code = body.code.toUpperCase();
    if (code === "FORTE10") {
      return { code, discount: body.subtotal * 0.10 };
    }
    if (code === "MONSTER20") {
      return { code, discount: body.subtotal * 0.20 };
    }
    if (code === "PROBIOTICA15") {
      return { code, discount: body.subtotal * 0.15 };
    }
    throw new Error("Cupom inválido ou expirado.");
  }

  // ORDERS ENDPOINTS
  if (path === "/orders/create") {
    if (!currentUser) throw new Error("Por favor, faça login para finalizar o pedido.");
    const newOrder = {
      id: generateId("ord"),
      userId: currentUser.id,
      userName: currentUser.name,
      items: body.items.map((item: any) => {
        const prod = db.products.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          productName: prod?.name || "Produto",
          price: prod?.price || 0,
          imageUrl: prod?.imageUrl || "",
          quantity: item.quantity
        };
      }),
      paymentMethod: body.paymentMethod,
      shippingAddress: body.shippingAddress,
      shippingCost: body.shippingCost,
      status: "pending",
      subtotal: body.items.reduce((sum: number, item: any) => {
        const prod = db.products.find(p => p.id === item.productId);
        return sum + (prod?.price || 0) * item.quantity;
      }, 0),
      total: body.items.reduce((sum: number, item: any) => {
        const prod = db.products.find(p => p.id === item.productId);
        return sum + (prod?.price || 0) * item.quantity;
      }, 0) + body.shippingCost,
      createdAt: new Date().toISOString()
    };
    db.orders.push(newOrder);
    saveSimDb();
    return newOrder;
  }

  if (path === "/orders") {
    if (!currentUser) throw new Error("Não autorizado.");
    return db.orders.filter(o => o.userId === currentUser.id);
  }

  if (path.startsWith("/orders/") && path.endsWith("/pay")) {
    const ordId = path.split("/")[2];
    const order = db.orders.find(o => o.id === ordId);
    if (!order) throw new Error("Pedido não encontrado.");
    order.status = "paid";
    saveSimDb();
    return order;
  }

  if (path.startsWith("/orders/") && method === "DELETE") {
    const ordId = path.split("/")[2];
    db.orders = db.orders.filter(o => o.id !== ordId);
    saveSimDb();
    return { success: true };
  }

  // TICKETS ENDPOINTS
  if (path === "/tickets") {
    if (method === "POST") {
      if (!currentUser) throw new Error("Não autorizado.");
      const newTicket = {
        id: generateId("tkt"),
        userId: currentUser.id,
        userName: currentUser.name,
        subject: body.subject,
        message: body.message,
        status: "open",
        createdAt: new Date().toISOString(),
        replies: []
      };
      db.tickets.push(newTicket);
      saveSimDb();
      return newTicket;
    } else {
      if (!currentUser) throw new Error("Não autorizado.");
      return db.tickets.filter(t => t.userId === currentUser.id);
    }
  }

  if (path.startsWith("/tickets/") && path.endsWith("/replies")) {
    const ticketId = path.split("/")[2];
    const ticket = db.tickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error("Ticket não encontrado.");
    const newReply = {
      id: generateId("rep"),
      userId: currentUser?.id || "system",
      userName: currentUser?.name || "Suporte ForteFit",
      message: body.message,
      createdAt: new Date().toISOString()
    };
    if (!ticket.replies) ticket.replies = [];
    ticket.replies.push(newReply);
    ticket.status = currentUser?.role === "admin" ? "answered" : "open";
    saveSimDb();
    return ticket;
  }

  // CHATBOT FORTEAI
  if (path === "/support/gemini") {
    const msg = body.message.toLowerCase();
    let reply = "Olá! Sou o ForteAI, assistente virtual da ForteFit. Como posso ajudar na sua jornada fitness hoje?";
    if (msg.includes("whey") || msg.includes("proteina")) {
      reply = "O Whey Protein é excelente para reconstrução muscular! Na ForteFit temos marcas renomadas como Max Titanium e IntegralMedica. Recomendo o 100% Pure Whey da Max Titanium para excelente custo-benefício.";
    } else if (msg.includes("entrega") || msg.includes("prazo") || msg.includes("frete")) {
      reply = "Nossas entregas são feitas via Sedex e PAC para todo o Brasil. Você pode simular o prazo e o valor do frete diretamente no carrinho inserindo seu CEP!";
    } else if (msg.includes("creatina")) {
      reply = "A Creatina aumenta a força, resistência e explosão nos treinos. Recomendo tomar diariamente (3g a 5g), inclusive nos dias de descanso, para manter os estoques musculares saturados.";
    } else if (msg.includes("desconto") || msg.includes("cupom")) {
      reply = "Claro! Você pode usar o cupom **FORTE10** para ganhar 10% de desconto na sua primeira compra, ou **MONSTER20** para 20% em itens selecionados.";
    } else if (msg.includes("admin") || msg.includes("painel")) {
      reply = "Para acessar o painel de administração, faça login com o e-mail **gibasuporte@gmail.com**. Se precisar de auxílio com as permissões, entre em contato.";
    }
    return { response: reply };
  }

  // ADMIN ENDPOINTS
  if (path === "/admin/metrics") {
    if (currentUser?.role !== "admin") throw new Error("Acesso negado.");
    const totalSales = db.orders.filter(o => o.status === "paid" || o.status === "delivered").reduce((sum, o) => sum + o.total, 0);
    const pendingOrdersCount = db.orders.filter(o => o.status === "pending").length;
    const lowStockCount = db.products.filter(p => p.stock <= (p.alertStockLevel || 10)).length;
    const ticketsCount = db.tickets.filter(t => t.status === "open").length;
    return {
      totalSales,
      pendingOrdersCount,
      lowStockCount,
      ticketsCount,
      recentOrders: db.orders.slice(-5).reverse(),
      topProducts: db.products.slice(0, 3)
    };
  }

  if (path === "/admin/products") {
    if (currentUser?.role !== "admin") throw new Error("Acesso negado.");
    return db.products;
  }

  if (path.startsWith("/admin/products/") && method === "PUT") {
    if (currentUser?.role !== "admin") throw new Error("Acesso negado.");
    const prodId = path.split("/")[3];
    const prodIndex = db.products.findIndex(p => p.id === prodId);
    if (prodIndex === -1) throw new Error("Produto não encontrado.");
    db.products[prodIndex] = { ...db.products[prodIndex], ...body };
    saveSimDb();
    return db.products[prodIndex];
  }

  if (path.startsWith("/admin/products/") && method === "DELETE") {
    if (currentUser?.role !== "admin") throw new Error("Acesso negado.");
    const prodId = path.split("/")[3];
    db.products = db.products.filter(p => p.id !== prodId);
    saveSimDb();
    return { success: true };
  }

  if (path === "/admin/orders") {
    if (currentUser?.role !== "admin") throw new Error("Acesso negado.");
    return db.orders;
  }

  if (path.startsWith("/admin/orders/") && method === "PUT") {
    if (currentUser?.role !== "admin") throw new Error("Acesso negado.");
    const ordId = path.split("/")[3];
    const order = db.orders.find(o => o.id === ordId);
    if (!order) throw new Error("Pedido não encontrado.");
    order.status = body.status;
    saveSimDb();
    return order;
  }

  if (path === "/admin/stock/movements") {
    if (currentUser?.role !== "admin") throw new Error("Acesso negado.");
    if (method === "POST") {
      const prod = db.products.find(p => p.id === body.productId);
      if (!prod) throw new Error("Produto não encontrado.");
      if (body.type === "in") {
        prod.stock += body.quantity;
      } else {
        prod.stock = Math.max(0, prod.stock - body.quantity);
      }
      const movement = {
        id: generateId("stk"),
        productId: body.productId,
        productName: prod.name,
        type: body.type,
        quantity: body.quantity,
        reason: body.reason,
        createdAt: new Date().toISOString()
      };
      db.stockMovements.push(movement);
      saveSimDb();
      return movement;
    } else {
      return db.stockMovements;
    }
  }

  if (path === "/admin/customers") {
    if (currentUser?.role !== "admin") throw new Error("Acesso negado.");
    return db.users.filter(u => u.role === "customer");
  }

  if (path === "/admin/tickets") {
    if (currentUser?.role !== "admin") throw new Error("Acesso negado.");
    return db.tickets;
  }

  throw new Error(`Endpoint não simulado: ${method} ${path}`);
}

async function request(endpoint: string, options: RequestInit = {}): Promise<any> {
  if (isSimMode) {
    return simulatedRequest(endpoint, options);
  }

  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // If we get a 404 on backend routes, or any 5xx, we fallback to simulation in production / static deployment
      if (response.status === 404 || response.status >= 500) {
        console.warn(`Servidor retornou status ${response.status}. Ativando modo de simulação local.`);
        isSimMode = true;
        localStorage.setItem("fortefit_sim_mode", "true");
        return simulatedRequest(endpoint, options);
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Erro na comunicação com o servidor.");
    }

    return response.json();
  } catch (err: any) {
    // If fetch itself failed (network error, CORS, or offline backend), fallback to simulation
    console.warn("Erro ao conectar com a API real. Ativando simulação local.", err);
    isSimMode = true;
    localStorage.setItem("fortefit_sim_mode", "true");
    return simulatedRequest(endpoint, options);
  }
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
