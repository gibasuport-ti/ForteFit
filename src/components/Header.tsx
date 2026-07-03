import { useState } from "react";
import { ShoppingCart, User as UserIcon, Search, LogOut, ShieldCheck, ClipboardList, Dumbbell, AlignLeft, X } from "lucide-react";
import { User } from "../types";

interface HeaderProps {
  cartItemsCount: number;
  onCartClick: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
  user: User | null;
  onLogout: () => void;
  onLoginClick: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export default function Header({
  cartItemsCount,
  onCartClick,
  currentView,
  onViewChange,
  user,
  onLogout,
  onLoginClick,
  searchTerm,
  onSearchChange,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { onViewChange("catalog"); setMobileMenuOpen(false); }}>
            <div className="bg-emerald-600 text-white p-2 rounded-xl flex items-center justify-center">
              <Dumbbell className="h-5 w-5" />
            </div>
            <span className="font-display font-extrabold text-xl tracking-tight text-slate-900">
              FORTE<span className="text-emerald-600">FIT</span>
            </span>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Busque whey, creatina, marcas..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-slate-50 border-0 text-slate-800 text-sm pl-10 pr-4 py-2 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition-all duration-200"
              />
            </div>
          </div>

          {/* Nav Icons - Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => onViewChange("catalog")}
              className={`text-sm font-medium transition-colors ${
                currentView === "catalog" ? "text-emerald-600" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Catálogo
            </button>

            {user ? (
              <div className="flex items-center gap-4">
                {/* Admin Button */}
                {user.role === "admin" && (
                  <button
                    onClick={() => onViewChange("admin")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                      currentView === "admin"
                        ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        : "text-slate-600 hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Painel Admin
                  </button>
                )}

                {/* Pedidos / Area Cliente Button */}
                <button
                  onClick={() => onViewChange("customer")}
                  className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                    currentView === "customer" ? "text-emerald-600" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  Minha Área
                </button>

                {/* Logged User Info */}
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium leading-none">Bem-vindo,</p>
                    <p className="text-sm font-semibold text-slate-800 max-w-[120px] truncate">{user.name}</p>
                  </div>
                  <button
                    onClick={onLogout}
                    title="Sair da conta"
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 text-sm font-medium px-4 py-2 rounded-xl shadow-xs transition-all duration-200"
              >
                <UserIcon className="h-4 w-4" />
                Minha Conta
              </button>
            )}

            {/* Shopping Cart Button */}
            <button
              onClick={onCartClick}
              className="relative p-2.5 text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-extrabold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </nav>

          {/* Mobile Buttons */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onCartClick}
              className="relative p-2.5 text-slate-700"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-emerald-600 text-white text-[10px] font-extrabold h-4.5 w-4.5 flex items-center justify-center rounded-full border border-white">
                  {cartItemsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 text-slate-700 rounded-xl hover:bg-slate-50"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <AlignLeft className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-2 pb-6 space-y-4 shadow-lg absolute w-full left-0 fade-in">
          {/* Search bar inside mobile menu */}
          <div className="relative w-full my-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Busque whey, creatina..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm pl-10 pr-4 py-2 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => { onViewChange("catalog"); setMobileMenuOpen(false); }}
              className={`text-left px-3 py-2 rounded-lg text-sm font-semibold ${
                currentView === "catalog" ? "bg-emerald-50 text-emerald-600" : "text-slate-600"
              }`}
            >
              Catálogo de Produtos
            </button>

            {user ? (
              <>
                <button
                  onClick={() => { onViewChange("customer"); setMobileMenuOpen(false); }}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-semibold ${
                    currentView === "customer" ? "bg-emerald-50 text-emerald-600" : "text-slate-600"
                  }`}
                >
                  Minha Área & Pedidos
                </button>

                {user.role === "admin" && (
                  <button
                    onClick={() => { onViewChange("admin"); setMobileMenuOpen(false); }}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-semibold text-amber-600 bg-amber-50`}
                  >
                    Painel do Administrador
                  </button>
                )}

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between px-3">
                  <div>
                    <p className="text-xs text-slate-400">Logado como</p>
                    <p className="text-sm font-bold text-slate-800">{user.name}</p>
                  </div>
                  <button
                    onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-500 px-3 py-1.5 bg-red-50 rounded-lg"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sair
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => { onLoginClick(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-sm"
              >
                <UserIcon className="h-4 w-4" />
                Acessar Minha Conta
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
