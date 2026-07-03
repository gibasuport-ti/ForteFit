import { useState, useEffect, FormEvent } from "react";
import { 
  DollarSign, ShoppingCart, Users, Package, AlertTriangle, 
  Plus, Edit, Trash2, Check, RefreshCw, Layers, History, ClipboardList, HelpCircle,
  Upload, Image as ImageIcon, Link as LinkIcon
} from "lucide-react";
import { Product, Order, StockMovement, Ticket, DashboardMetrics } from "../types";
import { api } from "../utils/api";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "orders" | "stock" | "tickets">("dashboard");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Form states for product creation/editing
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Product Fields
  const [prodName, setProdName] = useState("");
  const [prodDescription, setProdDescription] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodImageUrl, setProdImageUrl] = useState("");
  const [prodCategory, setProdCategory] = useState("Proteínas");
  const [prodBrand, setProdBrand] = useState("");
  const [prodStock, setProdStock] = useState("");
  const [prodAlertLevel, setProdAlertLevel] = useState("5");
  const [prodActive, setProdActive] = useState(true);

  // Ticket reply states
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Manual stock movement states
  const [movProductId, setMovProductId] = useState("");
  const [movType, setMovType] = useState<"in" | "out">("in");
  const [movQuantity, setMovQuantity] = useState("");
  const [movReason, setMovReason] = useState("");
  const [movError, setMovError] = useState("");
  const [movSuccess, setMovSuccess] = useState("");

  // Image source and drag upload states
  const [imageSourceTab, setImageSourceTab] = useState<"url" | "upload">("url");
  const [isDragging, setIsDragging] = useState(false);

  // Custom UI confirmation states instead of native window.confirm (which gets blocked in preview iframe)
  const [deactivatingProductId, setDeactivatingProductId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const handlePostStockMovement = async (e: FormEvent) => {
    e.preventDefault();
    setMovError("");
    setMovSuccess("");

    if (!movProductId || !movType || !movQuantity || !movReason.trim()) {
      setMovError("Por favor, preencha todos os campos.");
      return;
    }

    const qty = Number(movQuantity);
    if (isNaN(qty) || qty <= 0) {
      setMovError("A quantidade deve ser um número maior que zero.");
      return;
    }

    // If type is "out", verify if we have enough stock locally
    const targetProduct = products.find(p => p.id === movProductId);
    if (movType === "out" && targetProduct && targetProduct.stock < qty) {
      setMovError(`Estoque insuficiente. O produto possui apenas ${targetProduct.stock} un. em estoque.`);
      return;
    }

    try {
      await api.createAdminStockMovement({
        productId: movProductId,
        type: movType,
        quantity: qty,
        reason: movReason
      });

      setMovSuccess("Movimentação de estoque registrada com sucesso!");
      setMovProductId("");
      setMovQuantity("");
      setMovReason("");
      
      // Refresh all admin data to update metrics and lists
      loadAllAdminData();
    } catch (err: any) {
      setMovError(err.message || "Erro ao registrar a movimentação.");
    }
  };

  // Loading and error states
  const [loading, setLoading] = useState(false);

  const loadAllAdminData = async () => {
    try {
      setLoading(true);
      const metricsData = await api.getAdminMetrics();
      const productsData = await api.getAdminProducts();
      const ordersData = await api.getAdminOrders();
      const stockData = await api.getAdminStockMovements();
      const ticketsData = await api.getAdminTickets();

      setMetrics(metricsData);
      setProducts(productsData);
      setOrders(ordersData);
      setMovements(stockData);
      setTickets(ticketsData);
    } catch (err: any) {
      alert("Erro ao carregar dados administrativos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const openCreateForm = () => {
    setEditingProduct(null);
    setProdName("");
    setProdDescription("");
    setProdPrice("");
    setProdImageUrl("");
    setProdCategory("Proteínas");
    setProdBrand("");
    setProdStock("");
    setProdAlertLevel("5");
    setProdActive(true);
    setImageSourceTab("url");
    setIsFormOpen(true);
  };

  const openEditForm = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdDescription(prod.description);
    setProdPrice(String(prod.price));
    setProdImageUrl(prod.imageUrl);
    setProdCategory(prod.category);
    setProdBrand(prod.brand);
    setProdStock(String(prod.stock));
    setProdAlertLevel(String(prod.alertStockLevel));
    setProdActive(prod.active);
    setImageSourceTab(prod.imageUrl.startsWith("data:image/") ? "upload" : "url");
    setIsFormOpen(true);
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodBrand || !prodPrice || !prodStock) return;

    const payload = {
      name: prodName,
      description: prodDescription,
      price: Number(prodPrice),
      imageUrl: prodImageUrl || "https://images.unsplash.com/photo-1579758629938-03607ccdbaba?q=80&w=600",
      category: prodCategory,
      brand: prodBrand,
      stock: Number(prodStock),
      alertStockLevel: Number(prodAlertLevel),
      active: prodActive,
    };

    try {
      if (editingProduct) {
        // Update product
        const updated = await api.updateAdminProduct(editingProduct.id, payload);
        setProducts(products.map(p => p.id === editingProduct.id ? updated : p));
      } else {
        // Create product
        const created = await api.createAdminProduct(payload);
        setProducts([created, ...products]);
      }
      setIsFormOpen(false);
      loadAllAdminData(); // Refresh metrics and stock movements logs!
    } catch (err: any) {
      alert("Erro ao gravar produto: " + err.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await api.deleteAdminProduct(id);
      setProducts(products.map(p => p.id === id ? { ...p, active: false } : p));
      setDeactivatingProductId(null);
    } catch (err: any) {
      alert("Erro ao desativar produto: " + err.message);
    }
  };

  const handleReactivateProduct = async (id: string) => {
    try {
      await api.updateAdminProduct(id, { active: true });
      setProducts(products.map(p => p.id === id ? { ...p, active: true } : p));
    } catch (err: any) {
      alert("Erro ao reativar produto: " + err.message);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const updated = await api.updateAdminOrderStatus(orderId, status);
      setOrders(orders.map(o => o.id === orderId ? updated : o));
      loadAllAdminData(); // Refresh metrics and inventory logs on restocks!
    } catch (err: any) {
      alert("Falha ao alterar status do pedido: " + err.message);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await api.deleteOrder(orderId);
      setOrders(orders.filter(o => o.id !== orderId));
      loadAllAdminData(); // Refresh metrics and stock movements logs!
      setDeletingOrderId(null);
    } catch (err: any) {
      alert("Falha ao excluir o pedido: " + err.message);
    }
  };

  const handleSendTicketReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;

    try {
      const updated = await api.replyTicket(selectedTicketId, replyText);
      setTickets(tickets.map(t => t.id === selectedTicketId ? updated : t));
      setReplyText("");
      setSelectedTicketId(null);
      alert("Resposta do suporte enviada com sucesso!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      {/* Visual Admin header block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight leading-none mb-1">
            Painel Executivo
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">Controle de faturamento, estoque, pedidos e atendimento.</p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={loadAllAdminData}
            disabled={loading}
            className="flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Sincronizar Dados
          </button>
        </div>
      </div>

      {/* Admin tab selector */}
      <div className="flex border-b border-slate-100 gap-6 mb-8 overflow-x-auto pb-px">
        {[
          { id: "dashboard", label: "Visão Geral", icon: DollarSign },
          { id: "products", label: "Catálogo (CRUD)", icon: Package },
          { id: "orders", label: "Pedidos", icon: ClipboardList },
          { id: "stock", label: "Estoque & Movimentação", icon: History },
          { id: "tickets", label: "Suporte Técnico", icon: HelpCircle }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setSelectedTicketId(null); }}
              className={`flex items-center gap-1.5 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive 
                  ? "border-emerald-600 text-emerald-600" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ----------------------------------------------------
          TAB 1: VISÃO GERAL (DASHBOARD METRICS)
          ---------------------------------------------------- */}
      {activeTab === "dashboard" && metrics && (
        <div className="space-y-8">
          {/* Metrics summary grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Faturamento Total</span>
                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p className="font-display font-extrabold text-xl text-slate-900 tracking-tight">
                R$ {metrics.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Aprovado e capturado</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Pedidos</span>
                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                  <ShoppingCart className="h-4 w-4" />
                </div>
              </div>
              <p className="font-display font-extrabold text-xl text-slate-900 tracking-tight">
                {metrics.totalOrders}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Pendentes, pagos e enviados</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mix de Produtos</span>
                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <p className="font-display font-extrabold text-xl text-slate-900 tracking-tight">
                {metrics.totalProducts}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Ativos no catálogo</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clientes Registrados</span>
                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <p className="font-display font-extrabold text-xl text-slate-900 tracking-tight">
                {metrics.totalCustomers}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Excluindo administradores</p>
            </div>

            <div className="bg-white rounded-2xl border border-rose-100 p-5 shadow-xs bg-rose-50/10">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Estoque Crítico</span>
                <div className="bg-rose-50 text-rose-500 p-2 rounded-xl animate-pulse">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <p className="font-display font-extrabold text-xl text-rose-600 tracking-tight">
                {metrics.lowStockCount}
              </p>
              <p className="text-[10px] text-rose-400 mt-1 font-bold">Unidades em alerta</p>
            </div>
          </div>

          {/* Graphic/Visual Breakdown block */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
              <h3 className="font-display font-bold text-slate-800 text-sm mb-4">Faturamento por Categoria de Suplemento</h3>
              <div className="space-y-3.5">
                {metrics.salesByCategory.length === 0 ? (
                  <p className="text-slate-400 text-xs py-8 text-center">Nenhuma venda consolidada ainda.</p>
                ) : (
                  metrics.salesByCategory.map((cat, i) => {
                    const max = Math.max(...metrics.salesByCategory.map(c => c.value), 1);
                    const pct = (cat.value / max) * 100;
                    return (
                      <div key={i} className="space-y-1 text-xs">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-700">{cat.category}</span>
                          <span className="text-slate-900">R$ {cat.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
              <h3 className="font-display font-bold text-slate-800 text-sm mb-4">Vendas por Período de Cobrança</h3>
              <div className="space-y-3.5">
                {metrics.salesByDay.length === 0 ? (
                  <p className="text-slate-400 text-xs py-8 text-center">Nenhuma faturamento registrado recentemente.</p>
                ) : (
                  metrics.salesByDay.map((day, i) => {
                    const max = Math.max(...metrics.salesByDay.map(d => d.value), 1);
                    const pct = (day.value / max) * 100;
                    return (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <span className="w-12 text-slate-500 font-medium">{day.date}</span>
                        <div className="flex-1 bg-slate-150 h-4 rounded-md overflow-hidden relative">
                          <div className="bg-emerald-600/20 hover:bg-emerald-600/30 h-4 rounded-md transition-all" style={{ width: `${pct}%` }}></div>
                        </div>
                        <span className="w-20 text-right font-extrabold text-slate-800">R$ {day.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 2: PRODUTOS (CRUD & INVENTORY FIELD ADJUSTS)
          ---------------------------------------------------- */}
      {activeTab === "products" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">Administrar Suplementos</h2>
            <button
              onClick={openCreateForm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Adicionar Produto
            </button>
          </div>

          {/* Table display */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-extrabold uppercase tracking-widest">
                    <th className="p-4 sm:p-5">Produto</th>
                    <th className="p-4">Marca & Categoria</th>
                    <th className="p-4">Preço</th>
                    <th className="p-4">Estoque</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {products.map((prod) => {
                    const isLow = prod.stock <= prod.alertStockLevel;
                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/20">
                        <td className="p-4 sm:p-5 font-semibold text-slate-800">
                          <div className="flex items-center gap-3">
                            <img src={prod.imageUrl} alt={prod.name} className="h-10 w-10 object-contain p-1 rounded bg-slate-50 border border-slate-100" />
                            <div className="min-w-0 max-w-[200px]">
                              <p className="truncate font-bold text-slate-800" title={prod.name}>{prod.name}</p>
                              <p className="text-[10px] text-slate-400">ID: {prod.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-500">
                          <p>{prod.brand}</p>
                          <p className="text-[10px] text-slate-400">{prod.category}</p>
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          R$ {prod.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4">
                          <span className={`font-semibold ${isLow ? "text-rose-500 font-bold" : "text-slate-700"}`}>
                            {prod.stock} un.
                          </span>
                          {isLow && (
                            <p className="text-[9px] text-rose-500 font-semibold flex items-center gap-0.5 mt-0.5">
                              <AlertTriangle className="h-3 w-3 shrink-0" /> Baixo
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            prod.active 
                              ? "bg-emerald-50 text-emerald-600" 
                              : "bg-slate-100 text-slate-400"
                          }`}>
                            {prod.active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          {deactivatingProductId === prod.id ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[10px] font-bold text-rose-600 animate-pulse">Desativar?</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer"
                              >
                                Sim
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeactivatingProductId(null)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => openEditForm(prod)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              {prod.active ? (
                                <button
                                  type="button"
                                  onClick={() => setDeactivatingProductId(prod.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Desativar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleReactivateProduct(prod.id)}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                                  title="Reativar"
                                >
                                  <RefreshCw className="h-4 w-4 animate-spin-hover" />
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product CRUD Dialog Modal Overlay */}
          {isFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div onClick={() => setIsFormOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"></div>
              
              <form 
                onSubmit={handleSaveProduct}
                className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full relative z-10 p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto animate-slide-in"
              >
                <h3 className="font-display font-extrabold text-lg text-slate-900">
                  {editingProduct ? "Editar Produto" : "Adicionar Produto"}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nome do Suplemento *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 100% Pure Whey (900g) - Morango"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Marca Fabricante *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Max Titanium"
                      value={prodBrand}
                      onChange={(e) => setProdBrand(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Categoria *</label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    >
                      <option value="Proteínas">Proteínas</option>
                      <option value="Aminoácidos">Aminoácidos</option>
                      <option value="Pré-Treino">Pré-Treino</option>
                      <option value="Vitaminas">Vitaminas</option>
                      <option value="Termogênicos">Termogênicos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Preço (BRL) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="149.90"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estoque Atual *</label>
                    <input
                      type="number"
                      required
                      placeholder="50"
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nível Alerta Estoque Baixo *</label>
                    <input
                      type="number"
                      required
                      placeholder="5"
                      value={prodAlertLevel}
                      onChange={(e) => setProdAlertLevel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-150 pb-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Imagem do Produto *</label>
                      <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setImageSourceTab("url")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                            imageSourceTab === "url"
                              ? "bg-white text-slate-800 shadow-xs"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          <LinkIcon className="h-3 w-3" />
                          Via Link URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageSourceTab("upload")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                            imageSourceTab === "upload"
                              ? "bg-white text-slate-800 shadow-xs"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          <Upload className="h-3 w-3" />
                          Upload Local
                        </button>
                      </div>
                    </div>

                    {imageSourceTab === "url" ? (
                      <div className="space-y-2 animate-fade-in">
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/photo-..."
                          value={prodImageUrl.startsWith("data:image/") ? "" : prodImageUrl}
                          onChange={(e) => setProdImageUrl(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                        />
                        {prodImageUrl && !prodImageUrl.startsWith("data:image/") && (
                          <div className="flex items-center gap-2 bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/30">
                            <img src={prodImageUrl} alt="Pré-visualização" className="h-10 w-10 object-contain rounded bg-white border border-slate-100 p-0.5" />
                            <span className="text-[11px] text-emerald-800 font-medium">Link válido e pré-visualização carregada!</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 animate-fade-in">
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              if (!file.type.startsWith("image/")) {
                                alert("Por favor, selecione apenas arquivos de imagem.");
                                return;
                              }
                              if (file.size > 5 * 1024 * 1024) {
                                alert("A imagem é muito grande. O limite máximo é de 5MB.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === "string") {
                                  setProdImageUrl(reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                            isDragging
                              ? "border-emerald-500 bg-emerald-50/20"
                              : prodImageUrl.startsWith("data:image/")
                              ? "border-emerald-200 bg-slate-50"
                              : "border-slate-200 hover:border-slate-300 bg-slate-50"
                          }`}
                          onClick={() => document.getElementById("file-upload-input")?.click()}
                        >
                          <input
                            type="file"
                            id="file-upload-input"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 5 * 1024 * 1024) {
                                  alert("A imagem é muito grande. O limite máximo é de 5MB.");
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  if (typeof reader.result === "string") {
                                    setProdImageUrl(reader.result);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />

                          {prodImageUrl.startsWith("data:image/") ? (
                            <div className="flex flex-col items-center gap-2">
                              <img
                                src={prodImageUrl}
                                alt="Imagem Carregada"
                                className="h-16 w-16 object-contain rounded bg-white border border-slate-150 p-1 shadow-xs mx-auto"
                              />
                              <div className="text-xs text-slate-800 font-bold">Imagem carregada com sucesso!</div>
                              <div className="text-[10px] text-slate-400">Clique ou arraste outro arquivo para alterar</div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProdImageUrl("");
                                }}
                                className="text-[10px] text-red-600 hover:text-red-700 font-bold underline cursor-pointer mt-1"
                              >
                                Remover imagem
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 py-2">
                              <div className="p-2 bg-white rounded-full shadow-xs border border-slate-100 mx-auto">
                                <Upload className="h-4 w-4 text-slate-400" />
                              </div>
                              <div className="text-xs text-slate-700 font-semibold">
                                <span className="text-emerald-600 font-bold">Clique para fazer upload</span> ou arraste a imagem aqui
                              </div>
                              <div className="text-[10px] text-slate-400">Suporta PNG, JPG, GIF e WEBP (Máx: 5MB)</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descrição Comercial do Produto</label>
                    <textarea
                      rows={4}
                      placeholder="Descreva o suplemento, seus principais ingredientes e recomendações de uso..."
                      value={prodDescription}
                      onChange={(e) => setProdDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    ></textarea>
                  </div>

                  {editingProduct && (
                    <div className="sm:col-span-2 flex items-center gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <input
                        type="checkbox"
                        id="prodActive"
                        checked={prodActive}
                        onChange={(e) => setProdActive(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-200 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="prodActive" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                        Produto Ativo (Disponível para venda e visível no catálogo)
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="border border-slate-200 bg-white text-slate-500 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-6 py-2.5 rounded-xl cursor-pointer"
                  >
                    Salvar Produto
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 3: PEDIDOS (ORDER STATUS ADMINISTRATOR)
          ---------------------------------------------------- */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">Gerenciamento de Vendas & Pedidos</h2>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-extrabold uppercase tracking-widest">
                    <th className="p-4 sm:p-5">Pedido ID</th>
                    <th className="p-4">Data</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Pagamento</th>
                    <th className="p-4">Status do Envio</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/20">
                      <td className="p-4 sm:p-5 font-mono font-bold text-slate-900">{order.id}</td>
                      <td className="p-4">{new Date(order.createdAt).toLocaleDateString("pt-BR")}</td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{order.userName}</p>
                        <p className="text-[10px] text-slate-400">CEP: {order.shippingAddress.zipCode}</p>
                      </td>
                      <td className="p-4 font-bold text-slate-900">R$ {order.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="p-4">
                        <span className="text-[10px] font-semibold uppercase">{order.paymentMethod}</span>
                      </td>
                      <td className="p-4">
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          className={`border rounded-lg text-xs font-bold px-2 py-1 focus:outline-hidden ${
                            order.status === "pending" ? "bg-amber-50 text-amber-600 border-amber-200" :
                            order.status === "paid" ? "bg-indigo-50 text-indigo-600 border-indigo-200" :
                            order.status === "shipped" ? "bg-sky-50 text-sky-600 border-sky-200" :
                            order.status === "delivered" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                            "bg-rose-50 text-rose-600 border-rose-200"
                          }`}
                        >
                          <option value="pending">Pendente</option>
                          <option value="paid">Pago</option>
                          <option value="shipped">Enviado</option>
                          <option value="delivered">Entregue</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </td>
                      <td className="p-4 text-center">
                        {deletingOrderId === order.id ? (
                          <div className="flex items-center justify-center gap-1.5 min-w-[90px]">
                            <span className="text-[9px] text-rose-600 font-bold animate-pulse">Excluir?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order.id)}
                              className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer shadow-xs"
                              title="Confirmar exclusão"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingOrderId(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer"
                              title="Cancelar"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingOrderId(order.id)}
                            title="Excluir Pedido"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 4: ESTOQUE (INVENTORY MOVEMENTS LOG LEDGER)
          ---------------------------------------------------- */}
      {activeTab === "stock" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Lançar Entrada/Saída Form */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-4">
                <h3 className="font-display font-extrabold text-base text-slate-900 tracking-tight">Lançar Entrada / Saída</h3>
                <p className="text-[11px] text-slate-400">Registre novas entradas ou saídas de itens no estoque com justificativa.</p>

                <form onSubmit={handlePostStockMovement} className="space-y-4">
                  {movError && (
                    <div className="bg-rose-50 text-rose-800 text-xs p-3 rounded-xl border border-rose-100">
                      {movError}
                    </div>
                  )}

                  {movSuccess && (
                    <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-xl border border-emerald-100">
                      {movSuccess}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Produto *</label>
                    <select
                      value={movProductId}
                      onChange={(e) => setMovProductId(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    >
                      <option value="">Selecione um suplemento...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.stock} un. atual)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Operação *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMovType("in")}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          movType === "in"
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs"
                            : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        Entrada (+)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMovType("out")}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          movType === "out"
                            ? "bg-rose-50 border-rose-500 text-rose-700 shadow-xs"
                            : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        Saída (-)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Quantidade *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Ex: 10"
                      value={movQuantity}
                      onChange={(e) => setMovQuantity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Motivo / Justificativa *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Compra com fornecedor, ajuste de avaria..."
                      value={movReason}
                      onChange={(e) => setMovReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Lançar Movimentação
                  </button>
                </form>
              </div>
            </div>

            {/* Existing Stock Movements History Table */}
            <div className="lg:col-span-8 space-y-4">
              <h3 className="font-display font-extrabold text-base text-slate-900 tracking-tight">Histórico de Lançamentos</h3>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-extrabold uppercase tracking-widest">
                        <th className="p-4 sm:p-5">Data / Hora</th>
                        <th className="p-4">Suplemento</th>
                        <th className="p-4">Operação</th>
                        <th className="p-4 text-center">Quantidade</th>
                        <th className="p-4">Justificativa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                      {movements.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center p-8 text-slate-400">Nenhuma movimentação registrada.</td>
                        </tr>
                      ) : (
                        movements.map((mov) => (
                          <tr key={mov.id} className="hover:bg-slate-50/20">
                            <td className="p-4 sm:p-5 font-mono text-[10px] whitespace-nowrap">{new Date(mov.date).toLocaleString("pt-BR")}</td>
                            <td className="p-4 font-bold text-slate-800">{mov.productName}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                mov.type === "in" 
                                  ? "bg-emerald-50 text-emerald-600" 
                                  : "bg-rose-50 text-rose-600"
                              }`}>
                                {mov.type === "in" ? "Entrada (+)" : "Saída (-)"}
                              </span>
                            </td>
                            <td className="p-4 text-center font-bold text-slate-800">{mov.quantity} un.</td>
                            <td className="p-4 italic text-slate-500">{mov.reason}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 5: SUPORTE CHAT (TICKET RESOLUTION BOARD)
          ---------------------------------------------------- */}
      {activeTab === "tickets" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Ticket lists */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">Atendimentos ao Cliente</h2>
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2">
              {tickets.length === 0 ? (
                <p className="text-slate-400 text-xs py-12 text-center bg-white border rounded-2xl">Nenhum chamado de cliente.</p>
              ) : (
                tickets.map((t) => (
                  <div 
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedTicketId === t.id 
                        ? "bg-slate-900 text-white border-slate-900 shadow-lg" 
                        : "bg-white text-slate-800 border-slate-100 hover:border-slate-200 shadow-xs"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-[10px] font-semibold">ID: {t.id}</span>
                      <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        t.status === "open" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                      }`}>
                        {t.status === "open" ? "Pendente" : "Respondido"}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold truncate leading-snug">{t.subject}</h4>
                    <p className={`text-[10px] truncate mt-1 ${selectedTicketId === t.id ? "text-slate-350" : "text-slate-400"}`}>De: {t.name} ({t.email})</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Resolution Panel */}
          <div className="lg:col-span-7">
            {selectedTicketId && activeTicket ? (
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs h-[540px] flex flex-col justify-between fade-in">
                {/* Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-extrabold text-slate-800 text-sm leading-tight">{activeTicket.subject}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Cliente: {activeTicket.name} ({activeTicket.email})</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                    activeTicket.status === "open" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    {activeTicket.status === "open" ? "Requer Resposta" : "Resolvido"}
                  </span>
                </div>

                {/* Dialog log */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Initial description */}
                  <div className="flex flex-col items-start">
                    <div className="bg-slate-100 text-slate-800 p-4 rounded-2xl rounded-tl-none max-w-md text-xs leading-relaxed">
                      <p className="font-bold mb-1">Dúvida Original:</p>
                      <p>{activeTicket.message}</p>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">{new Date(activeTicket.createdAt).toLocaleString("pt-BR")}</span>
                  </div>

                  {/* Replies history */}
                  {activeTicket.replies.map((rep) => {
                    const isAdmin = rep.sender === "support";
                    return (
                      <div key={rep.id} className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                        <div className={`p-4 max-w-md text-xs leading-relaxed rounded-2xl ${
                          isAdmin 
                            ? "bg-slate-900 text-white rounded-tr-none shadow-sm" 
                            : "bg-slate-100 text-slate-800 rounded-tl-none"
                        }`}>
                          <p>{rep.message}</p>
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1">
                          {isAdmin ? "Respondido por Você • " : "Cliente • "}
                          {new Date(rep.date).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Box Footer */}
                <form onSubmit={handleSendTicketReply} className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Escreva uma resposta oficial de suporte..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 bg-white border border-slate-100 text-slate-800 text-xs rounded-xl px-4 py-2.5 focus:outline-emerald-500"
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl cursor-pointer flex items-center justify-center shrink-0"
                    title="Enviar Resposta"
                  >
                    <Check className="h-4.5 w-4.5" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400 h-[540px] flex flex-col items-center justify-center">
                <HelpCircle className="h-10 w-10 text-slate-300 mb-4" />
                <h3 className="font-display font-bold text-slate-700 text-base">Nenhum chamado selecionado</h3>
                <p className="text-xs max-w-[240px] mt-1 text-slate-400">Selecione um ticket de atendimento na lateral esquerda para responder e prestar suporte ao seu cliente.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
