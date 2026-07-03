import { useState, useEffect, FormEvent, useRef } from "react";
import { User, Order, Ticket, Address } from "../types";
import { ClipboardList, LifeBuoy, MapPin, Settings, AlertCircle, RefreshCw, Send, ArrowRight, MessageSquare, Trash2 } from "lucide-react";
import { api } from "../utils/api";

interface CustomerDashboardProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

export default function CustomerDashboard({ user, onUpdateUser }: CustomerDashboardProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "addresses" | "tickets" | "profile">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  
  // Loading states
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Expanded order ID
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // Expanded ticket ID for chatting
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  // Create ticket states
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);

  // Profile fields
  const [profileName, setProfileName] = useState(user.name);
  const [addressStreet, setAddressStreet] = useState(user.address?.street || "");
  const [addressNumber, setAddressNumber] = useState(user.address?.number || "");
  const [addressComplement, setAddressComplement] = useState(user.address?.complement || "");
  const [addressNeighborhood, setAddressNeighborhood] = useState(user.address?.neighborhood || "");
  const [addressCity, setAddressCity] = useState(user.address?.city || "");
  const [addressState, setAddressState] = useState(user.address?.state || "");
  const [addressZip, setAddressZip] = useState(user.address?.zipCode || "");

  const profileNumberInputRef = useRef<HTMLInputElement>(null);

  const handleProfileCepChange = async (val: string) => {
    const raw = val.replace(/\D/g, "");
    const formatted = raw.replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9);
    
    setAddressZip(formatted);
    
    if (raw.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        if (response.ok) {
          const data = await response.json();
          if (!data.erro) {
            setAddressStreet(data.logradouro || "");
            setAddressNeighborhood(data.bairro || "");
            setAddressCity(data.localidade || "");
            setAddressState(data.uf || "");
            setTimeout(() => {
              profileNumberInputRef.current?.focus();
            }, 50);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const data = await api.getOrders();
      setOrders(data);
    } catch (err) {
      console.error("Erro ao carregar pedidos:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await api.deleteOrder(orderId);
      fetchOrders();
      setExpandedOrderId(null);
      setDeletingOrderId(null);
    } catch (err: any) {
      alert(err.message || "Erro ao excluir o pedido.");
    }
  };

  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);
      const data = await api.getTickets();
      setTickets(data);
    } catch (err) {
      console.error("Erro ao carregar tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchTickets();
  }, [user]);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      
      const updatedAddress: Address = {
        street: addressStreet,
        number: addressNumber,
        complement: addressComplement,
        neighborhood: addressNeighborhood,
        city: addressCity,
        state: addressState,
        zipCode: addressZip
      };

      const payload = {
        name: profileName,
        address: updatedAddress,
        savedAddresses: user.savedAddresses?.length ? user.savedAddresses : [updatedAddress]
      };

      const updatedUser = await api.updateProfile(payload);
      onUpdateUser(updatedUser);
      alert("Cadastro atualizado com sucesso!");
    } catch (err: any) {
      alert(err.message || "Erro ao salvar perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    try {
      setCreatingTicket(true);
      const newTicket = await api.createTicket({
        subject: ticketSubject,
        message: ticketMessage
      });
      setTickets([newTicket, ...tickets]);
      setTicketSubject("");
      setTicketMessage("");
      setShowNewTicketForm(false);
      setSelectedTicketId(newTicket.id);
    } catch (err: any) {
      alert(err.message || "Erro ao abrir chamado de suporte.");
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleSendTicketReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyMessage.trim()) return;

    try {
      const updated = await api.replyTicket(selectedTicketId, replyMessage);
      setTickets(tickets.map(t => t.id === selectedTicketId ? updated : t));
      setReplyMessage("");
    } catch (err: any) {
      alert(err.message || "Erro ao enviar resposta.");
    }
  };

  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  // Status mapping to label and style
  const getStatusDetails = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return { label: "Aguardando Pagamento", color: "bg-amber-50 text-amber-600 border-amber-200", step: 1 };
      case "paid":
        return { label: "Pago - Separando Suplementos", color: "bg-indigo-50 text-indigo-600 border-indigo-200", step: 2 };
      case "shipped":
        return { label: "Enviado - Em Transporte", color: "bg-sky-50 text-sky-600 border-sky-200", step: 3 };
      case "delivered":
        return { label: "Entregue com Sucesso", color: "bg-emerald-50 text-emerald-600 border-emerald-200", step: 4 };
      case "cancelled":
        return { label: "Cancelado / Estornado", color: "bg-rose-50 text-rose-600 border-rose-200", step: 0 };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      {/* Visual profile header card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 mb-10 shadow-xl border border-slate-850">
        <div>
          <span className="bg-emerald-500 text-slate-950 font-bold uppercase text-[10px] tracking-wider px-3 py-1 rounded-md mb-2 inline-block">
            {user.role === "admin" ? "Administrador" : "Cliente ForteFit"}
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight leading-none mb-1">
            Olá, {user.name}!
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">{user.email} • Membro desde {new Date(user.createdAt).toLocaleDateString("pt-BR")}</p>
        </div>

        <div className="flex gap-2">
          {user.role === "admin" && (
            <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-2 font-semibold">
              Sessão Administrativa Liberada
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation panel */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-1.5 shadow-xs sticky top-24">
            <button
              onClick={() => { setActiveTab("orders"); setSelectedTicketId(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "orders" ? "bg-emerald-50 text-emerald-600" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <ClipboardList className="h-4.5 w-4.5" />
              Histórico de Pedidos
            </button>

            <button
              onClick={() => { setActiveTab("tickets"); setShowNewTicketForm(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "tickets" ? "bg-emerald-50 text-emerald-600" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <LifeBuoy className="h-4.5 w-4.5" />
              Suporte & Chamados
            </button>

            <button
              onClick={() => { setActiveTab("addresses"); setSelectedTicketId(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "addresses" ? "bg-emerald-50 text-emerald-600" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <MapPin className="h-4.5 w-4.5" />
              Endereços Salvos
            </button>

            <button
              onClick={() => { setActiveTab("profile"); setSelectedTicketId(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "profile" ? "bg-emerald-50 text-emerald-600" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Settings className="h-4.5 w-4.5" />
              Meus Dados
            </button>
          </div>
        </div>

        {/* Dynamic Panel Content */}
        <div className="lg:col-span-9">
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">Seus Pedidos de Compra</h2>
                <button onClick={fetchOrders} title="Recarregar" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {loadingOrders ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-xs font-semibold">Buscando histórico de compras...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
                  <ClipboardList className="h-10 w-10 mx-auto mb-4 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">Você ainda não realizou nenhum pedido.</p>
                  <p className="text-xs mt-1">Visite nosso catálogo e comece a turbinar seus treinos!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const isExpanded = expandedOrderId === order.id;
                    const details = getStatusDetails(order.status);

                    return (
                      <div key={order.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
                        {/* Summary Header block */}
                        <div 
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/40 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-display font-bold text-sm text-slate-900">{order.id}</span>
                              <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${details?.color}`}>
                                {details?.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">Realizado em {new Date(order.createdAt).toLocaleString("pt-BR")}</p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">Total pago</p>
                              <p className="font-display font-extrabold text-base text-slate-900 mt-1">
                                R$ {order.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-emerald-600 hover:underline shrink-0">
                              {isExpanded ? "Fechar detalhes" : "Ver detalhes"}
                            </span>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 p-5 sm:p-6 bg-slate-50/20 space-y-6 fade-in">
                            {/* Visual Timeline progress tracker */}
                            {order.status !== "cancelled" && details && (
                              <div className="space-y-4">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Acompanhamento de Entrega</p>
                                <div className="grid grid-cols-4 gap-2 text-center text-[10px] relative">
                                  {/* Line behind steps */}
                                  <div className="absolute top-2.5 left-[12%] right-[12%] h-1 bg-slate-200 z-0">
                                    <div 
                                      className="bg-emerald-600 h-full transition-all duration-300"
                                      style={{ width: `${((details.step - 1) / 3) * 100}%` }}
                                    ></div>
                                  </div>

                                  {/* Step dots */}
                                  {[
                                    { step: 1, label: "Criado" },
                                    { step: 2, label: "Pago" },
                                    { step: 3, label: "Enviado" },
                                    { step: 4, label: "Entregue" }
                                  ].map((s) => {
                                    const isActive = details.step >= s.step;
                                    return (
                                      <div key={s.step} className="flex flex-col items-center z-10">
                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                          isActive ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25" : "bg-white text-slate-400 border border-slate-200"
                                        }`}>
                                          {s.step}
                                        </div>
                                        <span className={`mt-1.5 font-semibold ${isActive ? "text-slate-800" : "text-slate-400"}`}>{s.label}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Products summary lists */}
                            <div className="space-y-2 border-t border-slate-100 pt-5">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suplementos Inclusos</p>
                              <div className="divide-y divide-slate-100">
                                {order.items.map((item, i) => (
                                  <div key={i} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                      <img src={item.imageUrl} alt={item.name} className="h-10 w-10 object-contain bg-white rounded border p-1" />
                                      <div>
                                        <p className="text-xs font-bold text-slate-800 leading-tight">{item.name}</p>
                                        <p className="text-[10px] text-slate-400 font-semibold">{item.quantity} un. x R$ {item.price.toLocaleString("pt-BR")}</p>
                                      </div>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900">R$ {(item.price * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Address details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-xs text-slate-600">
                              <div>
                                <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1.5">Endereço de Envio</p>
                                <p>{order.shippingAddress.street}, {order.shippingAddress.number} {order.shippingAddress.complement && `- ${order.shippingAddress.complement}`}</p>
                                <p>{order.shippingAddress.neighborhood} - {order.shippingAddress.city}/{order.shippingAddress.state}</p>
                                <p>CEP: {order.shippingAddress.zipCode}</p>
                              </div>

                              <div className="sm:text-right space-y-1">
                                <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1.5 sm:text-right">Resumo Financeiro</p>
                                <p>Subtotal: R$ {order.subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                                <p>Frete: {order.shippingCost === 0 ? "Grátis" : `R$ ${order.shippingCost.toFixed(2)}`}</p>
                                {order.discountAmount > 0 && <p className="text-emerald-600 font-semibold">Cupom Desconto: - R$ {order.discountAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>}
                                <p className="text-sm font-extrabold text-slate-900 pt-1 border-t sm:border-t-0 sm:pt-0">Total Pago: R$ {order.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                              </div>
                            </div>

                            {/* Option to Delete Order */}
                            <div className="border-t border-slate-100 pt-4 flex justify-end">
                              {deletingOrderId === order.id ? (
                                <div className="bg-rose-50 border border-rose-100 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                                  <span className="text-xs text-rose-800 font-bold">Confirma a exclusão permanente deste pedido? Os itens serão devolvidos ao estoque.</span>
                                  <div className="flex gap-2 shrink-0">
                                    <button 
                                      type="button"
                                      onClick={() => handleDeleteOrder(order.id)}
                                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                                    >
                                      Sim, excluir
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => setDeletingOrderId(null)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeletingOrderId(order.id)}
                                  className="border border-rose-200 text-rose-600 hover:bg-rose-50/50 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Excluir Pedido
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "addresses" && (
            <div className="space-y-6">
              <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">Endereços para Envio</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user.address?.street ? (
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs relative">
                    <span className="absolute top-3 right-3 bg-emerald-50 text-emerald-700 font-bold text-[9px] uppercase px-2 py-0.5 rounded">Principal</span>
                    <h3 className="font-display font-bold text-slate-800 text-sm mb-3">Endereço de Entrega</h3>
                    <div className="text-slate-500 text-xs space-y-1">
                      <p><strong>Rua:</strong> {user.address.street}, {user.address.number}</p>
                      {user.address.complement && <p><strong>Complemento:</strong> {user.address.complement}</p>}
                      <p><strong>Bairro:</strong> {user.address.neighborhood}</p>
                      <p><strong>Cidade:</strong> {user.address.city} - {user.address.state}</p>
                      <p><strong>CEP:</strong> {user.address.zipCode}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 sm:col-span-2">
                    <p className="text-sm">Nenhum endereço cadastrado ainda.</p>
                    <p className="text-xs mt-1">Atualize na aba "Meus Dados" para habilitar o preenchimento automático no checkout.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "tickets" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">Suporte Técnico & FAQ</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setShowNewTicketForm(!showNewTicketForm); setSelectedTicketId(null); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    {showNewTicketForm ? "Ver Meus Chamados" : "Abrir Novo Chamado"}
                  </button>
                  <button onClick={fetchTickets} title="Recarregar" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {showNewTicketForm ? (
                <form onSubmit={handleCreateTicket} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4 fade-in">
                  <h3 className="font-display font-bold text-slate-800 text-base mb-2">Relatar um problema / Dúvida técnica</h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assunto / Tópico *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Dúvida sobre dosagem de Whey Protein"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mensagem detalhada *</label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Descreva detalhadamente sua dúvida ou problema com pedido..."
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={creatingTicket}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-6 py-3 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {creatingTicket ? "Abrindo Chamado..." : "Enviar Chamado de Suporte"}
                  </button>
                </form>
              ) : selectedTicketId && activeTicket ? (
                // Chat dialogue with support
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs flex flex-col h-[500px] fade-in">
                  {/* Title Header */}
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                      <button onClick={() => setSelectedTicketId(null)} className="text-xs text-emerald-600 font-bold hover:underline mb-1 flex items-center gap-1">
                        ← Voltar aos chamados
                      </button>
                      <h3 className="font-display font-bold text-slate-800 text-sm max-w-md truncate">{activeTicket.subject}</h3>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border ${
                      activeTicket.status === "open" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    }`}>
                      {activeTicket.status === "open" ? "Aguardando Resposta" : "Respondido"}
                    </span>
                  </div>

                  {/* Messaging logs */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* User initial message */}
                    <div className="flex flex-col items-end">
                      <div className="bg-slate-900 text-white rounded-2xl rounded-tr-none p-4 max-w-md text-xs leading-relaxed">
                        <p>{activeTicket.message}</p>
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1">{new Date(activeTicket.createdAt).toLocaleString("pt-BR")}</span>
                    </div>

                    {/* Replies */}
                    {activeTicket.replies.map((rep) => {
                      const isSupport = rep.sender === "support";
                      return (
                        <div key={rep.id} className={`flex flex-col ${isSupport ? "items-start" : "items-end"}`}>
                          <div className={`p-4 max-w-md text-xs leading-relaxed rounded-2xl ${
                            isSupport 
                              ? "bg-slate-100 text-slate-800 rounded-tl-none" 
                              : "bg-slate-900 text-white rounded-tr-none"
                          }`}>
                            <p>{rep.message}</p>
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1">
                            {isSupport ? "Suporte ForteFit • " : ""}
                            {new Date(rep.date).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Text Input Footer */}
                  <form onSubmit={handleSendTicketReply} className="p-3 border-t border-slate-100 bg-slate-50/50 flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Digite sua mensagem de resposta..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="flex-1 bg-white border border-slate-100 text-slate-800 text-xs rounded-xl px-4 py-2.5 focus:outline-emerald-500"
                    />
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl cursor-pointer"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              ) : (
                // Ticket list block
                <div className="space-y-4">
                  {loadingTickets ? (
                    <div className="py-8 text-center text-slate-400">
                      <div className="w-8 h-8 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-xs font-semibold">Buscando chamados...</p>
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
                      <MessageSquare className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                      <p className="text-xs font-bold text-slate-700">Você não tem nenhum chamado de suporte aberto.</p>
                      <p className="text-[10px] mt-0.5 text-slate-400">Abra um chamado caso tenha dúvidas sobre produtos, entregas ou parcerias!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {tickets.map((t) => (
                        <div 
                          key={t.id} 
                          onClick={() => setSelectedTicketId(t.id)}
                          className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-emerald-500/30 cursor-pointer flex items-center justify-between gap-4 transition-all"
                        >
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 truncate leading-none mb-1.5">{t.subject}</h4>
                            <p className="text-[10px] text-slate-400 truncate max-w-sm">{t.message}</p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                              t.status === "open" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                            }`}>
                              {t.status === "open" ? "Pendente" : "Respondido"}
                            </span>
                            <ArrowRight className="h-4 w-4 text-slate-350" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div className="space-y-6">
              <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">Meus Dados Pessoais</h2>

              <form onSubmit={handleUpdateProfile} className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs space-y-6">
                {/* Profile Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">E-mail (Não editável)</label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full bg-slate-100 border border-slate-100 text-slate-500 text-sm rounded-xl p-3 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Sub-header address */}
                <div className="border-t border-slate-50 pt-6">
                  <h3 className="font-display font-bold text-slate-800 text-base mb-4">Endereço de Faturamento / Entrega</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">CEP</label>
                      <input
                        type="text"
                        placeholder="01310-100"
                        value={addressZip}
                        onChange={(e) => handleProfileCepChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rua / Logradouro</label>
                      <input
                        type="text"
                        placeholder="Avenida Paulista"
                        value={addressStreet}
                        onChange={(e) => setAddressStreet(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Número</label>
                      <input
                        type="text"
                        ref={profileNumberInputRef}
                        placeholder="1000"
                        value={addressNumber}
                        onChange={(e) => setAddressNumber(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Complemento</label>
                      <input
                        type="text"
                        placeholder="Apto 52"
                        value={addressComplement}
                        onChange={(e) => setAddressComplement(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bairro</label>
                      <input
                        type="text"
                        placeholder="Bela Vista"
                        value={addressNeighborhood}
                        onChange={(e) => setAddressNeighborhood(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cidade</label>
                      <input
                        type="text"
                        placeholder="São Paulo"
                        value={addressCity}
                        onChange={(e) => setAddressCity(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">UF</label>
                      <input
                        type="text"
                        maxLength={2}
                        placeholder="SP"
                        value={addressState}
                        onChange={(e) => setAddressState(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-50 pt-6">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-3.5 rounded-xl cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {savingProfile ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
