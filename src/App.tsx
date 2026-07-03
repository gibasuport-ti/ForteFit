import { useState, useEffect, FormEvent } from "react";
import { 
  Search, SlidersHorizontal, Dumbbell, Shield, User as UserIcon, LogOut, ShoppingCart, 
  Dribbble, Sparkles, AlertCircle, Info, Heart, Star, Flame, Trophy
} from "lucide-react";
import { Product, User } from "./types";
import { api, setAuthToken, removeAuthToken } from "./utils/api";

// Component imports
import Header from "./components/Header";
import ProductCard from "./components/ProductCard";
import ProductDetails from "./components/ProductDetails";
import CartDrawer from "./components/CartDrawer";
import CheckoutView from "./components/CheckoutView";
import CustomerDashboard from "./components/CustomerDashboard";
import AdminPanel from "./components/AdminPanel";
import SupportChat from "./components/SupportChat";

export default function App() {
  // Navigation & View States
  const [view, setView] = useState<"catalog" | "details" | "checkout" | "dashboard" | "admin">("catalog");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Cart State (Persisted in localStorage!)
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>(() => {
    const saved = localStorage.getItem("fortefit_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Products Data
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [sortBy, setSortBy] = useState<"rating" | "price_asc" | "price_desc">("rating");

  // Save Cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("fortefit_cart", JSON.stringify(cart));
  }, [cart]);

  // Load profile and products on init
  const initApp = async () => {
    try {
      setLoadingProducts(true);
      setInitError(null);
      // Fetch public products catalog
      const prods = await api.getProducts();
      setProducts(prods);

      // Check if user is already logged in
      const token = localStorage.getItem("fortefit_token");
      if (token) {
        const profile = await api.getMe();
        setUser(profile);
      }
    } catch (err: any) {
      console.error("Erro na inicialização do ForteFit:", err);
      setInitError(err.message || "Erro na comunicação com o servidor.");
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  // Authentication Handlers
  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      if (authMode === "login") {
        const data = await api.login({ email: authEmail, password: authPassword });
        setAuthToken(data.token);
        setUser(data.user);
        setIsAuthModalOpen(false);
      } else {
        if (!authName) {
          setAuthError("Por favor, preencha seu nome completo.");
          setAuthLoading(false);
          return;
        }
        const data = await api.register({ name: authName, email: authEmail, password: authPassword });
        setAuthToken(data.token);
        setUser(data.user);
        setIsAuthModalOpen(false);
      }
      // Reset fields
      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      setAuthError(err.message || "Credenciais inválidas. Tente novamente.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoLogin = async (email: string) => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const password = email === "gibasuporte@gmail.com" ? "gilgilgil" : "password123";
      const data = await api.login({ email, password });
      setAuthToken(data.token);
      setUser(data.user);
      setIsAuthModalOpen(false);
      // Reset fields
      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      setAuthError(err.message || "Erro ao fazer login de demonstração.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
    setView("catalog");
    setSelectedProductId(null);
  };

  // Cart Interactions
  const handleAddToCart = (product: Product, quantityToAdd: number) => {
    if (product.stock <= 0) {
      alert("Desculpe, este item não está disponível para compra (estoque esgotado).");
      return;
    }
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        // Prevent adding more than stock limits
        const targetQty = Math.min(product.stock, existing.quantity + quantityToAdd);
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: targetQty } : item
        );
      }
      return [...prevCart, { product, quantity: Math.min(product.stock, quantityToAdd) }];
    });
    
    // Open cart drawer immediately to provide visual confirmation feedback
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const handleCheckoutRedirect = () => {
    setIsCartOpen(false);
    if (!user) {
      setAuthMode("login");
      setAuthError("Você precisa acessar sua conta ou cadastrar-se para finalizar a compra.");
      setIsAuthModalOpen(true);
    } else {
      setView("checkout");
    }
  };

  // Filter and sort products
  const filteredProducts = products
    .filter((prod) => prod.active) // Show only active items
    .filter((prod) => {
      const matchesSearch = 
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || prod.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || prod.brand === selectedBrand;

      return matchesSearch && matchesCategory && matchesBrand;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      return b.rating - a.rating; // default to best rated
    });

  // Extract unique brands for filtering select option list
  const uniqueBrands = Array.from(new Set(products.map((p) => p.brand)));

  return (
    <div className="min-h-screen bg-[#fafbfe] flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* Header bar */}
      <Header
        user={user}
        cartItemsCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onCartClick={() => setIsCartOpen(true)}
        currentView={view === "dashboard" ? "customer" : view}
        onViewChange={(newView) => {
          if (newView === "customer") {
            setView("dashboard");
          } else {
            setView(newView as any);
          }
        }}
        onLoginClick={() => {
          setAuthMode("login");
          setAuthError("");
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Test Account Banner for Preview */}
      {!user && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs py-3 px-4 shadow-sm flex flex-col sm:flex-row items-center justify-center gap-3 font-medium">
          <div className="flex items-center gap-1.5 text-center sm:text-left">
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase">DICA</span>
            <span>Quer testar as novidades do estoque e exclusão de pedidos? Entre com as contas de teste:</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleDemoLogin("gibasuporte@gmail.com")}
              className="bg-slate-900/40 hover:bg-slate-900/70 text-white px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border border-white/15"
            >
              🔑 Administrador (gibasuporte)
            </button>
            <button
              onClick={() => handleDemoLogin("lucas@email.com")}
              className="bg-white hover:bg-slate-50 text-emerald-800 px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-xs"
            >
              👤 Cliente (Lucas Silva)
            </button>
          </div>
        </div>
      )}

      {/* Main app body screen */}
      <main className="flex-1">
        {/* ----------------------------------------------------
            VIEW 1: CATALOGO (PRODUCTS SHOWCASE)
            ---------------------------------------------------- */}
        {view === "catalog" && (
          <div className="fade-in">
            {/* Immersive Hero Banner */}
            <div className="bg-slate-900 text-white py-16 px-4 relative overflow-hidden">
              {/* Abstract decorative graphic highlights */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                <div className="max-w-xl space-y-4">
                  <span className="bg-emerald-500 text-slate-950 font-bold uppercase text-[10px] tracking-widest px-3 py-1 rounded-md inline-block">
                    PROMOÇÃO DE INVERNO: USE O CUPOM <strong className="text-white">FORTE10</strong>
                  </span>
                  <h1 className="font-display font-extrabold text-3xl sm:text-5xl leading-tight tracking-tight text-white">
                    Performance e <span className="text-emerald-500">Força Extrema</span> para o seu Treino
                  </h1>
                  <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                    Suplementos alimentares importados e nacionais com matéria-prima de máxima pureza certificada. Frete grátis para compras acima de R$ 199,00!
                  </p>
                </div>

                {/* Banner Metrics badges */}
                <div className="grid grid-cols-2 gap-4 shrink-0 mx-auto sm:mx-0">
                  <div className="bg-slate-800/40 border border-slate-800/60 p-4 rounded-2xl text-center backdrop-blur-xs min-w-[120px]">
                    <Trophy className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-400">100% Puro</p>
                    <p className="text-[10px] text-slate-500">Garantia ForteFit</p>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-800/60 p-4 rounded-2xl text-center backdrop-blur-xs min-w-[120px]">
                    <Flame className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-400">Entrega Veloz</p>
                    <p className="text-[10px] text-slate-500">Separado em horas</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick search and filter panel */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
              <div className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-xl flex flex-col lg:flex-row gap-4 items-center">
                {/* Search input field */}
                <div className="relative w-full lg:flex-1">
                  <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por Whey, Creatina, Pré-treino, Albumina..."
                    className="w-full bg-slate-50 text-slate-800 border-none text-xs rounded-2xl pl-12 pr-4 py-3.5 focus:bg-white focus:outline-emerald-500 transition-all font-medium"
                  />
                </div>

                {/* Category selectors dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
                  <div className="flex items-center bg-slate-50 rounded-2xl px-3.5 py-1.5 border border-transparent">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">Categoria</span>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-transparent text-xs text-slate-700 font-bold focus:outline-hidden cursor-pointer"
                    >
                      <option value="all">Todas as categorias</option>
                      <option value="Proteínas">Proteínas (Whey)</option>
                      <option value="Aminoácidos">Aminoácidos (Creatina)</option>
                      <option value="Pré-Treino">Pré-Treino</option>
                      <option value="Vitaminas">Vitaminas</option>
                      <option value="Termogênicos">Termogênicos</option>
                    </select>
                  </div>

                  <div className="flex items-center bg-slate-50 rounded-2xl px-3.5 py-1.5 border border-transparent">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">Fabricante</span>
                    <select
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      className="bg-transparent text-xs text-slate-700 font-bold focus:outline-hidden cursor-pointer"
                    >
                      <option value="all">Todas as Marcas</option>
                      {uniqueBrands.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center bg-slate-50 rounded-2xl px-3.5 py-1.5 border border-transparent">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">Ordenar por</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-transparent text-xs text-slate-700 font-bold focus:outline-hidden cursor-pointer"
                    >
                      <option value="rating">Melhor Avaliados</option>
                      <option value="price_asc">Menor Preço</option>
                      <option value="price_desc">Maior Preço</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Grid Results Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">Catálogo de Suplementos</h2>
                  <p className="text-slate-400 text-xs mt-1">Exibindo {filteredProducts.length} resultados filtrados</p>
                </div>
              </div>

              {loadingProducts ? (
                <div className="py-24 text-center">
                  <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-500 font-semibold animate-pulse">Carregando estoque de suplementos...</p>
                </div>
              ) : initError ? (
                <div className="bg-white rounded-3xl border border-red-100 p-8 sm:p-12 shadow-xl max-w-3xl mx-auto">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="bg-red-50 p-3 rounded-2xl shrink-0">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-display font-extrabold text-lg text-slate-900 tracking-tight">
                        Não foi possível estabelecer conexão com o servidor
                      </h3>
                      <p className="text-slate-500 text-xs mt-1">
                        Ocorreu uma falha ao tentar carregar o catálogo de suplementos e as configurações de autenticação.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8 text-left space-y-4">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span>💡</span> Como corrigir este erro localmente no Windows:
                    </p>
                    
                    <div className="space-y-3.5 text-xs text-slate-600">
                      <div className="flex gap-2">
                        <span className="font-extrabold text-emerald-600">1.</span>
                        <p>
                          <strong>Desative o "Acesso a Pastas Controlado" do Windows Defender:</strong> O Windows Defender costuma bloquear silenciosamente o executável <code>esbuild.exe</code> que o Vite usa para otimizar os módulos em <code>node_modules</code>. Vá em <em>Segurança do Windows &gt; Proteção contra vírus e ameaças &gt; Gerenciar proteção contra ransomware</em> e <strong>Desative</strong> a opção "Acesso a pastas controlado", ou permita o aplicativo do esbuild.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <span className="font-extrabold text-emerald-600">2.</span>
                        <p>
                          <strong>Adicione uma Exclusão no Windows Defender:</strong> Vá em <em>Segurança do Windows &gt; Proteção contra vírus e ameaças &gt; Gerenciar configurações &gt; Exclusões (Adicionar ou remover exclusões)</em>. Adicione a pasta do seu projeto (<code>C:\PROJETOS\fortefit-suplementos</code>) como uma exclusão.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <span className="font-extrabold text-emerald-600">3.</span>
                        <p>
                          <strong>Erro de Política de Execução no PowerShell (PSSeurityException):</strong> Se receber um erro dizendo que o script <code>npm.ps1 não está assinado digitalmente</code> ao rodar o comando no PowerShell, execute este comando antes no PowerShell para habilitar a execução de scripts locais:
                          <code className="block bg-slate-900 text-emerald-400 p-2 rounded-lg font-mono text-[11px] mt-2 leading-relaxed">
                            Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
                          </code>
                          Ou simplesmente use o <strong>Prompt de Comando padrão (CMD)</strong> em vez do PowerShell, que não possui essa restrição.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <span className="font-extrabold text-emerald-600">4.</span>
                        <p>
                          <strong>Execute como Administrador:</strong> Feche o terminal atual, abra o <strong>Prompt de Comando (CMD)</strong> ou <strong>PowerShell</strong> como Administrador e execute novamente o comando <code>npm run dev</code>.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <span className="font-extrabold text-emerald-600">5.</span>
                        <p>
                          <strong>Limpe o Cache e Reinicie:</strong> Se os arquivos continuarem bloqueados ou travados por outros processos, execute estes comandos no terminal para limpar o cache do Vite:
                          <code className="block bg-slate-900 text-emerald-400 p-2 rounded-lg font-mono text-[11px] mt-2 leading-relaxed">
                            npm run clean<br />
                            rmdir /s /q node_modules\.vite<br />
                            npm run dev
                          </code>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      onClick={initApp}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      🔄 Tentar Conectar Novamente
                    </button>
                    <a
                      href="https://ai.studio/build"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-6 py-3 rounded-xl transition-all cursor-pointer text-center"
                    >
                      Acessar Preview Online
                    </a>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-xs">
                  <Info className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                  <p className="font-display font-bold text-slate-700 text-base">Nenhum suplemento localizado</p>
                  <p className="text-slate-400 text-xs mt-1 mb-6">Tente alterar os termos de busca ou remover os filtros aplicados.</p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                      setSelectedBrand("all");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                  {filteredProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onProductClick={(id) => {
                        setSelectedProductId(id);
                        setView("details");
                      }}
                      onAddToCart={(p) => handleAddToCart(p, 1)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            VIEW 2: DETALHES DO PRODUTO (INTERACTIVE DETAIL)
            ---------------------------------------------------- */}
        {view === "details" && selectedProductId && (
          <ProductDetails
            productId={selectedProductId}
            onBack={() => {
              setView("catalog");
              setSelectedProductId(null);
            }}
            onAddToCart={handleAddToCart}
            user={user}
            onLoginClick={() => {
              setAuthMode("login");
              setAuthError("");
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {/* ----------------------------------------------------
            VIEW 3: CHECKOUT (PIX, CREDIT CARD, MERCADO PAGO)
            ---------------------------------------------------- */}
        {view === "checkout" && (
          <CheckoutView
            cartItems={cart}
            user={user}
            onBack={() => setView("catalog")}
            onClearCart={() => setCart([])}
            onSuccess={(order) => {
              // Redirect client to Dashboard -> active Order expanded
              setView("dashboard");
            }}
          />
        )}

        {/* ----------------------------------------------------
            VIEW 4: AREA DO CLIENTE (ORDERS & TICKETS CHAT)
            ---------------------------------------------------- */}
        {view === "dashboard" && user && (
          <CustomerDashboard
            user={user}
            onUpdateUser={(updated) => setUser(updated)}
          />
        )}

        {/* ----------------------------------------------------
            VIEW 5: PAINEL ADMINISTRATIVO (ADMIN SUITE)
            ---------------------------------------------------- */}
        {view === "admin" && user?.role === "admin" && (
          <AdminPanel />
        )}
      </main>

      {/* Footer copyright segment */}
      <footer className="bg-slate-900 text-slate-500 text-xs py-8 border-t border-slate-850 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-emerald-500" />
            <span className="font-display font-extrabold text-sm text-white tracking-tight">ForteFit</span>
          </div>
          <p>© 2026 ForteFit Suplementos Ltda. CNPJ: 45.102.394/0001-10. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <span className="text-slate-400">Feito para atletas. Materiais com Certificação GMP.</span>
          </div>
        </div>
      </footer>

      {/* ----------------------------------------------------
          MODAL: AUTHENTICATION (LOGIN & REGISTER OVERLAY)
          ---------------------------------------------------- */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur clickoff */}
          <div 
            onClick={() => setIsAuthModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
          ></div>

          {/* Form container */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-sm w-full relative z-10 p-6 sm:p-8 space-y-4 animate-slide-in">
            <div className="text-center space-y-1">
              <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                <Dumbbell className="h-5 w-5" />
              </div>
              <h3 className="font-display font-extrabold text-lg text-slate-900">
                {authMode === "login" ? "Acesse sua Conta" : "Cadastre-se na ForteFit"}
              </h3>
              <p className="text-slate-400 text-xs">Participe do clube de vantagens e descontos exclusivos!</p>
            </div>

            {/* Quick Demo Access Buttons */}
            <div className="bg-emerald-50/50 rounded-2xl p-3.5 border border-emerald-100/60 space-y-2">
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider text-center">Acesso Rápido de Teste (Clique para entrar)</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => handleDemoLogin("gibasuporte@gmail.com")}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-2 px-1.5 rounded-xl transition-all cursor-pointer text-center flex flex-col justify-center items-center shadow-xs"
                >
                  <span>Painel Admin</span>
                  <span className="text-[8px] font-normal text-slate-400">gibasuporte@gmail.com</span>
                </button>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => handleDemoLogin("lucas@email.com")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-2 px-1.5 rounded-xl transition-all cursor-pointer text-center flex flex-col justify-center items-center shadow-xs"
                >
                  <span>Área do Cliente</span>
                  <span className="text-[8px] font-normal text-emerald-200">lucas@email.com</span>
                </button>
              </div>
            </div>

            {authError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 leading-snug">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{authError}</p>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === "register" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Seu nome completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Gilberto Silva"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl px-4 py-3 focus:bg-white focus:outline-emerald-500 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Endereço de e-mail *</label>
                <input
                  type="email"
                  required
                  placeholder="seuemail@exemplo.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl px-4 py-3 focus:bg-white focus:outline-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Senha secreta *</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl px-4 py-3 focus:bg-white focus:outline-emerald-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3.5 rounded-xl cursor-pointer disabled:opacity-50 shadow-sm transition-all text-center"
              >
                {authLoading ? "Aguarde..." : authMode === "login" ? "Entrar na Loja" : "Criar Meu Cadastro"}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-50">
              {authMode === "login" ? (
                <p className="text-xs text-slate-500">
                  Não possui cadastro?{" "}
                  <button 
                    onClick={() => { setAuthMode("register"); setAuthError(""); }} 
                    className="text-emerald-600 font-bold hover:underline"
                  >
                    Criar Conta Grátis
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Já possui cadastro?{" "}
                  <button 
                    onClick={() => { setAuthMode("login"); setAuthError(""); }} 
                    className="text-emerald-600 font-bold hover:underline"
                  >
                    Fazer Login
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shopping Cart Sidebar drawer popup */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={handleCheckoutRedirect}
      />

      {/* Floating Customer AI support chat helper */}
      <SupportChat />
    </div>
  );
}
