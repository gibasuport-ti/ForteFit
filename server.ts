import express from "express";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { Product, User, Order, Coupon, StockMovement, Ticket, Review, DashboardMetrics } from "./src/types";

// Database File Path
const DB_FILE = path.join(process.cwd(), "db.json");
const JWT_SECRET = process.env.JWT_SECRET || "fortefit_super_secret_jwt_key_2026";
const PORT = 3000;

// Gemini AI Lazy Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      try {
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
        console.log("Gemini Client successfully initialized.");
      } catch (err) {
        console.error("Failed to initialize Gemini Client:", err);
      }
    }
  }
  return aiClient;
}

// Ensure database file exists with initial seeded data
function initializeDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      JSON.parse(content);
      return;
    } catch (e) {
      console.error("Corrupted database file. Re-creating db.json.");
    }
  }

  // Pre-hashed password for initial users. Password: "password123"
  const defaultPasswordHash = bcrypt.hashSync("password123", 10);
  // Admin password: "gilgilgil"
  const adminPasswordHash = bcrypt.hashSync("gilgilgil", 10);

  const initialProducts: Product[] = [
    {
      id: "prod-1",
      name: "100% Pure Whey Protein (900g) - Max Titanium",
      description: "Suplemento proteico composto por proteína concentrada do soro do leite (WPC), oferecendo 21g de proteína por porção de altíssimo valor biológico, rico em BCAAs e ideal para o ganho de massa muscular magra.",
      price: 149.90,
      imageUrl: "https://images.unsplash.com/photo-1579758629938-03607ccdbaba?q=80&w=600&auto=format&fit=crop",
      category: "Proteínas",
      brand: "Max Titanium",
      rating: 4.8,
      reviewsCount: 3,
      stock: 45,
      alertStockLevel: 10,
      active: true,
      reviews: [
        { id: "rev-1", userId: "user-2", userName: "Lucas Silva", rating: 5, comment: "Excelente custo benefício, o sabor morango é muito bom e dissolve super fácil!", date: "2026-06-25T14:30:00Z" },
        { id: "rev-2", userId: "user-3", userName: "Fernanda Costa", rating: 4, comment: "Muito bom, mas achei um pouco doce demais. Resultados excelentes.", date: "2026-06-28T09:15:00Z" },
        { id: "rev-3", userId: "user-4", userName: "Ricardo Souza", rating: 5, comment: "Melhor whey nacional. Entrega rápida da ForteFit!", date: "2026-06-29T18:40:00Z" }
      ]
    },
    {
      id: "prod-2",
      name: "Creatina Creapure (300g) - Growth Supplements",
      description: "A creatina monohidratada Creapure é considerada a mais pura e de melhor qualidade do mundo. Auxilia no aumento do desempenho físico durante exercícios repetidos de curta duração e alta intensidade.",
      price: 99.90,
      imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop",
      category: "Aminoácidos",
      brand: "Growth Supplements",
      rating: 4.9,
      reviewsCount: 2,
      stock: 8, // Low Stock Alert Triggered! (Alert limit 10)
      alertStockLevel: 10,
      active: true,
      reviews: [
        { id: "rev-4", userId: "user-2", userName: "Lucas Silva", rating: 5, comment: "Pura, dissolve muito bem. Sinto o aumento de força no treino de perna em poucas semanas.", date: "2026-06-20T10:00:00Z" },
        { id: "rev-5", userId: "user-5", userName: "Beatriz Oliveira", rating: 5, comment: "Perfeita! Selo Creapure legítimo. Recomendo muito.", date: "2026-06-27T16:22:00Z" }
      ]
    },
    {
      id: "prod-3",
      name: "C4 Beta Pump Pré-Treino (225g) - New Millen",
      description: "Pré-treino altamente concentrado com cafeína, taurina, beta-alanina, arginina e vitaminas do complexo B. Proporciona energia explosiva, foco mental apurado, vasodilatação e retardo da fadiga muscular.",
      price: 119.90,
      imageUrl: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?q=80&w=600&auto=format&fit=crop",
      category: "Pré-Treino",
      brand: "New Millen",
      rating: 4.5,
      reviewsCount: 1,
      stock: 22,
      alertStockLevel: 5,
      active: true,
      reviews: [
        { id: "rev-6", userId: "user-3", userName: "Fernanda Costa", rating: 4, comment: "Dá uma coceira forte da beta-alanina, mas o pump e o foco no treino são insanos!", date: "2026-06-22T19:30:00Z" }
      ]
    },
    {
      id: "prod-4",
      name: "BCAA 2400 (100 Cápsulas) - IntegralMedica",
      description: "Aminoácidos de Cadeia Ramificada (L-Leucina, L-Isoleucina e L-Valina) essenciais para o corpo. Favorecem a síntese de proteínas nas células musculares, auxiliando na recuperação pós-treino e prevenindo o catabolismo.",
      price: 59.90,
      imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=600&auto=format&fit=crop",
      category: "Aminoácidos",
      brand: "IntegralMedica",
      rating: 4.6,
      reviewsCount: 1,
      stock: 15,
      alertStockLevel: 5,
      active: true,
      reviews: [
        { id: "rev-7", userId: "user-4", userName: "Ricardo Souza", rating: 5, comment: "Fácil de engolir, ajuda bastante na dor muscular pós-treino pesado.", date: "2026-06-18T12:00:00Z" }
      ]
    },
    {
      id: "prod-5",
      name: "Multivitamínico CentroVits (90 tabletes) - ForteFit",
      description: "Fórmula de alta potência com 23 vitaminas e minerais essenciais. Fortalece o sistema imunológico, melhora a saúde celular, combate os radicais livres e otimiza a conversão de alimentos em energia útil.",
      price: 49.90,
      imageUrl: "https://images.unsplash.com/photo-1616671276441-2f2c277b8bf4?q=80&w=600&auto=format&fit=crop",
      category: "Vitaminas",
      brand: "ForteFit",
      rating: 4.7,
      reviewsCount: 2,
      stock: 60,
      alertStockLevel: 8,
      active: true,
      reviews: [
        { id: "rev-8", userId: "user-5", userName: "Beatriz Oliveira", rating: 4, comment: "Excelente para imunidade. Desde que comecei a tomar, não tive mais resfriados.", date: "2026-06-24T08:00:00Z" },
        { id: "rev-9", userId: "user-2", userName: "Lucas Silva", rating: 5, comment: "Completo e barato. Melhor do mercado nacional de vitaminas.", date: "2026-06-28T11:10:00Z" }
      ]
    },
    {
      id: "prod-6",
      name: "Hipercalórico Sinister Mass (3kg) - IntegralMedica",
      description: "Suplemento para ganho de peso e massa muscular de alta densidade calórica. Fornece proteínas de rápida e lenta absorção, carboidratos complexos de liberação gradual e creatina integrada para força física extra.",
      price: 129.90,
      imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600&auto=format&fit=crop",
      category: "Proteínas",
      brand: "IntegralMedica",
      rating: 4.3,
      reviewsCount: 1,
      stock: 3, // Low Stock Alert!
      alertStockLevel: 5,
      active: true,
      reviews: [
        { id: "rev-10", userId: "user-4", userName: "Ricardo Souza", rating: 4, comment: "Dá muito resultado pra quem é magro de ruim. O sabor chocolate é bom.", date: "2026-06-15T15:30:00Z" }
      ]
    },
    {
      id: "prod-7",
      name: "Termogênico Lipo-6 Black Ultra (60 caps) - Nutrex",
      description: "Queimador de gordura ultra concentrado de dose única. Estimula a queima calórica ao elevar a temperatura corporal, acelera o metabolismo basal, controla o apetite e fornece foco mental limpo de longa duração.",
      price: 189.90,
      imageUrl: "https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?q=80&w=600&auto=format&fit=crop",
      category: "Termogênicos",
      brand: "Nutrex",
      rating: 4.7,
      reviewsCount: 1,
      stock: 12,
      alertStockLevel: 5,
      active: true,
      reviews: [
        { id: "rev-11", userId: "user-5", userName: "Beatriz Oliveira", rating: 5, comment: "Melhor termogênico que já usei, dá muita energia pro aeróbico em jejum e seca de verdade.", date: "2026-06-29T07:15:00Z" }
      ]
    },
    {
      id: "prod-8",
      name: "ISO Triple Zero Whey Isolate (900g) - IntegralMedica",
      description: "Proteína isolada do soro do leite pura, ultra filtrada, com zero carboidratos, zero gorduras e zero lactose. Ideal para dietas restritivas de emagrecimento e definição, entregando 26g de proteína pura por dose.",
      price: 239.90,
      imageUrl: "https://images.unsplash.com/photo-1579758629938-03607ccdbaba?q=80&w=600&auto=format&fit=crop",
      category: "Proteínas",
      brand: "IntegralMedica",
      rating: 4.8,
      reviewsCount: 1,
      stock: 18,
      alertStockLevel: 5,
      active: true,
      reviews: [
        { id: "rev-12", userId: "user-2", userName: "Lucas Silva", rating: 5, comment: "Excelente para quem tem intolerância extrema. Qualidade espetacular.", date: "2026-06-26T16:50:00Z" }
      ]
    }
  ];

  const initialUsers: User[] = [
    {
      id: "user-1",
      name: "Administrador ForteFit",
      email: "gibasuporte@gmail.com",
      role: "admin",
      createdAt: "2026-01-01T00:00:00Z"
    },
    {
      id: "user-2",
      name: "Lucas Silva",
      email: "lucas@email.com",
      role: "customer",
      address: {
        street: "Av. Paulista",
        number: "1000",
        complement: "Apto 52",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        zipCode: "01310-100"
      },
      savedAddresses: [
        {
          street: "Av. Paulista",
          number: "1000",
          complement: "Apto 52",
          neighborhood: "Bela Vista",
          city: "São Paulo",
          state: "SP",
          zipCode: "01310-100"
        }
      ],
      createdAt: "2026-05-10T11:20:00Z"
    },
    {
      id: "user-3",
      name: "Fernanda Costa",
      email: "fernanda@email.com",
      role: "customer",
      address: {
        street: "Rua das Laranjeiras",
        number: "450",
        neighborhood: "Laranjeiras",
        city: "Rio de Janeiro",
        state: "RJ",
        zipCode: "22240-003"
      },
      createdAt: "2026-06-01T14:45:00Z"
    }
  ];

  const initialCoupons: Coupon[] = [
    { code: "FORTE10", discountType: "percentage", value: 10, minPurchase: 0, active: true },
    { code: "WHEYPROMO", discountType: "fixed", value: 20, minPurchase: 150, active: true },
    { code: "FRETEGRATIS", discountType: "percentage", value: 0, minPurchase: 199, active: true } // Handled in shipping calc
  ];

  const initialOrders: Order[] = [
    {
      id: "PED-98214",
      userId: "user-2",
      userName: "Lucas Silva",
      items: [
        { productId: "prod-1", name: "100% Pure Whey Protein (900g) - Max Titanium", price: 149.90, quantity: 1, imageUrl: "https://images.unsplash.com/photo-1579758629938-03607ccdbaba?q=80&w=600&auto=format&fit=crop" },
        { productId: "prod-2", name: "Creatina Creapure (300g) - Growth Supplements", price: 99.90, quantity: 1, imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop" }
      ],
      subtotal: 249.80,
      shippingCost: 15.00,
      discountAmount: 24.98, // Used FORTE10
      total: 239.82,
      paymentMethod: "pix",
      paymentDetails: {
        qrCodeCopyPaste: "00020101021226750014br.gov.bcb.pix2553pix.fortefit.com.br/pagamento/PED982145204000053039865406239.825802BR5918ForteFitSuplemento6009Sao Paulo62070503PED"
      },
      status: "paid",
      shippingAddress: {
        street: "Av. Paulista",
        number: "1000",
        complement: "Apto 52",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        zipCode: "01310-100"
      },
      couponCode: "FORTE10",
      createdAt: "2026-06-25T14:15:00Z",
      paymentDate: "2026-06-25T14:18:00Z"
    },
    {
      id: "PED-54211",
      userId: "user-3",
      userName: "Fernanda Costa",
      items: [
        { productId: "prod-3", name: "C4 Beta Pump Pré-Treino (225g) - New Millen", price: 119.90, quantity: 1, imageUrl: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?q=80&w=600&auto=format&fit=crop" }
      ],
      subtotal: 119.90,
      shippingCost: 18.00,
      discountAmount: 0,
      total: 137.90,
      paymentMethod: "credit_card",
      paymentDetails: {
        cardBrand: "Visa",
        lastFour: "4829"
      },
      status: "shipped",
      shippingAddress: {
        street: "Rua das Laranjeiras",
        number: "450",
        neighborhood: "Laranjeiras",
        city: "Rio de Janeiro",
        state: "RJ",
        zipCode: "22240-003"
      },
      createdAt: "2026-06-22T19:10:00Z"
    }
  ];

  const initialStockMovements: StockMovement[] = [
    { id: "mov-1", productId: "prod-1", productName: "100% Pure Whey Protein (900g) - Max Titanium", type: "in", quantity: 50, reason: "Estoque Inicial", date: "2026-06-01T08:00:00Z" },
    { id: "mov-2", productId: "prod-2", productName: "Creatina Creapure (300g) - Growth Supplements", type: "in", quantity: 10, reason: "Estoque Inicial", date: "2026-06-01T08:00:00Z" },
    { id: "mov-3", productId: "prod-1", productName: "100% Pure Whey Protein (900g) - Max Titanium", type: "out", quantity: 1, reason: "Venda - Pedido PED-98214", date: "2026-06-25T14:15:00Z" },
    { id: "mov-4", productId: "prod-2", productName: "Creatina Creapure (300g) - Growth Supplements", type: "out", quantity: 1, reason: "Venda - Pedido PED-98214", date: "2026-06-25T14:15:00Z" },
    { id: "mov-5", productId: "prod-1", productName: "100% Pure Whey Protein (900g) - Max Titanium", type: "out", quantity: 4, reason: "Ajuste de Estoque - Danificado no transporte", date: "2026-06-26T10:00:00Z" }
  ];

  const initialTickets: Ticket[] = [
    {
      id: "tk-8821",
      userId: "user-2",
      name: "Lucas Silva",
      email: "lucas@email.com",
      subject: "Dúvida sobre entrega no sábado",
      message: "Olá, fiz um pedido ontem e gostaria de saber se a ForteFit realiza entregas aos sábados na região da Bela Vista, em São Paulo.",
      status: "replied",
      replies: [
        { id: "rep-1", sender: "support", message: "Olá Lucas! Sim, para a região central de São Paulo (incluindo Bela Vista), realizamos entregas aos sábados para pedidos com pagamento aprovado até sexta-feira às 12h. Qualquer outra dúvida, conte conosco!", date: "2026-06-26T09:30:00Z" }
      ],
      createdAt: "2026-06-25T20:10:00Z"
    }
  ];

  const dbData = {
    users: initialUsers,
    authPasswords: {
      "user-1": adminPasswordHash, // gibasuporte@gmail.com (senha: gilgilgil)
      "user-2": defaultPasswordHash, // lucas@email.com
      "user-3": defaultPasswordHash  // fernanda@email.com
    },
    products: initialProducts,
    coupons: initialCoupons,
    orders: initialOrders,
    stockMovements: initialStockMovements,
    tickets: initialTickets
  };

  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), "utf-8");
  console.log("Persistent Database Initialized at:", DB_FILE);
}

