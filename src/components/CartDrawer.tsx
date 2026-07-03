import { ShoppingBag, X, Trash2, ArrowRight, Truck } from "lucide-react";
import { Product } from "../types";

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const freeShippingThreshold = 199;
  const remainsForFreeShipping = freeShippingThreshold - subtotal;
  const isFreeShipping = remainsForFreeShipping <= 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
      ></div>

      {/* Drawer Container */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white flex flex-col shadow-2xl relative animate-slide-in">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
              <h2 className="font-display font-extrabold text-lg text-slate-900">Seu Carrinho</h2>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Contents */}
          <div className="flex-1 overflow-y-auto py-4 px-6 space-y-4">
            {/* Free Shipping Progress Alert */}
            {cartItems.length > 0 && (
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 flex items-start gap-3">
                <div className={`p-2 rounded-xl ${isFreeShipping ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                  <Truck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 leading-snug">
                    {isFreeShipping 
                      ? "Parabéns! Você ganhou Frete Grátis 🎉" 
                      : `Faltam apenas R$ ${remainsForFreeShipping.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} para Frete Grátis!`
                    }
                  </p>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="bg-slate-50 p-4 rounded-full text-slate-400 mb-4">
                  <ShoppingBag className="h-10 w-10" />
                </div>
                <h3 className="font-display font-bold text-slate-700 text-base">Seu carrinho está vazio</h3>
                <p className="text-slate-400 text-xs max-w-[240px] mt-1 mb-6">Explore nossas categorias e adicione os melhores suplementos do mercado!</p>
                <button 
                  onClick={onClose}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Continuar Comprando
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="flex gap-4 py-4.5 first:pt-0 last:pb-0">
                    {/* Item Image */}
                    <div className="h-20 w-20 bg-slate-50 rounded-xl flex items-center justify-center p-2 shrink-0">
                      <img 
                        src={item.product.imageUrl} 
                        alt={item.product.name} 
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-slate-800 text-xs font-bold uppercase leading-none mb-1">{item.product.brand}</h4>
                        <h3 className="text-slate-900 text-sm font-semibold leading-tight line-clamp-2">{item.product.name}</h3>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2">
                        {/* Qty Controls */}
                        <div className="flex items-center border border-slate-100 bg-slate-50 rounded-lg px-1 py-0.5">
                          <button 
                            onClick={() => onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                            className="w-7 h-7 text-slate-500 hover:text-slate-950 font-bold flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="text-xs font-semibold text-slate-800 w-6 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(item.product.id, Math.min(item.product.stock, item.quantity + 1))}
                            className="w-7 h-7 text-slate-500 hover:text-slate-950 font-bold flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">
                            R$ {(item.product.price * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-[10px] text-slate-400">
                              un. R$ {item.product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>

                        {/* Trash */}
                        <button 
                          onClick={() => onRemoveItem(item.product.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Remover do carrinho"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Subtotal and checkout CTA */}
          {cartItems.length > 0 && (
            <div className="border-t border-slate-100 px-6 py-6 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase">Subtotal estimado</p>
                  <p className="text-slate-400 text-[10px]">Sem frete ou cupons inclusos</p>
                </div>
                <p className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">
                  R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <button
                onClick={onCheckout}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 py-4 rounded-xl shadow-lg shadow-emerald-600/10 transition-all cursor-pointer"
              >
                Ir para o Checkout
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
