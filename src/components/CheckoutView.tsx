import { useState, useEffect, FormEvent, useRef } from "react";
import { CreditCard, QrCode, Ticket, CheckCircle, ArrowLeft, Truck, AlertTriangle, ShieldCheck, Copy, Check } from "lucide-react";
import { Product, Address, Coupon, Order } from "../types";
import { api } from "../utils/api";

interface CheckoutViewProps {
  cartItems: { product: Product; quantity: number }[];
  user: any;
  onSuccess: (order: Order) => void;
  onBack: () => void;
  onClearCart: () => void;
}

export default function CheckoutView({
  cartItems,
  user,
  onSuccess,
  onBack,
  onClearCart,
}: CheckoutViewProps) {
  // Stepper/State
  const [address, setAddress] = useState<Address>({
    street: user?.address?.street || "",
    number: user?.address?.number || "",
    complement: user?.address?.complement || "",
    neighborhood: user?.address?.neighborhood || "",
    city: user?.address?.city || "",
    state: user?.address?.state || "",
    zipCode: user?.address?.zipCode || "",
  });

  const numberInputRef = useRef<HTMLInputElement>(null);

  const handleCepChange = async (val: string) => {
    const raw = val.replace(/\D/g, "");
    const formatted = raw.replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9);
    
    setAddress((prev) => ({ ...prev, zipCode: formatted }));
    
    if (raw.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        if (response.ok) {
          const data = await response.json();
          if (!data.erro) {
            setAddress((prev) => ({
              ...prev,
              street: data.logradouro || "",
              neighborhood: data.bairro || "",
              city: data.localidade || "",
              state: data.uf || "",
            }));
            setTimeout(() => {
              numberInputRef.current?.focus();
            }, 50);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };

  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card" | "mercado_pago">("pix");
  
  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // Credit Card Form
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardBrand, setCardBrand] = useState("Visa");

  // General Status
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");

  // Post-purchase simulation screen
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [payingOrder, setPayingOrder] = useState(false);

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const isFreeShipping = subtotal >= 199 || appliedCoupon?.code === "FRETEGRATIS";
  const shippingCost = isFreeShipping ? 0 : 15.00;

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === "percentage") {
      discountAmount = Number(((subtotal * appliedCoupon.value) / 100).toFixed(2));
    } else {
      discountAmount = appliedCoupon.value;
    }
  }

  const total = Number((subtotal + shippingCost - discountAmount).toFixed(2));

  // Handle saved address select
  const handleSelectSavedAddress = (saved: Address) => {
    setAddress({ ...saved });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      setCouponLoading(true);
      setCouponError("");
      const coupon = await api.applyCoupon(couponCode, subtotal);
      setAppliedCoupon(coupon);
    } catch (err: any) {
      setCouponError(err.message || "Erro ao aplicar cupom.");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const handlePlaceOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!address.street || !address.number || !address.neighborhood || !address.city || !address.state || !address.zipCode) {
      setOrderError("Por favor, preencha todos os campos obrigatórios do endereço de entrega.");
      return;
    }

    if (paymentMethod === "credit_card") {
      if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
        setOrderError("Por favor, preencha todas as informações do cartão de crédito.");
        return;
      }
    }

    try {
      setPlacingOrder(true);
      setOrderError("");

      const itemsPayload = cartItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      const orderData = {
        items: itemsPayload,
        paymentMethod,
        shippingAddress: address,
        couponCode: appliedCoupon?.code,
        shippingCost,
        cardBrand: paymentMethod === "credit_card" ? cardBrand : undefined,
        lastFour: paymentMethod === "credit_card" ? cardNumber.slice(-4) : undefined,
      };

      const order = await api.createOrder(orderData);
      setCreatedOrder(order);
      onClearCart(); // Empty client cart state on successful creation
    } catch (err: any) {
      setOrderError(err.message || "Falha ao finalizar o pedido.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleCopyPix = () => {
    if (!createdOrder?.paymentDetails?.qrCodeCopyPaste) return;
    navigator.clipboard.writeText(createdOrder.paymentDetails.qrCodeCopyPaste);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleSimulatePayment = async () => {
    if (!createdOrder) return;
    try {
      setPayingOrder(true);
      const paid = await api.payOrder(createdOrder.id);
      setCreatedOrder(paid);
    } catch (err: any) {
      alert(err.message || "Falha ao simular pagamento.");
    } finally {
      setPayingOrder(false);
    }
  };

  // ----------------------------------------------------
  // Post-Purchase Simulation Screens
  // ----------------------------------------------------
  if (createdOrder) {
    const isPaid = createdOrder.status === "paid";

    return (
      <div className="max-w-3xl mx-auto px-4 py-12 fade-in">
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-xl text-center flex flex-col items-center">
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-full mb-6">
            <CheckCircle className="h-12 w-12 animate-bounce" />
          </div>

          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 mb-2">
            Pedido Criado com Sucesso!
          </h1>
          <p className="text-slate-400 text-sm mb-6 font-semibold">
            Número do Pedido: <span className="text-slate-800 text-mono">{createdOrder.id}</span>
          </p>

          {/* Payment simulations details */}
          {createdOrder.paymentMethod === "pix" && !isPaid && (
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 w-full max-w-md space-y-6 mb-8 text-left">
              <div className="flex items-center gap-2 mb-2 justify-center">
                <QrCode className="h-5 w-5 text-emerald-600" />
                <h3 className="font-display font-bold text-slate-800 text-center">Pagamento via PIX</h3>
              </div>

              {/* Mock QR Code Generation */}
              <div className="flex justify-center bg-white p-4 rounded-xl border border-slate-100 w-44 h-44 mx-auto shadow-xs">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(createdOrder.paymentDetails?.qrCodeCopyPaste || "")}`} 
                  alt="QR Code de Pagamento PIX"
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Copia e Cola</p>
                <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-100 p-2 text-xs text-slate-600">
                  <span className="truncate flex-1 font-mono">{createdOrder.paymentDetails?.qrCodeCopyPaste}</span>
                  <button 
                    onClick={handleCopyPix}
                    className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md shrink-0 transition-colors"
                  >
                    {copiedPix ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSimulatePayment}
                  disabled={payingOrder}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-3.5 rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="h-4.5 w-4.5" />
                  {payingOrder ? "Processando..." : "Simular Pagamento PIX"}
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-2 italic">
                  Clique no botão para simular a resposta automática do banco.
                </p>
              </div>
            </div>
          )}

          {createdOrder.paymentMethod === "mercado_pago" && !isPaid && (
            <div className="bg-sky-50 rounded-2xl border border-sky-100 p-6 w-full max-w-md space-y-6 mb-8 text-left">
              <div className="text-center">
                <p className="text-xs font-bold text-sky-800 uppercase tracking-wider mb-1">Integração Mercado Pago</p>
                <h3 className="font-display font-bold text-slate-800 text-base">Portal de Pagamentos Seguro</h3>
              </div>

              <div className="bg-white rounded-xl border border-slate-100 p-4 text-xs text-slate-600 space-y-2">
                <p><strong>Beneficiário:</strong> ForteFit Suplementos Ltda.</p>
                <p><strong>Valor Total:</strong> R$ {createdOrder.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                <p><strong>ID da Preferência:</strong> <span className="font-mono">{createdOrder.paymentDetails?.mpPreferenceId}</span></p>
              </div>

              <button
                onClick={handleSimulatePayment}
                disabled={payingOrder}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold py-3.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                Pagar com Mercado Pago (Simulação)
              </button>
            </div>
          )}

          {isPaid && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 w-full max-w-md space-y-2 mb-8">
              <p className="text-emerald-800 font-bold text-base">✓ Pagamento Confirmado!</p>
              <p className="text-slate-600 text-xs leading-relaxed">
                Nós já identificamos o seu pagamento. Suas cápsulas e suplementos já estão sendo separados e preparados para envio!
              </p>
              <div className="text-left bg-white p-4 rounded-xl border border-slate-100 text-xs text-slate-500 mt-4 space-y-1">
                <p><strong>Data de aprovação:</strong> {new Date(createdOrder.paymentDate || "").toLocaleString("pt-BR")}</p>
                <p><strong>Entrega estimada:</strong> Em até 3 dias úteis para {createdOrder.shippingAddress.city}-{createdOrder.shippingAddress.state}.</p>
              </div>
            </div>
          )}

          {/* Core summary specs */}
          <div className="border-t border-slate-100 pt-6 w-full space-y-4 text-left text-sm max-w-md">
            <h4 className="font-display font-bold text-slate-800 text-sm">Resumo da Entrega</h4>
            <div className="text-slate-500 text-xs space-y-1 bg-slate-50 p-4 rounded-xl">
              <p><strong>Destinatário:</strong> {user?.name || "Cliente ForteFit"}</p>
              <p><strong>Endereço:</strong> {createdOrder.shippingAddress.street}, {createdOrder.shippingAddress.number} {createdOrder.shippingAddress.complement && `- ${createdOrder.shippingAddress.complement}`}</p>
              <p><strong>Bairro:</strong> {createdOrder.shippingAddress.neighborhood}</p>
              <p><strong>Cidade:</strong> {createdOrder.shippingAddress.city} - {createdOrder.shippingAddress.state} • CEP: {createdOrder.shippingAddress.zipCode}</p>
            </div>
          </div>

          <div className="flex gap-4 w-full max-w-md mt-8">
            <button
              onClick={() => onSuccess(createdOrder)}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-xl transition-all text-sm shadow-sm cursor-pointer"
            >
              Acompanhar Pedido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      {/* Top row */}
      <div className="flex items-center gap-2 mb-8 cursor-pointer text-slate-500 hover:text-emerald-600 font-semibold text-sm transition-colors" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
        Voltar para a Loja
      </div>

      <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight leading-tight mb-8">
        Finalizar Compra
      </h1>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column - Forms */}
        <div className="lg:col-span-8 space-y-6">
          {/* Address Block */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs">
            <h2 className="font-display font-extrabold text-lg text-slate-800 mb-6 flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-600 h-8 w-8 flex items-center justify-center rounded-lg text-xs font-bold">1</span>
              Endereço de Entrega
            </h2>

            {/* Saved addresses selector */}
            {user?.savedAddresses && user.savedAddresses.length > 0 && (
              <div className="mb-6 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selecione um endereço salvo</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {user.savedAddresses.map((saved: Address, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectSavedAddress(saved)}
                      className="text-left p-3.5 rounded-xl border border-slate-100 hover:border-emerald-500/30 bg-slate-50/50 hover:bg-emerald-50/10 text-xs transition-all"
                    >
                      <p className="font-bold text-slate-700">{saved.street}, {saved.number}</p>
                      <p className="text-slate-400">{saved.neighborhood} - {saved.city}/{saved.state}</p>
                      <p className="text-slate-400 mt-1">CEP: {saved.zipCode}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">CEP *</label>
                <input
                  type="text"
                  required
                  placeholder="01310-100"
                  value={address.zipCode}
                  onChange={(e) => handleCepChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Logradouro / Rua *</label>
                <input
                  type="text"
                  required
                  placeholder="Avenida Paulista"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Número *</label>
                <input
                  type="text"
                  ref={numberInputRef}
                  required
                  placeholder="1000"
                  value={address.number}
                  onChange={(e) => setAddress({ ...address, number: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Complemento</label>
                <input
                  type="text"
                  placeholder="Apto 52"
                  value={address.complement}
                  onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bairro *</label>
                <input
                  type="text"
                  required
                  placeholder="Bela Vista"
                  value={address.neighborhood}
                  onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cidade *</label>
                <input
                  type="text"
                  required
                  placeholder="São Paulo"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">UF *</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  placeholder="SP"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all text-center"
                />
              </div>
            </div>
          </div>

          {/* Payment Block */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs">
            <h2 className="font-display font-extrabold text-lg text-slate-800 mb-6 flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-600 h-8 w-8 flex items-center justify-center rounded-lg text-xs font-bold">2</span>
              Método de Pagamento
            </h2>

            {/* Selection row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <button
                type="button"
                onClick={() => setPaymentMethod("pix")}
                className={`flex flex-col items-center p-4 rounded-2xl border transition-all text-center ${
                  paymentMethod === "pix"
                    ? "bg-emerald-50/10 border-emerald-500 text-emerald-700"
                    : "border-slate-100 hover:border-slate-200 text-slate-500 bg-slate-50/50"
                }`}
              >
                <QrCode className="h-5 w-5 mb-2" />
                <span className="text-xs font-bold">Pague com PIX</span>
                <span className="text-[10px] text-emerald-600 font-bold mt-1">Aprovação Imediata</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("credit_card")}
                className={`flex flex-col items-center p-4 rounded-2xl border transition-all text-center ${
                  paymentMethod === "credit_card"
                    ? "bg-emerald-50/10 border-emerald-500 text-emerald-700"
                    : "border-slate-100 hover:border-slate-200 text-slate-500 bg-slate-50/50"
                }`}
              >
                <CreditCard className="h-5 w-5 mb-2" />
                <span className="text-xs font-bold">Cartão de Crédito</span>
                <span className="text-[10px] text-slate-400 mt-1">Até 6x Sem Juros</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("mercado_pago")}
                className={`flex flex-col items-center p-4 rounded-2xl border transition-all text-center ${
                  paymentMethod === "mercado_pago"
                    ? "bg-emerald-50/10 border-emerald-500 text-emerald-700"
                    : "border-slate-100 hover:border-slate-200 text-slate-500 bg-slate-50/50"
                }`}
              >
                <div className="bg-sky-500 text-white rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase leading-none mb-2.5">MP</div>
                <span className="text-xs font-bold">Mercado Pago</span>
                <span className="text-[10px] text-sky-500 font-bold mt-1">Boleto, Pix, Cartões</span>
              </button>
            </div>

            {/* Condition payment details input fields */}
            {paymentMethod === "credit_card" && (
              <div className="space-y-4 border-t border-slate-50 pt-6 fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bandeira do Cartão</label>
                    <select
                      value={cardBrand}
                      onChange={(e) => setCardBrand(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    >
                      <option value="Visa">Visa</option>
                      <option value="MasterCard">MasterCard</option>
                      <option value="Elo">Elo</option>
                      <option value="AmericanExpress">American Express</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Número do Cartão *</label>
                    <input
                      type="text"
                      required
                      placeholder="4444 5555 6666 7777"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nome impresso no Cartão *</label>
                    <input
                      type="text"
                      required
                      placeholder="FULANO DE TAL SILVA"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Validade *</label>
                    <input
                      type="text"
                      required
                      placeholder="MM/AA"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Código de Segurança (CVV) *</label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "pix" && (
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 text-xs text-slate-500 flex gap-2.5 items-start fade-in">
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  Ao selecionar PIX, o pedido será criado e você poderá escanear o QR Code gerado instantaneamente na tela seguinte ou copiar o código Copia-e-Cola para aprovação imediata do banco.
                </p>
              </div>
            )}

            {paymentMethod === "mercado_pago" && (
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 text-xs text-slate-500 flex gap-2.5 items-start fade-in">
                <ShieldCheck className="h-4.5 w-4.5 text-sky-500 shrink-0 mt-0.5" />
                <p>
                  Pagamento protegido e garantido pela API Oficial do Mercado Pago. Na próxima página, você será guiado a um checkout simulado do gateway para aprovação.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right column - Summary panel */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm sticky top-24 space-y-6">
            <h3 className="font-display font-extrabold text-lg text-slate-800 flex items-center gap-1.5">
              Resumo do Pedido
            </h3>

            {/* Mini Cart lists */}
            <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto pr-2 space-y-3">
              {cartItems.map((item) => (
                <div key={item.product.id} className="flex gap-3 py-3 first:pt-0">
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="h-12 w-12 object-contain bg-slate-50 p-1.5 rounded-lg border border-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate leading-snug">{item.product.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{item.quantity}x de R$ {item.product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <p className="text-xs font-extrabold text-slate-850 shrink-0">
                    R$ {(item.product.price * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>

            {/* Coupon Application Box */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cupom de Desconto</label>
              
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-2 rounded-xl text-xs">
                  <div className="flex items-center gap-1.5">
                    <Ticket className="h-4 w-4" />
                    <span><strong>{appliedCoupon.code}</strong> aplicado!</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleRemoveCoupon}
                    className="text-emerald-700 font-bold hover:text-red-500"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="FORTE10"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-slate-50 border border-slate-100 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:bg-white focus:outline-emerald-500 transition-all uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    {couponLoading ? "..." : "Aplicar"}
                  </button>
                </div>
              )}
              {couponError && <p className="text-[10px] text-rose-500 font-semibold mt-1">{couponError}</p>}
            </div>

            {/* Financial Calculations */}
            <div className="space-y-2 text-xs text-slate-500 border-t border-slate-100 pt-4">
              <div className="flex justify-between">
                <span>Subtotal dos produtos</span>
                <span className="font-semibold text-slate-700">R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  Frete
                  {isFreeShipping && <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-1 py-0.5 rounded">Grátis</span>}
                </span>
                <span className="font-semibold text-slate-700">
                  {shippingCost === 0 ? "Grátis" : `R$ ${shippingCost.toFixed(2)}`}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Desconto aplicado</span>
                  <span>- R$ {discountAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              
              <div className="flex justify-between border-t border-slate-100 pt-4 items-baseline">
                <span className="font-display font-bold text-slate-800 text-sm">Total do Pedido</span>
                <span className="font-display font-extrabold text-2xl text-emerald-600 tracking-tight">
                  R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {orderError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl text-xs font-semibold flex items-start gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{orderError}</p>
              </div>
            )}

            {/* Place Order CTA */}
            <button
              type="submit"
              disabled={placingOrder}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 py-4 rounded-xl shadow-lg shadow-emerald-600/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="h-5 w-5" />
              {placingOrder ? "Finalizando Compra..." : "Finalizar Pedido de Compra"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