initializeDatabase();

// Migration/correction to ensure the admin details are updated in existing db.json
try {
  if (fs.existsSync(DB_FILE)) {
    const db = readDB();
    let changed = false;
    
    // Update user-1 in users list if it is not gibasuporte@gmail.com
    const adminIndex = db.users.findIndex((u: any) => u.id === "user-1");
    if (adminIndex !== -1) {
      if (db.users[adminIndex].email !== "gibasuporte@gmail.com") {
        db.users[adminIndex].email = "gibasuporte@gmail.com";
        changed = true;
      }
    } else {
      db.users.push({
        id: "user-1",
        name: "Administrador ForteFit",
        email: "gibasuporte@gmail.com",
        role: "admin",
        createdAt: "2026-01-01T00:00:00Z"
      });
      changed = true;
    }

    // Always enforce the requested password 'gilgilgil' for the admin user on startup
    const adminHash = bcrypt.hashSync("gilgilgil", 10);
    if (!db.authPasswords) {
      db.authPasswords = {};
    }
    const isAlreadyGil = db.authPasswords["user-1"] && bcrypt.compareSync("gilgilgil", db.authPasswords["user-1"]);
    if (!isAlreadyGil) {
      db.authPasswords["user-1"] = adminHash;
      changed = true;
    }

    if (changed) {
      writeDB(db);
      console.log("Database migrated: admin user updated to gibasuporte@gmail.com with password 'gilgilgil'");
    }
  }
} catch (e) {
  console.error("Error migrating database admin user:", e);
}

