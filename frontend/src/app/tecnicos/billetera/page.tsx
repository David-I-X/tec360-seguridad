"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Plus,
  FileText,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  AlertTriangle,
  Info,
  X,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getCreditBalance,
  getCreditTransactions,
  rechargeCredits,
  type BalanceData,
  type CreditTransaction,
} from "@/lib/api";

// ── Helpers ──────────────────────────────────────

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);

  if (diffHrs < 24) {
    return `Hoy, ${date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (diffHrs < 48) {
    return `Ayer, ${date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTransactionMeta(txn: CreditTransaction) {
  const type = txn.transaction_type;
  const isPositive = txn.amount > 0;

  if (type === "recharge" || type === "bonus") {
    return {
      icon: ArrowDownLeft,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      amountColor: "text-emerald-400",
      label: type === "bonus" ? "Bonificación" : "Recarga de créditos",
    };
  }
  if (type === "commission") {
    return {
      icon: Zap,
      iconColor: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20",
      amountColor: "text-slate-200",
      label: "Comisión de servicio",
    };
  }
  if (type === "penalty") {
    return {
      icon: AlertTriangle,
      iconColor: "text-rose-500",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/20",
      amountColor: "text-rose-400",
      label: "Penalización",
    };
  }
  // fallback
  return {
    icon: isPositive ? ArrowDownLeft : ArrowUpRight,
    iconColor: isPositive ? "text-emerald-500" : "text-slate-400",
    bgColor: isPositive ? "bg-emerald-500/10" : "bg-slate-500/10",
    borderColor: isPositive ? "border-emerald-500/20" : "border-slate-500/20",
    amountColor: isPositive ? "text-emerald-400" : "text-slate-300",
    label: txn.description || "Transacción",
  };
}

// ── Skeleton Loaders ────────────────────────────

function BalanceSkeleton() {
  return (
    <div className="glass-premium rounded-3xl p-8 relative overflow-hidden animate-pulse">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-white/10 rounded" />
          <div className="h-12 w-48 bg-white/10 rounded" />
        </div>
        <div className="flex gap-4">
          <div className="h-14 flex-1 bg-white/10 rounded-2xl" />
          <div className="h-14 flex-1 bg-white/10 rounded-2xl" />
        </div>
        <div className="pt-4 border-t border-white/5 flex gap-8">
          <div className="h-10 w-24 bg-white/10 rounded" />
          <div className="h-10 w-24 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  );
}

function TransactionSkeleton() {
  return (
    <div className="glass rounded-2xl p-4 flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/10" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-white/10 rounded" />
          <div className="h-3 w-40 bg-white/10 rounded" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <div className="h-4 w-20 bg-white/10 rounded ml-auto" />
        <div className="h-3 w-16 bg-white/10 rounded ml-auto" />
      </div>
    </div>
  );
}

// ── Recharge Modal ──────────────────────────────

const PRESET_AMOUNTS = [20000, 50000, 100000, 200000];

function RechargeModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const effectiveAmount = customAmount ? Number(customAmount) : amount;

  async function handleRecharge() {
    if (!effectiveAmount || effectiveAmount < 5000) {
      setError("El monto mínimo es $5.000 COP");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await rechargeCredits(effectiveAmount, "manual-web");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al recargar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-premium rounded-3xl p-6 w-full max-w-md relative z-10 animate-scale-in space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Recargar Créditos</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset amounts */}
        <div className="grid grid-cols-2 gap-3">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setAmount(preset);
                setCustomAmount("");
              }}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${
                amount === preset && !customAmount
                  ? "brand-btn text-white shadow-lg"
                  : "glass hover:bg-white/10"
              }`}
            >
              {formatCOP(preset)}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-medium">O ingresa un monto personalizado</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
            <input
              type="number"
              placeholder="Ej: 75000"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors font-mono"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="glass rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Monto a recargar</span>
            <span className="font-bold font-mono">{formatCOP(effectiveAmount)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Método</span>
            <span>Simulado (PSE próximamente)</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </p>
        )}

        <button
          onClick={handleRecharge}
          disabled={loading}
          className="brand-btn w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white shadow-xl disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
          {loading ? "Procesando..." : `Recargar ${formatCOP(effectiveAmount)}`}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────

export default function BilleteraPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const [balData, txnData] = await Promise.all([
        getCreditBalance(),
        getCreditTransactions(0, 50),
      ]);
      setBalance(balData);
      setTransactions(txnData);
    } catch (err: any) {
      setError(err.message || "Error al cargar datos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate today's in/out
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayIn = transactions
    .filter((t) => new Date(t.created_at) >= todayStart && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const todayOut = transactions
    .filter((t) => new Date(t.created_at) >= todayStart && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Filter by search
  const filtered = searchQuery
    ? transactions.filter(
        (t) =>
          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.transaction_type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transactions;

  const accountStatus = balance?.can_accept_services;

  return (
    <div className="pt-24 pb-12 px-4 md:px-6 lg:px-8 relative min-h-screen">
      <div className="mesh-gradient fixed top-0 left-0 w-full h-full -z-10" />

      <main className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl glass hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Mi Billetera</h1>
              <p className="text-muted-foreground text-sm">
                Gestiona tus créditos y transacciones
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(true)}
              className={`p-2 rounded-xl glass hover:bg-white/10 transition-colors ${refreshing ? "animate-spin" : ""}`}
              title="Actualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {!loading && (
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full glass text-[10px] font-bold uppercase tracking-wider ${
                  accountStatus === false ? "text-rose-400" : ""
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    accountStatus === false
                      ? "bg-rose-500 animate-pulse"
                      : "bg-emerald-500 animate-pulse"
                  }`}
                />
                {accountStatus === false ? "Sin Saldo" : "Cuenta Activa"}
              </div>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="glass rounded-2xl p-4 border-rose-500/20 bg-rose-500/5 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-sm text-rose-300">{error}</p>
            <button
              onClick={() => fetchData()}
              className="ml-auto text-xs text-indigo-400 font-bold"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Balance Card (Hero) */}
        {loading ? (
          <BalanceSkeleton />
        ) : (
          balance && (
            <div className="glass-premium rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -ml-16 -mb-16" />

              <div className="relative z-10 space-y-6">
                <div className="space-y-1">
                  <span className="text-muted-foreground text-sm font-medium">
                    Saldo Disponible
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-black font-mono tracking-tighter">
                      {formatCOP(balance.balance)}
                    </span>
                    <span className="text-slate-500 font-medium">COP</span>
                  </div>
                  {balance.free_services_remaining > 0 && (
                    <p className="text-xs text-indigo-400 font-medium mt-1">
                      🎉 {balance.free_services_remaining} servicio(s) gratis restante(s)
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setRechargeOpen(true)}
                    className="brand-btn px-6 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white shadow-xl flex-1"
                  >
                    <Plus className="w-5 h-5" />
                    Recargar Créditos
                  </button>
                  <button className="glass px-6 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-white/5 transition-all flex-1">
                    <FileText className="w-5 h-5 text-slate-400" />
                    Descargar Reporte
                  </button>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1 justify-center">
                        <TrendingUp className="w-3 h-3" /> Ganado hoy
                      </p>
                      <p className="font-mono text-emerald-400 font-bold">
                        +{formatCOP(todayIn)}
                      </p>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1 justify-center">
                        <TrendingDown className="w-3 h-3" /> Gastado hoy
                      </p>
                      <p className="font-mono text-rose-400 font-bold">
                        -{formatCOP(todayOut)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Comisión</p>
                    <p className="font-mono text-indigo-400 font-bold">
                      {(balance.commission_rate * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* History Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-bold">Historial Reciente</h2>
            <span className="text-xs text-muted-foreground">
              {filtered.length} transacción(es)
            </span>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar transacción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <button className="p-2 rounded-xl glass hover:bg-white/10">
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Transaction List */}
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <TransactionSkeleton key={i} />)
            ) : filtered.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center space-y-3">
                <Wallet className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-sm text-slate-400">
                  {searchQuery
                    ? "No se encontraron transacciones con ese criterio"
                    : "Aún no tienes transacciones"}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setRechargeOpen(true)}
                    className="text-xs text-indigo-400 font-bold"
                  >
                    Haz tu primera recarga →
                  </button>
                )}
              </div>
            ) : (
              filtered.map((txn) => {
                const meta = getTransactionMeta(txn);
                const Icon = meta.icon;
                const isPositive = txn.amount > 0;

                return (
                  <div
                    key={txn.id}
                    className="glass rounded-2xl p-4 flex items-center justify-between hover-lift cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl ${meta.bgColor} border ${meta.borderColor} flex items-center justify-center`}
                      >
                        <Icon className={`w-6 h-6 ${meta.iconColor}`} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{meta.label}</p>
                        <p className="text-slate-500 text-xs">
                          {formatRelativeDate(txn.created_at)}
                          {txn.external_reference && ` • ${txn.external_reference}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono font-bold ${meta.amountColor}`}>
                        {isPositive ? "+" : ""}
                        {formatCOP(txn.amount)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Saldo: {formatCOP(txn.balance_after)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="glass rounded-2xl p-6 border-dashed border-slate-700/50 bg-transparent flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold">¿Necesitas ayuda con tus créditos?</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Si tienes problemas con una recarga o crees que hay un error en tu
              historial, contacta a soporte técnico de Tec360.
            </p>
            <button className="text-xs text-indigo-400 font-bold pt-1">
              Contactar Soporte →
            </button>
          </div>
        </div>
      </main>

      {/* Recharge Modal */}
      <RechargeModal
        open={rechargeOpen}
        onClose={() => setRechargeOpen(false)}
        onSuccess={() => fetchData(true)}
      />
    </div>
  );
}
