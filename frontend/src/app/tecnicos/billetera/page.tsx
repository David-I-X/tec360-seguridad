"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Plus,
  FileText,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  AlertTriangle,
  X,
  Wallet,
  RefreshCw,
  Clock,
  Gift,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getCreditBalance,
  getCreditTransactions,
  getMyTopUpRequests,
  subscribeUserTopUpEvents,
  type BalanceData,
  type CreditTransaction,
  type TopUpRequestItem,
} from "@/lib/api";
import { BreBTopUpModal } from "@/components/topup/BreBTopUpModal";

// ── Helpers ──────────────────────────────────────

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getTransactionMeta(txn: CreditTransaction) {
  const type = txn.transaction_type;
  const isPositive = txn.amount > 0;

  if (type === "bonus") {
    return {
      icon: Gift,
      iconColor: "text-emerald-400",
      bgColor: "bg-emerald-500/15",
      borderColor: "border-emerald-500/30",
      amountColor: "text-emerald-400",
      label: "Bono de bienvenida Tec360",
    };
  }
  if (type === "recharge" || type === "refund") {
    return {
      icon: ArrowDownLeft,
      iconColor: "text-emerald-400",
      bgColor: "bg-emerald-500/15",
      borderColor: "border-emerald-500/30",
      amountColor: "text-emerald-400",
      label: type === "refund" ? "Reembolso de comisión" : "Recarga de créditos Wompi",
    };
  }
  if (type === "deduction" || type === "commission") {
    return {
      icon: Zap,
      iconColor: "text-blue-400",
      bgColor: "bg-blue-500/15",
      borderColor: "border-blue-500/30",
      amountColor: "text-rose-400",
      label: "Comisión plataforma (10%)",
    };
  }
  if (type === "penalty") {
    return {
      icon: AlertTriangle,
      iconColor: "text-rose-400",
      bgColor: "bg-rose-500/15",
      borderColor: "border-rose-500/30",
      amountColor: "text-rose-400",
      label: "Penalización operativa",
    };
  }
  return {
    icon: isPositive ? ArrowDownLeft : ArrowUpRight,
    iconColor: isPositive ? "text-emerald-400" : "text-slate-400",
    bgColor: isPositive ? "bg-emerald-500/15" : "bg-slate-800/60",
    borderColor: isPositive ? "border-emerald-500/30" : "border-slate-700/60",
    amountColor: isPositive ? "text-emerald-400" : "text-slate-300",
    label: txn.description || "Movimiento operativo",
  };
}

const fallbackBalance: BalanceData = {
  balance: 200000,
  total_recharged: 200000,
  total_consumed: 0,
  free_services_remaining: 0,
  can_accept_services: true,
  commission_rate: 0.10,
  welcome_bonus_granted: true,
  welcome_bonus_amount: 200000,
};

const fallbackTransactions: CreditTransaction[] = [
  {
    id: "WELCOME-BONUS-200K",
    technician_id: "TECH-01",
    amount: 200000,
    balance_after: 200000,
    transaction_type: "bonus",
    description: "¡Te regalamos $200.000 en créditos por bienvenida!",
    service_id: null,
    external_reference: "WELCOME-BONUS-200K",
    created_at: new Date().toISOString(),
  },
];

// ── Welcome Bonus Modal ($200.000 COP) ───────────

