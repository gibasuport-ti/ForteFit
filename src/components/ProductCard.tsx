import { Star, ShoppingCart, Info, AlertTriangle } from "lucide-react";
import { Product } from "../types";

interface ProductCardProps {
  key?: string;
  product: Product;
  onAddToCart: (product: Product) => void;
  onProductClick: (id: string) => void;
}

export default function ProductCard({ product, onAddToCart, onProductClick }: ProductCardProps) {
  const isLowStock = product.stock > 0 && product.stock <= product.alertStockLevel;
  const isOutOfStock = product.stock === 0;

  return (
    <div 
      id={`product-card-${product.id}`}
      className="group flex flex-col bg-white rounded-2xl border border-slate-100 hover:border-emerald-500/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
    >
      {/* Product Image Panel */}
      <div className="relative pt-[100%] bg-slate-50 overflow-hidden cursor-pointer" onClick={() => onProductClick(product.id)}>
        <img
          src={product.imageUrl}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        
        {/* Category Tag */}
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-emerald-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border border-emerald-500/10 shadow-xs">
          {product.category}
        </span>

        {/* Low Stock Urgent Badge */}
        {isLowStock && (
          <span className="absolute bottom-3 left-3 bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 px-2.5 py-1 rounded-md shadow-md animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            Poucas Unidades!
          </span>
        )}

        {/* Out Of Stock Badge */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
            <span className="bg-rose-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg shadow-lg">
              Item não disponível
            </span>
          </div>
        )}
      </div>

      {/* Product Information Panel */}
      <div className="flex flex-col flex-1 p-5">
        {/* Brand */}
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{product.brand}</p>
        
        {/* Title */}
        <h3 
          onClick={() => onProductClick(product.id)}
          className="font-display font-semibold text-slate-800 text-sm leading-snug hover:text-emerald-600 cursor-pointer min-h-[40px] line-clamp-2 mb-2 transition-colors"
        >
          {product.name}
        </h3>

        {/* Reviews Summary */}
        <div className="flex items-center gap-1 mb-4">
          <div className="flex items-center text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < Math.floor(product.rating) ? "fill-amber-400" : "text-slate-200"
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-bold text-slate-700">{product.rating}</span>
          <span className="text-[11px] text-slate-400">({product.reviewsCount})</span>
        </div>

        {/* Stock status subtext */}
        <div className="mt-auto mb-3">
          {isOutOfStock ? (
            <p className="text-[11px] text-red-500 font-bold flex items-center gap-1">
              Item não disponível
            </p>
          ) : isLowStock ? (
            <p className="text-[11px] text-rose-500 font-bold">
              Últimas unidades em estoque!
            </p>
          ) : (
            <p className="text-[11px] text-emerald-600 font-medium">
              ✓ Disponível em estoque
            </p>
          )}
        </div>

        {/* Pricing and Action Button */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-50 pt-3">
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase leading-none">À vista</p>
            <p className="font-display font-extrabold text-lg text-slate-900 tracking-tight">
              R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onProductClick(product.id)}
              title="Ver detalhes"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <Info className="h-4.5 w-4.5" />
            </button>

            <button
              disabled={isOutOfStock}
              onClick={() => onAddToCart(product)}
              className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                isOutOfStock
                  ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-95"
              }`}
              title="Adicionar ao carrinho"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
