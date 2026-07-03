import { useState, useEffect, FormEvent } from "react";
import { ArrowLeft, Star, ShoppingCart, Send, AlertTriangle, Sparkles, MessageSquare } from "lucide-react";
import { Product, User } from "../types";
import { api } from "../utils/api";

interface ProductDetailsProps {
  productId: string;
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  user: User | null;
  onLoginClick: () => void;
}

export default function ProductDetails({
  productId,
  onBack,
  onAddToCart,
  user,
  onLoginClick,
}: ProductDetailsProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Review form states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [quantity, setQuantity] = useState(1);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await api.getProductDetails(productId);
      setProduct(data);
      setError("");
    } catch (err: any) {
      setError(err.message || "Erro ao carregar detalhes do produto.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      alert("Escreva um comentário para sua avaliação.");
      return;
    }

    try {
      setSubmittingReview(true);
      const updatedProduct = await api.addProductReview(productId, { rating, comment });
      setProduct(updatedProduct);
      setComment("");
      setRating(5);
      setReviewSuccess("Avaliação enviada com sucesso! Obrigado pela colaboração.");
      setTimeout(() => setReviewSuccess(""), 5000);
    } catch (err: any) {
      alert(err.message || "Não foi possível enviar a avaliação.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">Buscando detalhes do suplemento...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5" />
          <p>{error || "Produto não localizado."}</p>
        </div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold text-sm">
          <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
        </button>
      </div>
    );
  }

  const isLowStock = product.stock > 0 && product.stock <= product.alertStockLevel;
  const isOutOfStock = product.stock === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="group flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-600 mb-8 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Voltar para a Loja
      </button>

      {/* Product presentation section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs mb-12">
        {/* Product Image Column */}
        <div className="lg:col-span-5 flex items-center justify-center bg-slate-50 rounded-2xl p-6 relative">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="max-h-[380px] w-auto object-contain transition-transform duration-300 hover:scale-102"
            referrerPolicy="no-referrer"
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center rounded-2xl">
              <span className="bg-rose-600 text-white px-6 py-2 rounded-xl text-sm font-extrabold uppercase tracking-wider shadow-lg">Item não disponível</span>
            </div>
          )}
        </div>

        {/* Product Info Column */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            {/* Category and Brand */}
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
                {product.category}
              </span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                {product.brand}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight leading-tight mb-4">
              {product.name}
            </h1>

            {/* Star ratings info */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-amber-400" : "text-slate-200"}`} 
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-slate-800">{product.rating} de 5</span>
              <span className="text-sm text-slate-400">({product.reviewsCount} avaliações de clientes)</span>
            </div>

            {/* Pricing Details */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 mb-6 border border-slate-100">
              <p className="text-xs text-slate-400 font-bold uppercase">Preço especial de lançamento</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display font-extrabold text-3xl text-slate-900 tracking-tight">
                  R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-emerald-600 font-bold">no PIX ou Cartão de Crédito</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Disponibilidade: 
                {isOutOfStock ? (
                  <span className="text-rose-600 font-extrabold ml-1">Item não disponível</span>
                ) : isLowStock ? (
                  <span className="text-rose-500 font-bold ml-1">Últimas unidades!</span>
                ) : (
                  <span className="text-emerald-600 font-bold ml-1">Disponível em estoque</span>
                )}
              </p>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Informações sobre o Suplemento</h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          </div>

          {/* Quantity selector and CTA */}
          {isOutOfStock ? (
            <div className="border-t border-slate-100 pt-6">
              <div className="bg-rose-50 border border-rose-100 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
                <p className="text-sm font-bold">Item não disponível (Estoque esgotado)</p>
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center border border-slate-200 bg-slate-50 rounded-xl px-2 py-1 w-full sm:w-auto justify-between">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 text-slate-600 hover:text-slate-950 font-bold flex items-center justify-center"
                >
                  -
                </button>
                <span className="font-bold text-slate-800 px-4 text-center min-w-[32px]">{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-10 h-10 text-slate-600 hover:text-slate-950 font-bold flex items-center justify-center"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => onAddToCart(product, quantity)}
                className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 py-3.5 rounded-xl shadow-lg shadow-emerald-600/15 transition-all cursor-pointer active:scale-98"
              >
                <ShoppingCart className="h-5 w-5" />
                Adicionar ao Carrinho • R$ {(product.price * quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Reviews Lists */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-5 w-5 text-emerald-600" />
            <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">
              Avaliações de Clientes ({product.reviewsCount})
            </h2>
          </div>

          <div className="space-y-4">
            {(!product.reviews || product.reviews.length === 0) ? (
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
                <p className="text-sm font-medium">Nenhum cliente avaliou este produto ainda.</p>
                <p className="text-xs mt-1">Seja o primeiro a comprar e contar sua experiência!</p>
              </div>
            ) : (
              product.reviews.map((rev) => (
                <div key={rev.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-slate-800">{rev.userName}</p>
                    <span className="text-xs text-slate-400">
                      {new Date(rev.date).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  
                  <div className="flex text-amber-400 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < rev.rating ? "fill-amber-400" : "text-slate-200"}`} />
                    ))}
                  </div>

                  <p className="text-slate-600 text-sm italic">"{rev.comment}"</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Write a review column */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sticky top-24">
            <div className="flex items-center gap-1.5 mb-4">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <h3 className="font-display font-bold text-lg text-slate-800">Sua opinião importa!</h3>
            </div>

            {user ? (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {reviewSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold">
                    {reviewSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Qual nota você daria?</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star className={`h-6 w-6 ${star <= rating ? "fill-amber-400" : "text-slate-200"}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Comentário descritivo</label>
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Conte o que achou do sabor, eficácia e resultados deste suplemento..."
                    className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-xl p-3 focus:bg-white focus:outline-emerald-500 transition-all"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold py-3.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {submittingReview ? "Enviando..." : "Enviar Avaliação"}
                </button>
              </form>
            ) : (
              <div className="text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-500 mb-3">Você precisa estar logado para avaliar este suplemento.</p>
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Acessar Minha Conta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