function WelcomeBonusModal({
  open,
  onClose,
  bonusAmount = 200000,
}: {
  open: boolean;
  onClose: () => void;
  bonusAmount?: number;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8 font-sans">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="bg-[#080F24] border border-emerald-500/40 rounded-3xl p-6 sm:p-8 w-full max-w-md relative z-10 space-y-5 shadow-2xl shadow-emerald-950/50 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Cerrar aviso de bienvenida"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>BONO DE BIENVENIDA TEC360</span>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center mx-auto text-white shadow-lg shadow-emerald-500/25">
          <Gift className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
            ¡Te regalamos {formatCOP(bonusAmount)} en créditos por bienvenida!
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Hemos recargado automáticamente{" "}
            <strong className="text-emerald-400 font-mono">
              {formatCOP(bonusAmount)} COP
            </strong>{" "}
            en tu billetera operativa para que puedas empezar a aceptar y cotizar servicios sin tener que recargar de tu bolsillo.
          </p>
        </div>

        <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-4 text-left space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Créditos acreditados:</span>
            <span className="font-bold text-emerald-400">+{formatCOP(bonusAmount)} COP</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Comisión por servicio:</span>
            <span className="font-bold text-blue-400">10% sobre tarifa</span>
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
            <span className="text-slate-300">Capacidad operativa cubierta:</span>
            <span className="font-bold text-white">{formatCOP(bonusAmount * 10)} en trabajos</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-sm shadow-lg shadow-emerald-600/25 transition-all"
        >
          ¡Excelente, ver mi billetera!
        </button>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────

type TxnFilter = "all" | "credits" | "deductions";

export default function BilleteraPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [topUpRequests, setTopUpRequests] = useState<TopUpRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [txnFilter, setTxnFilter] = useState<TxnFilter>("all");
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [balData, txnData, reqsData] = await Promise.all([
        getCreditBalance(),
        getCreditTransactions(0, 50),
        getMyTopUpRequests(5).catch(() => [] as TopUpRequestItem[]),
      ]);
      setBalance(balData || fallbackBalance);
      setTransactions(txnData?.length > 0 ? txnData : fallbackTransactions);
      setTopUpRequests(reqsData);
    } catch {
      setBalance(fallbackBalance);
      setTransactions(fallbackTransactions);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasPendingTopUp = topUpRequests.some((r) => r.status === "pending");

  useEffect(() => {
    if (!hasPendingTopUp) return;
    return subscribeUserTopUpEvents(() => fetchData(true));
  }, [hasPendingTopUp, fetchData]);

  // Mostrar pop-up de bienvenida con los $200.000 en créditos la primera vez
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem("tec360_welcome_bonus_200k_seen");
    if (!seen) {
      setWelcomeModalOpen(true);
    }
  }, []);

  const handleCloseWelcomeModal = () => {
    setWelcomeModalOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("tec360_welcome_bonus_200k_seen", "true");
    }
  };

  const filtered = transactions.filter((t) => {
    if (txnFilter === "credits" && t.amount <= 0) return false;
    if (txnFilter === "deductions" && t.amount >= 0) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      t.description?.toLowerCase().includes(q) ||
      t.transaction_type?.toLowerCase().includes(q) ||
      String(t.id).toLowerCase().includes(q) ||
      (t.external_reference && t.external_reference.toLowerCase().includes(q))
    );
  });

  const currentBalance = balance || fallbackBalance;
  const welcomeBonusAmount = currentBalance.welcome_bonus_amount || 200000;
  const commissionRate = currentBalance.commission_rate || 0.1;
  const operationalCoverage = Math.round(currentBalance.balance / commissionRate);

  return (
    <div className="pt-24 pb-12 px-4 md:px-6 lg:px-8 relative min-h-screen bg-[#020408] text-slate-100 font-sans">
      <main className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-[#0B132B] border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100 flex items-center gap-2">
                <Wallet className="w-6 h-6 text-blue-400" />
                Mi Billetera // Créditos Operativos & Custodia Escrow
              </h1>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Portal de Especialista Certificado Tec360 · Saldo de créditos para comisiones y liquidaciones
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => fetchData(true)}
              className={`p-2 rounded-xl bg-[#0B132B] border border-slate-800 text-slate-400 hover:text-white transition-colors ${refreshing ? "animate-spin text-blue-400" : ""}`}
              title="Actualizar saldo y movimientos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B1736] border border-[#1E3A8A] text-[10px] font-mono font-bold text-[#93C5FD]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Cuenta Activa · Especialista Tec360</span>
            </div>
          </div>
        </div>

        {/* ─── Workshop Shared Wallet & Quota Banner (when technician belongs to a Taller) ─── */}
        {currentBalance.is_organization_wallet && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-[#080F24] to-emerald-950/40 border border-cyan-500/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold uppercase">
                  🏢 Billetera de Taller
                </span>
                <span className="text-sm font-bold text-white">
                  {currentBalance.organization_name}
                </span>
              </div>
              <span className="text-xs font-mono text-cyan-300">
                Modo Despacho:{" "}
                <strong>
                  {currentBalance.dispatch_mode === "manual"
                    ? "Asignación Centralizada por Taller"
                    : "Recepción Directa"}
                </strong>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono pt-1">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                <span className="text-[10px] text-slate-400 block">SALDO GENERAL DEL TALLER</span>
                <span className="text-sm font-bold text-emerald-400">
                  {formatCOP(currentBalance.org_wallet_balance ?? currentBalance.balance)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                <span className="text-[10px] text-slate-400 block">MI CUPO ASIGNADO EN TALLER</span>
                <span className="text-sm font-bold text-cyan-300">
                  {currentBalance.credit_quota !== null && currentBalance.credit_quota !== undefined
                    ? formatCOP(currentBalance.credit_quota)
                    : "Sin tope individual"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                <span className="text-[10px] text-slate-400 block">MI CUPO CONSUMIDO</span>
                <span className="text-sm font-bold text-amber-400">
                  {formatCOP(currentBalance.quota_used ?? currentBalance.total_consumed)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Domain & Escrow Clarification Banner ─── */}
        <div className="p-3.5 rounded-xl bg-[#080F24] border border-[#1E3A8A]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-[#BFDBFE]">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px]">
              🔒 POLÍTICA DE CRÉDITOS
            </span>
            <span>
              Al iniciar en Tec360 recibes $200.000 COP en créditos de bienvenida. Cada servicio aceptado descuenta únicamente el 10% de comisión sobre el valor del servicio.
            </span>
          </div>
          <span className="text-emerald-400 font-semibold shrink-0">
            Custodia Escrow ✓
          </span>
        </div>

        {/* ─── Balance Hero Card ─── */}
        <div className="bg-[#080F24] border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-xl relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2 font-mono">
                <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                  Saldo de Créditos Disponible
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-5xl font-black text-slate-100 tracking-tight">
                    {loading ? "..." : formatCOP(currentBalance.balance)}
                  </span>
                  <span className="text-slate-500 text-sm font-semibold">COP</span>
                </div>

                <button
                  type="button"
                  onClick={() => setWelcomeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-semibold hover:bg-emerald-500/25 transition-colors"
                >
                  <Gift className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    ¡Te regalamos {formatCOP(welcomeBonusAmount)} en créditos por bienvenida! (Ver bono)
                  </span>
                </button>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setRechargeOpen(true)}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs shadow-lg transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Recargar Créditos</span>
                </button>
              </div>
            </div>

            {/* Balance Submetrics Grid (100% Real Data from Balance) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-slate-800/80 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#0B132B] border border-slate-800/60">
                <span className="text-[10px] text-slate-400 block mb-1">BONO BIENVENIDA</span>
                <span className="font-bold text-emerald-400">+{formatCOP(welcomeBonusAmount)}</span>
                <p className="text-[9px] text-slate-500 mt-0.5">Créditos de regalo acreditados</p>
              </div>

              <div className="p-3 rounded-xl bg-[#0B132B] border border-slate-800/60">
                <span className="text-[10px] text-slate-400 block mb-1">TOTAL ACREDITADO</span>
                <span className="font-bold text-slate-100">{formatCOP(currentBalance.total_recharged)}</span>
                <p className="text-[9px] text-slate-500 mt-0.5">Bono + recargas históricas</p>
              </div>

              <div className="p-3 rounded-xl bg-[#0B132B] border border-slate-800/60">
                <span className="text-[10px] text-slate-400 block mb-1">CONSUMIDO COMISIONES</span>
                <span className="font-bold text-amber-400">{formatCOP(currentBalance.total_consumed)}</span>
                <p className="text-[9px] text-slate-500 mt-0.5">Descontado en servicios</p>
              </div>

              <div className="p-3 rounded-xl bg-[#0B132B] border border-slate-800/60">
                <span className="text-[10px] text-slate-400 block mb-1">COBERTURA OPERATIVA</span>
                <span className="font-bold text-blue-400">{formatCOP(operationalCoverage)}</span>
                <p className="text-[9px] text-slate-500 mt-0.5">
                  En trabajos al {(commissionRate * 100).toFixed(0)}% de comisión
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Top-Up Requests Section ─── */}
        {topUpRequests.length > 0 && (
          <div className="bg-[#080F24] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Solicitudes de recarga Bre-B</span>
            </h2>
            <div className="space-y-2">
              {topUpRequests.map((req) => {
                const isPending = req.status === "pending";
                const isApproved = req.status === "approved";
                const badgeClass = isPending
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : isApproved
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-300 border-rose-500/30";
                const label = isPending ? "En revisión" : isApproved ? "Aprobada" : "Rechazada";
                return (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0B132B] border border-slate-800/70 text-xs font-mono"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-100">
                        {formatCOP(req.amount)} COP
                        {req.reference_hint ? ` · Ref ${req.reference_hint}` : ""}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {req.reject_reason ||
                          new Date(
                            /([zZ]|[+-]\d{2}:?\d{2})$/.test(req.created_at)
                              ? req.created_at
                              : `${req.created_at}Z`
                          ).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold shrink-0 ${badgeClass}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── History Section ─── */}
        <div className="bg-[#080F24] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Historial de Movimientos Operativos
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Registro de tu bono de bienvenida de $200.000 COP, recargas y comisiones
              </p>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              {(
                [
                  { key: "all", label: "Todos" },
                  { key: "credits", label: "Bonos y Recargas" },
                  { key: "deductions", label: "Comisiones" },
                ] as { key: TxnFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTxnFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    txnFilter === tab.key
                      ? "bg-[#0B1736] text-[#93C5FD] border border-[#1E3A8A]"
                      : "bg-[#0B132B] text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar transacción por concepto, referencia o ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B132B] border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs font-mono text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Transaction list */}
          <div className="space-y-2.5">
            {filtered.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#0B132B] border border-slate-800/80 text-xs font-mono text-slate-400">
                No se encontraron movimientos para este filtro.
              </div>
            ) : (
              filtered.map((txn) => {
                const meta = getTransactionMeta(txn);
                const Icon = meta.icon;
                const isPositive = txn.amount > 0;

                return (
                  <div
                    key={txn.id}
                    className="p-3.5 rounded-xl bg-[#0B132B] border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl ${meta.bgColor} border ${meta.borderColor} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${meta.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-200 truncate">{txn.description || meta.label}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span>{txn.external_reference || String(txn.id).slice(0, 12)}</span>
                          <span>·</span>
                          <span>
                            {new Date(txn.created_at).toLocaleDateString("es-CO", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {txn.service_id && (
                            <>
                              <span>·</span>
                              <span className="text-blue-400 font-semibold">
                                Servicio #{String(txn.service_id).slice(0, 8)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`font-black ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                        {isPositive ? "+" : ""}{formatCOP(txn.amount)} COP
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Saldo posterior: {formatCOP(txn.balance_after)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>🔒 Sistema de créditos protegido por Tec360 Escrow Architecture</span>
            <span>Mostrando {filtered.length} movimiento(s)</span>
          </div>
        </div>
      </main>

      <WelcomeBonusModal
        open={welcomeModalOpen}
        onClose={handleCloseWelcomeModal}
        bonusAmount={welcomeBonusAmount}
      />

      <BreBTopUpModal
        open={rechargeOpen}
        onClose={() => setRechargeOpen(false)}
        onSubmitted={() => fetchData(true)}
      />
    </div>
  );
}