// DB Access Helpers
function readDB() {
  const content = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(content);
}

function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Security Middlewares
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token de acesso não fornecido." });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Token de acesso inválido ou expirado." });
    }
    req.user = decoded;
    next();
  });
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Acesso negado. Requer privilégios de administrador." });
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ----------------------------------------------------
  // API Routes (FIRST)
  // ----------------------------------------------------

  // 1. AUTHENTICATION & PROFILE

  // Register
  app.post("/api/auth/register", (req, res) => {
    try {
      const { name, email, password, address } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
      }

      const db = readDB();
      const exists = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        return res.status(400).json({ error: "Este e-mail já está cadastrado no sistema." });
      }

      const id = "user-" + Date.now();
      const passwordHash = bcrypt.hashSync(password, 10);

      const newUser: User = {
        id,
        name,
        email: email.toLowerCase(),
        role: "customer",
        address: address || undefined,
        savedAddresses: address ? [address] : [],
        createdAt: new Date().toISOString()
      };

      db.users.push(newUser);
      db.authPasswords[id] = passwordHash;
      writeDB(db);

      const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: "24h" });

      res.status(201).json({ token, user: newUser });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Erro interno ao registrar usuário." });
    }
  });

  // Login
  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Informe e-mail e senha." });
      }

      const db = readDB();
      const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        return res.status(401).json({ error: "E-mail ou senha inválidos." });
      }

      const passwordHash = db.authPasswords[user.id];
      if (!passwordHash || !bcrypt.compareSync(password, passwordHash)) {
        return res.status(401).json({ error: "E-mail ou senha inválidos." });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "24h" });

      res.json({ token, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro interno no servidor de login." });
    }
  });

  // Me
  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    try {
      const db = readDB();
      const user = db.users.find((u: any) => u.id === req.user.id);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Erro ao obter dados do usuário." });
    }
  });

  // Update Profile / Address
  app.put("/api/auth/profile", authenticateToken, (req: any, res) => {
    try {
      const { name, address, savedAddresses } = req.body;
      const db = readDB();
      const userIndex = db.users.findIndex((u: any) => u.id === req.user.id);

      if (userIndex === -1) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      const user = db.users[userIndex];
      if (name) user.name = name;
      if (address) user.address = address;
      if (savedAddresses) user.savedAddresses = savedAddresses;

      db.users[userIndex] = user;
      writeDB(db);

      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Erro ao atualizar dados cadastrais." });
    }
  });


  // 2. PRODUCTS

  // Get all products
  app.get("/api/products", (req, res) => {
    try {
      const { category, search, minPrice, maxPrice } = req.query;
      const db = readDB();
      let list = db.products.filter((p: any) => p.active);

      if (category && category !== "all") {
        list = list.filter((p: any) => p.category.toLowerCase() === String(category).toLowerCase());
      }

      if (search) {
        const query = String(search).toLowerCase();
        list = list.filter((p: any) =>
          p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
        );
      }

      if (minPrice) {
        list = list.filter((p: any) => p.price >= Number(minPrice));
      }

      if (maxPrice) {
        list = list.filter((p: any) => p.price <= Number(maxPrice));
      }

      res.json(list);
    } catch (err) {
      res.status(500).json({ error: "Erro ao listar produtos." });
    }
  });

  // Get single product details
  app.get("/api/products/:id", (req, res) => {
    try {
      const db = readDB();
      const product = db.products.find((p: any) => p.id === req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Produto não encontrado." });
      }
      res.json(product);
    } catch (err) {
      res.status(500).json({ error: "Erro ao detalhar produto." });
    }
  });

  // Write a product review
  app.post("/api/products/:id/reviews", authenticateToken, (req: any, res) => {
    try {
      const { rating, comment } = req.body;
      const productId = req.params.id;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Informe uma nota de 1 a 5 estrelas." });
      }

      const db = readDB();
      const productIndex = db.products.findIndex((p: any) => p.id === productId);

      if (productIndex === -1) {
        return res.status(404).json({ error: "Produto não encontrado." });
      }

      const product = db.products[productIndex];
      const newReview: Review = {
        id: "rev-" + Date.now(),
        userId: req.user.id,
        userName: req.user.name,
        rating: Number(rating),
        comment: comment || "",
        date: new Date().toISOString()
      };

      if (!product.reviews) product.reviews = [];
      product.reviews.push(newReview);

      // Recalculate average rating
      const sum = product.reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
      product.rating = Number((sum / product.reviews.length).toFixed(1));
      product.reviewsCount = product.reviews.length;

      db.products[productIndex] = product;
      writeDB(db);

      res.status(201).json(product);
    } catch (err) {
      res.status(500).json({ error: "Erro ao adicionar avaliação." });
    }
  });


  // 3. COUPONS & CALCS

  // Apply Coupon
  app.post("/api/coupons/apply", (req, res) => {
    try {
      const { code, subtotal } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Código do cupom é obrigatório." });
      }

      const db = readDB();
      const coupon = db.coupons.find((c: any) => c.code.toUpperCase() === code.toUpperCase() && c.active);

      if (!coupon) {
        return res.status(404).json({ error: "Cupom inválido ou expirado." });
      }

      if (subtotal < coupon.minPurchase) {
        return res.status(400).json({ error: `Este cupom requer um valor mínimo de compra de R$ ${coupon.minPurchase.toFixed(2)}` });
      }

      res.json(coupon);
    } catch (err) {
      res.status(500).json({ error: "Erro ao validar cupom." });
    }
  });


  // 4. ORDERS & CHECKOUT

  // Create Order
  app.post("/api/orders/create", authenticateToken, (req: any, res) => {
    try {
      const { items, paymentMethod, shippingAddress, couponCode, shippingCost } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ error: "Nenhum item no carrinho." });
      }
      if (!shippingAddress) {
        return res.status(400).json({ error: "Endereço de entrega é obrigatório." });
      }

      const db = readDB();
      let subtotal = 0;
      const orderItems: any[] = [];

      // Validate products, check and update stock
      for (const item of items) {
        const prod = db.products.find((p: any) => p.id === item.productId);
        if (!prod) {
          return res.status(400).json({ error: `Produto ${item.name} não existe no catálogo.` });
        }
        if (prod.stock < item.quantity) {
          return res.status(400).json({ error: `Estoque insuficiente para o produto: ${prod.name}. Estoque disponível: ${prod.stock}` });
        }

        subtotal += prod.price * item.quantity;
        orderItems.push({
          productId: prod.id,
          name: prod.name,
          price: prod.price,
          quantity: item.quantity,
          imageUrl: prod.imageUrl
        });
      }

      // Check coupon
      let discountAmount = 0;
      if (couponCode) {
        const coupon = db.coupons.find((c: any) => c.code.toUpperCase() === couponCode.toUpperCase() && c.active);
        if (coupon && subtotal >= coupon.minPurchase) {
          if (coupon.discountType === "percentage") {
            discountAmount = Number(((subtotal * coupon.value) / 100).toFixed(2));
          } else {
            discountAmount = coupon.value;
          }
        }
      }

      const calculatedShipping = subtotal >= 199 || couponCode === "FRETEGRATIS" ? 0 : (shippingCost || 15.00);
      const total = Number((subtotal + calculatedShipping - discountAmount).toFixed(2));

      // Subtract Stocks & Record Movements
      for (const item of items) {
        const prodIndex = db.products.findIndex((p: any) => p.id === item.productId);
        const prod = db.products[prodIndex];
        prod.stock -= item.quantity;

        // Add Stock Movement
        const mov: StockMovement = {
          id: "mov-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
          productId: prod.id,
          productName: prod.name,
          type: "out",
          quantity: item.quantity,
          reason: `Venda - Pedido gerado`,
          date: new Date().toISOString()
        };
        db.stockMovements.push(mov);
      }

      // Generate payment details
      const orderId = "PED-" + Math.floor(10000 + Math.random() * 90000);
      let paymentDetails: any = {};

      if (paymentMethod === "pix") {
        paymentDetails = {
          qrCodeCopyPaste: `00020101021226750014br.gov.bcb.pix2553pix.fortefit.com.br/pagamento/${orderId}5204000053039865406${total.toFixed(2)}5802BR5918ForteFitSuplemento6009Sao Paulo62070503PED`
        };
      } else if (paymentMethod === "credit_card") {
        paymentDetails = {
          cardBrand: req.body.cardBrand || "Visa",
          lastFour: req.body.lastFour || "1234"
        };
      } else if (paymentMethod === "mercado_pago") {
        paymentDetails = {
          mpPreferenceId: `mp-pref-${orderId}`
        };
      }

      const newOrder: Order = {
        id: orderId,
        userId: req.user.id,
        userName: req.user.name,
        items: orderItems,
        subtotal,
        shippingCost: calculatedShipping,
        discountAmount,
        total,
        paymentMethod,
        paymentDetails,
        status: paymentMethod === "credit_card" || paymentMethod === "pix" ? "paid" : "pending", // Simulate immediate auth for simplicity
        shippingAddress,
        couponCode: couponCode || undefined,
        createdAt: new Date().toISOString(),
        paymentDate: paymentMethod === "credit_card" || paymentMethod === "pix" ? new Date().toISOString() : undefined
      };

      db.orders.push(newOrder);
      writeDB(db);

      res.status(201).json(newOrder);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro interno ao processar pedido de compra." });
    }
  });

  // Get user order list
  app.get("/api/orders", authenticateToken, (req: any, res) => {
    try {
      const db = readDB();
      const userOrders = db.orders.filter((o: any) => o.userId === req.user.id);
      // Sort orders descending by date
      userOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(userOrders);
    } catch (err) {
      res.status(500).json({ error: "Erro ao listar histórico de pedidos." });
    }
  });

  // Complete Pending payment
  app.post("/api/orders/:id/pay", authenticateToken, (req: any, res) => {
    try {
      const db = readDB();
      const orderIndex = db.orders.findIndex((o: any) => o.id === req.params.id && o.userId === req.user.id);

      if (orderIndex === -1) {
        return res.status(404).json({ error: "Pedido não localizado." });
      }

      const order = db.orders[orderIndex];
      order.status = "paid";
      order.paymentDate = new Date().toISOString();

      db.orders[orderIndex] = order;
      writeDB(db);

      res.json(order);
    } catch (err) {
      res.status(500).json({ error: "Erro ao realizar pagamento do pedido." });
    }
  });

  // Delete/Exclude Order
  app.delete("/api/orders/:id", authenticateToken, (req: any, res) => {
    try {
      const db = readDB();
      const orderIndex = db.orders.findIndex((o: any) => o.id === req.params.id);

      if (orderIndex === -1) {
        return res.status(404).json({ error: "Pedido não localizado." });
      }

      const order = db.orders[orderIndex];

      // Check permissions: either the user who owns the order or an admin
      if (order.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Você não tem permissão para excluir este pedido." });
      }

      // If the order status is not "cancelled", we should restock the items!
      if (order.status !== "cancelled") {
        for (const item of order.items) {
          const pIndex = db.products.findIndex((p: any) => p.id === item.productId);
          if (pIndex !== -1) {
            db.products[pIndex].stock += item.quantity;
            // Record stock movement
            db.stockMovements.push({
              id: "mov-" + Date.now() + "-" + Math.floor(Math.random() * 100),
              productId: item.productId,
              productName: item.name,
              type: "in",
              quantity: item.quantity,
              reason: `Estorno (Exclusão do Pedido ${order.id})`,
              date: new Date().toISOString()
            });
          }
        }
      }

      // Remove the order from db.orders
      db.orders.splice(orderIndex, 1);
      writeDB(db);

      res.json({ message: "Pedido excluído com sucesso." });
    } catch (err) {
      res.status(500).json({ error: "Erro ao excluir o pedido." });
    }
  });


  // 5. CLIENT TICKETS SUPPORT

  // Create ticket
  app.post("/api/tickets", authenticateToken, (req: any, res) => {
    try {
      const { subject, message } = req.body;
      if (!subject || !message) {
        return res.status(400).json({ error: "Forneça o assunto e a mensagem do ticket." });
      }

      const db = readDB();
      const newTicket: Ticket = {
        id: "tk-" + Math.floor(1000 + Math.random() * 9000),
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email,
        subject,
        message,
        status: "open",
        replies: [],
        createdAt: new Date().toISOString()
      };

      db.tickets.push(newTicket);
      writeDB(db);

      res.status(201).json(newTicket);
    } catch (err) {
      res.status(500).json({ error: "Erro ao criar ticket de suporte." });
    }
  });

  // Get user tickets
  app.get("/api/tickets", authenticateToken, (req: any, res) => {
    try {
      const db = readDB();
      const userTickets = db.tickets.filter((t: any) => t.userId === req.user.id);
      res.json(userTickets);
    } catch (err) {
      res.status(500).json({ error: "Erro ao obter tickets de suporte." });
    }
  });

  // User reply to ticket
  app.post("/api/tickets/:id/replies", authenticateToken, (req: any, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Mensagem vazia." });
      }

      const db = readDB();
      const tkIndex = db.tickets.findIndex((t: any) => t.id === req.params.id);

      if (tkIndex === -1) {
        return res.status(404).json({ error: "Ticket não encontrado." });
      }

      const ticket = db.tickets[tkIndex];

      // Security check: Only original creator or an admin can reply
      if (ticket.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso não autorizado." });
      }

      const newReply = {
        id: "rep-" + Date.now(),
        sender: (req.user.role === "admin" ? "support" : "user") as any,
        message,
        date: new Date().toISOString()
      };

      ticket.replies.push(newReply);
      ticket.status = req.user.role === "admin" ? "replied" : "open";

      db.tickets[tkIndex] = ticket;
      writeDB(db);

      res.json(ticket);
    } catch (err) {
      res.status(500).json({ error: "Erro ao enviar resposta ao suporte." });
    }
  });


  // 6. ADMINISTRATIVE SUITE (ADMIN ONLY)

  // Get Dashboard Metrics
  app.get("/api/admin/metrics", authenticateToken, requireAdmin, (req, res) => {
    try {
      const db = readDB();
      const paidOrders = db.orders.filter((o: any) => o.status === "paid" || o.status === "shipped" || o.status === "delivered");

      const totalRevenue = Number(paidOrders.reduce((acc: number, o: any) => acc + o.total, 0).toFixed(2));
      const totalOrders = db.orders.length;
      const totalProducts = db.products.length;
      const totalCustomers = db.users.filter((u: any) => u.role === "customer").length;

      // Low stock alerts
      const lowStockCount = db.products.filter((p: any) => p.stock <= p.alertStockLevel).length;

      // Group by Category
      const catSalesMap: Record<string, number> = {};
      paidOrders.forEach((o: any) => {
        o.items.forEach((item: any) => {
          // find product to get accurate category
          const prod = db.products.find((p: any) => p.id === item.productId);
          const category = prod ? prod.category : "Outros";
          catSalesMap[category] = (catSalesMap[category] || 0) + (item.price * item.quantity);
        });
      });

      const salesByCategory = Object.entries(catSalesMap).map(([category, value]) => ({
        category,
        value: Number(value.toFixed(2))
      }));

      // Group by Day (last 7 days of sales)
      const daysSalesMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        daysSalesMap[dateStr] = 0;
      }

      paidOrders.forEach((o: any) => {
        const dateStr = o.createdAt.split("T")[0];
        if (daysSalesMap[dateStr] !== undefined) {
          daysSalesMap[dateStr] += o.total;
        }
      });

      const salesByDay = Object.entries(daysSalesMap).map(([date, value]) => ({
        date: date.substring(5), // Short MM-DD
        value: Number(value.toFixed(2))
      }));

      const metrics: DashboardMetrics = {
        totalRevenue,
        totalOrders,
        totalProducts,
        totalCustomers,
        lowStockCount,
        salesByCategory,
        salesByDay
      };

      res.json(metrics);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao processar métricas do painel administrativo." });
    }
  });

  // Admin CRUD Products: List all (including inactive)
  app.get("/api/admin/products", authenticateToken, requireAdmin, (req, res) => {
    try {
      const db = readDB();
      res.json(db.products);
    } catch (err) {
      res.status(500).json({ error: "Erro ao listar produtos para administração." });
    }
  });

  // Create Product
  app.post("/api/admin/products", authenticateToken, requireAdmin, (req, res) => {
    try {
      const { name, description, price, imageUrl, category, brand, stock, alertStockLevel } = req.body;

      if (!name || !description || price === undefined || !imageUrl || !category || !brand || stock === undefined) {
        return res.status(400).json({ error: "Informe todos os dados do produto." });
      }

      const db = readDB();
      const newProduct: Product = {
        id: "prod-" + Date.now(),
        name,
        description,
        price: Number(price),
        imageUrl,
        category,
        brand,
        rating: 5.0,
        reviewsCount: 0,
        stock: Number(stock),
        alertStockLevel: Number(alertStockLevel || 5),
        active: true,
        reviews: []
      };

      db.products.push(newProduct);

      // Record entry movement
      const mov: StockMovement = {
        id: "mov-" + Date.now(),
        productId: newProduct.id,
        productName: newProduct.name,
        type: "in",
        quantity: newProduct.stock,
        reason: "Cadastro inicial do produto",
        date: new Date().toISOString()
      };
      db.stockMovements.push(mov);

      writeDB(db);
      res.status(201).json(newProduct);
    } catch (err) {
      res.status(500).json({ error: "Erro ao criar produto." });
    }
  });

  // Update Product (Supports updating stock with movement logs)
  app.put("/api/admin/products/:id", authenticateToken, requireAdmin, (req, res) => {
    try {
      const productId = req.params.id;
      const { name, description, price, imageUrl, category, brand, stock, alertStockLevel, active } = req.body;

      const db = readDB();
      const index = db.products.findIndex((p: any) => p.id === productId);

      if (index === -1) {
        return res.status(404).json({ error: "Produto não encontrado." });
      }

      const existingProd = db.products[index];

      // Handle stock adjustments logs
      if (stock !== undefined && Number(stock) !== existingProd.stock) {
        const diff = Number(stock) - existingProd.stock;
        const movType = diff > 0 ? "in" : "out";
        const mov: StockMovement = {
          id: "mov-" + Date.now(),
          productId: existingProd.id,
          productName: existingProd.name,
          type: movType,
          quantity: Math.abs(diff),
          reason: "Ajuste manual do administrador",
          date: new Date().toISOString()
        };
        db.stockMovements.push(mov);
        existingProd.stock = Number(stock);
      }

      if (name) existingProd.name = name;
      if (description) existingProd.description = description;
      if (price !== undefined) existingProd.price = Number(price);
      if (imageUrl) existingProd.imageUrl = imageUrl;
      if (category) existingProd.category = category;
      if (brand) existingProd.brand = brand;
      if (alertStockLevel !== undefined) existingProd.alertStockLevel = Number(alertStockLevel);
      if (active !== undefined) existingProd.active = active;

      db.products[index] = existingProd;
      writeDB(db);

      res.json(existingProd);
    } catch (err) {
      res.status(500).json({ error: "Erro ao atualizar produto." });
    }
  });

  // Delete Product (soft-delete to preserve references in orders)
  app.delete("/api/admin/products/:id", authenticateToken, requireAdmin, (req, res) => {
    try {
      const db = readDB();
      const index = db.products.findIndex((p: any) => p.id === req.params.id);

      if (index === -1) {
        return res.status(404).json({ error: "Produto não localizado." });
      }

      // Mark as inactive instead of permanent deleting
      db.products[index].active = false;
      writeDB(db);

      res.json({ message: "Produto desativado com sucesso.", product: db.products[index] });
    } catch (err) {
      res.status(500).json({ error: "Erro ao desativar produto." });
    }
  });

  // Admin list all orders
  app.get("/api/admin/orders", authenticateToken, requireAdmin, (req, res) => {
    try {
      const db = readDB();
      // Sort newest orders first
      db.orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(db.orders);
    } catch (err) {
      res.status(500).json({ error: "Erro ao listar pedidos administrados." });
    }
  });

  // Admin Update Order Status
  app.put("/api/admin/orders/:id", authenticateToken, requireAdmin, (req, res) => {
    try {
      const { status } = req.body;
      const allowedStatus = ["pending", "paid", "shipped", "delivered", "cancelled"];

      if (!status || !allowedStatus.includes(status)) {
        return res.status(400).json({ error: "Status inválido para o pedido." });
      }

      const db = readDB();
      const index = db.orders.findIndex((o: any) => o.id === req.params.id);

      if (index === -1) {
        return res.status(404).json({ error: "Pedido não localizado." });
      }

      const order = db.orders[index];
      const oldStatus = order.status;

      // Handle cancelled order: restock items!
      if (status === "cancelled" && oldStatus !== "cancelled") {
        for (const item of order.items) {
          const pIndex = db.products.findIndex((p: any) => p.id === item.productId);
          if (pIndex !== -1) {
            db.products[pIndex].stock += item.quantity;
            // Record inventory movement
            db.stockMovements.push({
              id: "mov-" + Date.now() + "-" + Math.floor(Math.random() * 100),
              productId: item.productId,
              productName: item.name,
              type: "in",
              quantity: item.quantity,
              reason: `Estorno - Pedido ${order.id} Cancelado`,
              date: new Date().toISOString()
            });
          }
        }
      }

      order.status = status;
      db.orders[index] = order;
      writeDB(db);

      res.json(order);
    } catch (err) {
      res.status(500).json({ error: "Erro ao alterar status do pedido." });
    }
  });

  // List stock movements
  app.get("/api/admin/stock/movements", authenticateToken, requireAdmin, (req, res) => {
    try {
      const db = readDB();
      // Sort descending by date
      db.stockMovements.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(db.stockMovements);
    } catch (err) {
      res.status(500).json({ error: "Erro ao listar histórico de estoque." });
    }
  });

  // Create manual stock movement (entrada/saída)
  app.post("/api/admin/stock/movements", authenticateToken, requireAdmin, (req, res) => {
    try {
      const { productId, type, quantity, reason } = req.body;

      if (!productId || !type || !quantity || !reason) {
        return res.status(400).json({ error: "Parâmetros obrigatórios ausentes: productId, type, quantity, reason." });
      }

      if (type !== "in" && type !== "out") {
        return res.status(400).json({ error: "Tipo de movimentação inválido. Deve ser 'in' ou 'out'." });
      }

      const qty = Number(quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: "Quantidade inválida. Deve ser maior que zero." });
      }

      const db = readDB();
      const pIndex = db.products.findIndex((p: any) => p.id === productId);

      if (pIndex === -1) {
        return res.status(404).json({ error: "Produto não encontrado." });
      }

      const product = db.products[pIndex];

      if (type === "out" && product.stock < qty) {
        return res.status(400).json({ error: `Estoque insuficiente para registrar a saída. Estoque atual: ${product.stock}` });
      }

      // Update stock
      if (type === "in") {
        product.stock += qty;
      } else {
        product.stock -= qty;
      }

      const mov: StockMovement = {
        id: "mov-" + Date.now(),
        productId: product.id,
        productName: product.name,
        type: type,
        quantity: qty,
        reason: reason,
        date: new Date().toISOString()
      };

      db.stockMovements.push(mov);
      db.products[pIndex] = product;

      writeDB(db);

      res.json({ message: "Movimentação registrada com sucesso.", product, movement: mov });
    } catch (err) {
      res.status(500).json({ error: "Erro ao registrar movimentação de estoque." });
    }
  });

  // List all customers
  app.get("/api/admin/customers", authenticateToken, requireAdmin, (req, res) => {
    try {
      const db = readDB();
      const customers = db.users.filter((u: any) => u.role === "customer");
      res.json(customers);
    } catch (err) {
      res.status(500).json({ error: "Erro ao listar clientes registrados." });
    }
  });

  // Admin list support tickets
  app.get("/api/admin/tickets", authenticateToken, requireAdmin, (req, res) => {
    try {
      const db = readDB();
      db.tickets.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(db.tickets);
    } catch (err) {
      res.status(500).json({ error: "Erro ao listar tickets administrativos." });
    }
  });


  // 7. GEMINI POWERED INTELLIGENT SUPPORT CHATBOT

  app.post("/api/support/gemini", async (req, res) => {
    try {
      const { message, chatHistory } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Mensagem é obrigatória." });
      }

      const client = getGeminiClient();

      if (client) {
        // Prepare instruction
        const systemInstruction = `Você é o "ForteAI", o assistente virtual de inteligência artificial inteligente, empático e prestativo da ForteFit Suplementos.
Sua missão é ajudar os clientes a escolher os melhores suplementos alimentares com base em seus objetivos (ex: ganho de massa, queima de gordura, aumento de energia, imunidade, etc.).
Diga sempre as dosagens de forma segura, recomende as categorias presentes no nosso catálogo (como Proteínas, Aminoácidos, Vitaminas e Termogênicos) e seja proativo ao incentivar a saúde.
Fale de forma natural, amigável e em português do Brasil. Escreva respostas curtas, em parágrafos organizados ou listas de tópicos para fácil leitura.
Nunca invente informações de preços exagerados que não condizem com suplementos normais, encoraje o uso de cupons de desconto como "FORTE10" (10% OFF) e "WHEYPROMO" (R$20 de desconto).`;

        // Map client chat history format to Gemini API if available
        const contents = [];
        if (chatHistory && Array.isArray(chatHistory)) {
          for (const msg of chatHistory) {
            contents.push({
              role: msg.sender === "user" ? "user" : "model",
              parts: [{ text: msg.text }]
            });
          }
        }

        // Add current user prompt
        contents.push({
          role: "user",
          parts: [{ text: message }]
        });

        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          }
        });

        const reply = response.text || "Estou aqui para ajudar com suas dúvidas sobre suplementos alimentares! Deseja saber mais sobre Whey Protein, Creatina ou Termogênicos?";
        return res.json({ reply });
      } else {
        // Fallback robust rules-based conversational AI bot if GEMINI_API_KEY is not defined
        const lower = message.toLowerCase();
        let reply = "";

        if (lower.includes("whey") || lower.includes("proteina") || lower.includes("proteína")) {
          reply = "O Whey Protein é excelente para reconstrução muscular e ganho de massa magra! Na ForteFit, recomendamos o **100% Pure Whey Protein da Max Titanium** por R$ 149,90 ou o isolado **ISO Triple Zero** (zero lactose) por R$ 239,90. Ambos de qualidade excelente! Dica: use o cupom **FORTE10** para economizar!";
        } else if (lower.includes("creatina") || lower.includes("força") || lower.includes("creapure")) {
          reply = "A Creatina é o suplemento mais estudado do mundo! Ela auxilia no aumento de força, potência e volume muscular. Temos a **Creatina Creapure (300g) da Growth Supplements** por apenas R$ 99,90. Ela dissolve super fácil e rende bastante! Restam poucas unidades no estoque!";
        } else if (lower.includes("pre treino") || lower.includes("pré-treino") || lower.includes("energia") || lower.includes("foco")) {
          reply = "Para ter energia explosiva e foco indomável, recomendo o pré-treino **C4 Beta Pump (225g) da New Millen** por R$ 119,90. Ele contém cafeína, taurina e beta-alanina que aumentam drasticamente a resistência nos treinos.";
        } else if (lower.includes("cupom") || lower.includes("desconto") || lower.includes("promo")) {
          reply = "Claro! Economize com nossos cupons oficiais da ForteFit: \n- **FORTE10**: 10% de desconto em todo o site.\n- **WHEYPROMO**: R$ 20,00 de desconto (compras acima de R$ 150).\n- **FRETEGRATIS**: Ganhe frete grátis em compras a partir de R$ 199!";
        } else if (lower.includes("emagrecer") || lower.includes("gordura") || lower.includes("secar") || lower.includes("termogenico") || lower.includes("lipo")) {
          reply = "Para acelerar a queima de gordura e o metabolismo, o termogênico **Lipo-6 Black Ultra Concentrado da Nutrex** por R$ 189,90 é a nossa recomendação número um. Lembre-se de aliar com exercícios cardiovasculares!";
        } else if (lower.includes("vitamina") || lower.includes("imunidade") || lower.includes("saude") || lower.includes("saúde")) {
          reply = "Cuidar da saúde básica é crucial! Nosso **Multivitamínico CentroVits de 90 tabletes** sai por apenas R$ 49,90 e oferece o espectro completo de 23 vitaminas e minerais essenciais para manter o sistema imune blindado.";
        } else if (lower.includes("olá") || lower.includes("oi") || lower.includes("bom dia") || lower.includes("boa tarde") || lower.includes("boa noite")) {
          reply = "Olá! Seja muito bem-vindo à ForteFit Suplementos. Sou o ForteAI, seu consultor de suplementação inteligente. Como posso te ajudar hoje? (Ganho de massa, definição, energia ou cupons de desconto?)";
        } else {
          reply = "Entendi! Sou especializado em nutrição e suplementos da ForteFit. Você pode me perguntar sobre Whey Protein para massa muscular, Creatina Creapure para força física, termogênicos para queima calórica, ou se quiser saber o status do seu pedido e cupons de desconto ativos!";
        }

        return res.json({ reply });
      }
    } catch (err: any) {
      console.error("Gemini route error:", err);
      res.json({ reply: "Tive um problema rápido ao processar seu pensamento, mas continuo online! Como posso te auxiliar com seus suplementos?" });
    }
  });


  // ----------------------------------------------------
  // Vite Integration & Asset Serving
  // ----------------------------------------------------

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
