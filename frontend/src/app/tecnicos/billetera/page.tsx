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
  CreditCard,
  ShieldCheck,
  CheckCircle,
  ChevronDown,
  Lock,
  Smartphone,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getCreditBalance,
  getCreditTransactions,
  rechargeCredits,
  rechargeCreditsIntent,
  rechargeCreditsConfirm,
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

// ── Recharge Modal (Sandbox Digital Gateway) ────────────────

const PRESET_AMOUNTS = [20000, 50000, 100000, 200000];
const COLOMBIAN_BANKS = [
  "Bancolombia",
  "Davivienda",
  "Banco de Bogotá",
  "BBVA Colombia",
  "Banco de Occidente",
  "Scotiabank Colpatria",
  "Banco Popular",
  "Nequi",
  "Daviplata",
];

type RechargeMethod = "pse" | "card" | "nequi" | "daviplata";

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
  const [method, setMethod] = useState<RechargeMethod>("pse");
  const [selectedBank, setSelectedBank] = useState("Bancolombia");
  const [phone, setPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  if (!open && !success) return null;

  const effectiveAmount = customAmount ? Number(customAmount) : amount;

  async function handleRecharge() {
    if (!effectiveAmount || effectiveAmount < 5000) {
      setError("El monto mínimo de recarga es $5.000 COP");
      return;
    }
    setLoading(true);
    setError("");
    setLoadingStep("Conectando con Pasarela Sandbox...");

    try {
      // 1. Intent call to backend
      const intentData = await rechargeCreditsIntent(effectiveAmount, method);
      const transactionId = intentData.transaction_id;
      setTxId(transactionId);

      // 2. Realistic processing animation
      setLoadingStep("Validando con la entidad financiera...");
      await new Promise((r) => setTimeout(r, 1300));

      setLoadingStep("Acreditando saldo en tu billetera...");
      await new Promise((r) => setTimeout(r, 1200));

      // 3. Confirm call to backend
      await rechargeCreditsConfirm(transactionId);

      setSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Error al procesar la recarga en pasarela sandbox");
    } finally {
      setLoading(false);
    }
  }

  function handleCloseModal() {
    setError("");
    setSuccess(false);
    setTxId(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 overflow-y-auto py-8">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCloseModal} />
      <div className="glass-premium rounded-3xl p-6 w-full max-w-lg relative z-10 animate-scale-in space-y-5 my-auto max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="py-8 text-center space-y-4 animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">¡Recarga Exitosa!</h3>
              <p className="text-sm text-slate-300">
                Se han acreditado{" "}
                <span className="font-bold font-mono text-emerald-400">
                  {formatCOP(effectiveAmount)} COP
                </span>{" "}
                a tu billetera.
              </p>
            </div>
            {txId && (
              <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-3 inline-block max-w-full">
                <p className="text-[10px] uppercase font-bold text-slate-400">Referencia de Pago</p>
                <p className="font-mono text-xs text-emerald-300 font-bold truncate select-all">
                  {txId}
                </p>
              </div>
            )}
            <div className="pt-2">
              <button
                onClick={handleCloseModal}
                className="brand-btn w-full py-3.5 rounded-xl font-bold text-white shadow-lg cursor-pointer"
              >
                Volver a la Billetera
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-indigo-400" />
                  Recargar Créditos
                </h3>
                <p className="text-xs text-slate-400">
                  Pasarela digital Sandbox (PSE, Tarjetas, Nequi, Daviplata)
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preset amounts */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Selecciona un monto</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAmount(preset);
                      setCustomAmount("");
                    }}
                    className={`py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      amount === preset && !customAmount
                        ? "brand-btn text-white shadow-md scale-[1.02]"
                        : "glass hover:bg-white/10 text-slate-300"
                    }`}
                  >
                    {formatCOP(preset)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">O ingresa un valor específico</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  placeholder="Ej: 80000"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2.5 pl-8 pr-4 text-sm focus:outline-none focus:border-indigo-500 font-mono text-white"
                />
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Método de Pago</label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setMethod("pse")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    method === "pse" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  PSE
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("card")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    method === "card" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Tarjeta
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("nequi")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    method === "nequi" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Nequi
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("daviplata")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    method === "daviplata" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Daviplata
                </button>
              </div>
            </div>

            {/* Method Details Form */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              {method === "pse" && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 flex items-center justify-between">
                    <span>Selecciona tu Banco</span>
                    <span className="text-[10px] text-indigo-400 font-mono">Débito ACH</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white appearance-none focus:outline-none focus:border-indigo-500"
                    >
                      {COLOMBIAN_BANKS.map((b) => (
                        <option key={b} value={b} className="bg-slate-900 text-white">
                          {b}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              {method === "card" && (
                <div className="space-y-2.5">
                  <div>
                    <label className="text-xs text-slate-400">Número de Tarjeta</label>
                    <input
                      type="text"
                      placeholder="4500 •••• •••• 1234"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      maxLength={19}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-400">Vencimiento</label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        maxLength={5}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">CVV</label>
                      <input
                        type="password"
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        maxLength={4}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(method === "nequi" || method === "daviplata") && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 flex items-center justify-between">
                    <span>Número de celular registrado en {method === "nequi" ? "Nequi" : "Daviplata"}</span>
                    <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">+57</span>
                    <input
                      type="tel"
                      placeholder="300 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={10}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl py-2 pl-12 pr-3.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Recibirás una notificación push en tu app para autorizar el débito en tiempo real.
                  </p>
                </div>
              )}
            </div>

            {/* Total Summary */}
            <div className="glass rounded-xl p-3.5 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total a Pagar</span>
                <p className="text-xl font-bold font-mono text-white">{formatCOP(effectiveAmount)}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-end gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Pasarela Segura
                </span>
                <p className="text-xs text-slate-400">Sandbox Certificado</p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleRecharge}
              disabled={loading}
              className="brand-btn w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-white shadow-xl disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs">{loadingStep || "Procesando..."}</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pagar y Recargar {formatCOP(effectiveAmount)}</span>
                </>
              )}
            </button>

            <p className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              Transacción protegida por Pasarela Digital Tec360
            </p>
          </>
        )}
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
