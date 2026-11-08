"use client"

import { useState, useEffect, useCallback } from "react"
import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { fetchWithAuth, saveTokens, saveUser } from "@/lib/api"
import {
  Building2,
  Users,
  Wallet,
  CheckCircle2,
  ShieldCheck,
  Plus,
  RefreshCw,
  Wrench,
  Sliders,
  GraduationCap,
  ArrowRight,
  Gift,
  AlertCircle,
  UserPlus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Briefcase,
  Sparkles,
  X,
} from "lucide-react"

interface OrgMember {
  id: string
  organization_id: string
  user_id: string
  full_name: string
  phone: string
  email?: string | null
  org_role: "owner" | "manager" | "technician"
  status: "invited" | "active" | "suspended"
  credit_quota: number | null
  quota_used: number
  quota_remaining: number | null
  specializations: string[]
  is_available: boolean
  is_verified: boolean
  average_rating: number
  courses_validated: boolean
  is_admin_validated: boolean
  completed_required_courses: number
  total_required_courses: number
  active_services_count: number
  completed_services_count: number
}

interface OrganizationData {
  id: string
  name: string
  nit?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city: string
  dispatch_mode: "manual" | "direct"
  is_verified: boolean
  is_active: boolean
  wallet: {
    balance: number
    total_recharged: number
    total_consumed: number
    welcome_bonus_granted: boolean
    welcome_bonus_amount: number
    total_quota_assigned: number
    total_quota_used: number
  }
  my_membership: {
    member_id: string
    org_role: "owner" | "manager" | "technician"
    status: string
    credit_quota: number | null
    quota_used: number
  }
  metrics: {
    total_members: number
    total_technicians: number
    available_technicians: number
    validated_technicians: number
    active_services: number
    completed_services: number
  }
  members: OrgMember[]
}

interface AvailableServiceItem {
  id: string
  title: string
  description?: string | null
  service_type: string
  status: string
  service_address: string
  service_city: string
  estimated_price?: number | null
  vehicle_type?: string | null
  vehicle_model?: string | null
  vehicle_plate?: string | null
  scheduled_date?: string | null
}

interface TeamServiceItem {
  id: string
  title: string
  service_type: string
  status: string
  service_address: string
  estimated_price?: number | null
  final_price?: number | null
  technician_id?: string | null
  technician_name: string
  scheduled_date?: string | null
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

const SPECIALIZATION_OPTIONS = [
  { value: "gps_installation", label: "Instalación GPS" },
  { value: "alarm_installation", label: "Alarmas Vehiculares" },
  { value: "camera_installation", label: "Dashcams / Cámaras" },
  { value: "battery_jump", label: "Desvare / Batería" },
  { value: "locksmith", label: "Cerrajería Automotriz" },
  { value: "tire_change", label: "Llantas en Ruta" },
]

export default function TallerDashboardPage() {
  return (
    <ProtectedRoute>
      <TallerDashboardContent />
    </ProtectedRoute>
  )
}

function TallerDashboardContent() {
  const { user, refreshUser } = useAuth()
  const [org, setOrg] = useState<OrganizationData | null>(null)
  const [notRegisteredYet, setNotRegisteredYet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<"team" | "dispatch">("team")
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Services state for Dispatch tab
  const [availableServices, setAvailableServices] = useState<AvailableServiceItem[]>([])
  const [teamServices, setTeamServices] = useState<TeamServiceItem[]>([])
  const [selectedTechByService, setSelectedTechByService] = useState<Record<string, string>>({})
  const [assigningServiceId, setAssigningServiceId] = useState<string | null>(null)

  // Register Workshop Form (when user doesn't have an Organization yet)
  const [regName, setRegName] = useState("")
  const [regNit, setRegNit] = useState("")
  const [regCity, setRegCity] = useState("Medellín")
  const [regAddress, setRegAddress] = useState("")
  const [regDispatchMode, setRegDispatchMode] = useState<"manual" | "direct">("manual")
  const [submittingReg, setSubmittingReg] = useState(false)

  // Add Member Modal
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [newTechName, setNewTechName] = useState("")
  const [newTechPhone, setNewTechPhone] = useState("")
  const [newTechQuota, setNewTechQuota] = useState("")
  const [newTechRole, setNewTechRole] = useState<"technician" | "manager">("technician")
  const [newTechValidateCourses, setNewTechValidateCourses] = useState(true)
  const [newTechSpecs, setNewTechSpecs] = useState<string[]>(["gps_installation", "alarm_installation"])
  const [addingMember, setAddingMember] = useState(false)

  // Quota Modal
  const [quotaModalMember, setQuotaModalMember] = useState<OrgMember | null>(null)
  const [quotaInput, setQuotaInput] = useState("")
  const [quotaUnlimited, setQuotaUnlimited] = useState(false)
  const [quotaResetUsed, setQuotaResetUsed] = useState(false)
  const [savingQuota, setSavingQuota] = useState(false)

  // Recharge Modal
  const [rechargeOpen, setRechargeOpen] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState(100000)
  const [recharging, setRecharging] = useState(false)

  const loadOrganization = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetchWithAuth("/organizations/me")
      if (res.status === 404) {
        setNotRegisteredYet(true)
        setOrg(null)
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "No se pudo cargar la información del taller")
      }
      const data: OrganizationData = await res.json()
      setOrg(data)
      setNotRegisteredYet(false)

      // Cargar servicios disponibles y del equipo si es owner/manager
      if (data.my_membership.org_role === "owner" || data.my_membership.org_role === "manager") {
        const svcRes = await fetchWithAuth("/organizations/me/services")
        if (svcRes.ok) {
          const svcData = await svcRes.json()
          setAvailableServices(svcData.available_services || [])
          setTeamServices(svcData.team_services || [])
        }
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message || "Error al cargar el taller" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadOrganization()
  }, [loadOrganization])

  useEffect(() => {
    if (typeof window === "undefined") return
    const syncFromUrl = () => {
      const sp = new URLSearchParams(window.location.search)
      const tabParam = sp.get("tab")
      if (tabParam === "dispatch") {
        setActiveTab("dispatch")
      } else if (tabParam === "team") {
        setActiveTab("team")
      } else if (tabParam === "wallet") {
        setRechargeOpen(true)
      }
    }
    syncFromUrl()
    window.addEventListener("popstate", syncFromUrl)
    return () => window.removeEventListener("popstate", syncFromUrl)
  }, [])

  // ── Handlers ──────────────────────────────────────

  const handleRegisterWorkshop = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regName.trim()) return
    setSubmittingReg(true)
    setFeedback(null)
    try {
      const res = await fetchWithAuth("/organizations/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          nit: regNit.trim() || null,
          city: regCity.trim() || "Medellín",
          address: regAddress.trim() || null,
          dispatch_mode: regDispatchMode,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || "Error al crear la cuenta de taller")
      }
      if (data.access_token && data.refresh_token) {
        saveTokens(data.access_token, data.refresh_token)
      }
      if (user) {
        saveUser({ ...user, role: "company_admin" })
      }
      await refreshUser()
      setFeedback({
        type: "success",
        message: data.message || "¡Taller registrado con bono de bienvenida de $200.000 COP!",
      })
      await loadOrganization()
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message })
    } finally {
      setSubmittingReg(false)
    }
  }

  const handleToggleDispatchMode = async () => {
    if (!org) return
    const nextMode = org.dispatch_mode === "manual" ? "direct" : "manual"
    try {
      const res = await fetchWithAuth("/organizations/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatch_mode: nextMode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "No se pudo cambiar el modo de despacho")
      setOrg({ ...org, dispatch_mode: nextMode })
      setFeedback({
        type: "success",
        message:
          nextMode === "manual"
            ? "Modo activado: El Taller asigna los trabajos a cada técnico."
            : "Modo activado: Los técnicos pueden recibir y aceptar ofertas directamente.",
      })
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message })
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTechName.trim() || !newTechPhone.trim()) return
    setAddingMember(true)
    setFeedback(null)
    try {
      const parsedQuota = newTechQuota.trim() !== "" ? Number(newTechQuota) : null
      const res = await fetchWithAuth("/organizations/me/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: newTechName.trim(),
          phone: newTechPhone.trim(),
          org_role: newTechRole,
          specializations: newTechSpecs,
          credit_quota: parsedQuota,
          validate_courses_immediately: newTechValidateCourses,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "No se pudo agregar el técnico")
      setAddMemberOpen(false)
      setNewTechName("")
      setNewTechPhone("")
      setNewTechQuota("")
      setFeedback({ type: "success", message: data.message })
      await loadOrganization(true)
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message })
    } finally {
      setAddingMember(false)
    }
  }

  const handleValidateCourses = async (member: OrgMember) => {
    try {
      const res = await fetchWithAuth(`/organizations/me/members/${member.id}/validate-courses`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Error al validar cursos")
      setFeedback({ type: "success", message: data.message })
      await loadOrganization(true)
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message })
    }
  }

  const openQuotaModal = (member: OrgMember) => {
    setQuotaModalMember(member)
    setQuotaUnlimited(member.credit_quota === null)
    setQuotaInput(member.credit_quota !== null ? String(member.credit_quota) : "50000")
    setQuotaResetUsed(false)
  }

  const handleSaveQuota = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quotaModalMember) return
    setSavingQuota(true)
    try {
      const creditQuotaVal = quotaUnlimited ? null : Number(quotaInput || 0)
      const res = await fetchWithAuth(`/organizations/me/members/${quotaModalMember.id}/quota`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credit_quota: creditQuotaVal,
          reset_used: quotaResetUsed,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Error actualizando cupo")
      setQuotaModalMember(null)
      setFeedback({ type: "success", message: data.message })
      await loadOrganization(true)
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message })
    } finally {
      setSavingQuota(false)
    }
  }

  const handleRemoveMember = async (member: OrgMember) => {
    if (!confirm(`¿Desvincular a ${member.full_name} de tu taller?`)) return
    try {
      const res = await fetchWithAuth(`/organizations/me/members/${member.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "No se pudo desvincular al miembro")
      setFeedback({ type: "success", message: data.message })
      await loadOrganization(true)
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message })
    }
  }

  const handleRechargeWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rechargeAmount < 10000) return
    setRecharging(true)
    try {
      const res = await fetchWithAuth("/organizations/me/wallet/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: rechargeAmount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Error al recargar billetera del taller")
      setRechargeOpen(false)
      setFeedback({ type: "success", message: data.message })
      await loadOrganization(true)
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message })
    } finally {
      setRecharging(false)
    }
  }

  const handleAssignService = async (serviceId: string) => {
    const techUserId = selectedTechByService[serviceId]
    if (!techUserId) {
      setFeedback({ type: "error", message: "Selecciona un técnico de tu taller para asignarle el servicio." })
      return
    }
    setAssigningServiceId(serviceId)
    setFeedback(null)
    try {
      const res = await fetchWithAuth(`/organizations/me/services/${serviceId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technician_user_id: techUserId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "No se pudo asignar el servicio")
      setFeedback({ type: "success", message: data.message })
      await loadOrganization(true)
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message })
    } finally {
      setAssigningServiceId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050810] text-slate-100 pt-24 flex items-center justify-center">
        <div className="text-center space-y-3 font-mono">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Cargando Consola Corporativa de Taller...</p>
        </div>
      </div>
    )
  }

  // ── Vista de Registro Inicial del Taller ──────────
  if (notRegisteredYet || !org) {
    return (
      <div className="min-h-screen bg-[#050810] text-slate-100 pt-24 pb-16 px-4">
        <div className="max-w-xl mx-auto">
          <div className="rounded-3xl border border-cyan-500/30 bg-[#0B0F19]/95 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <Gift className="w-3.5 h-3.5 text-emerald-400" />
              <span>BONO ÚNICO DE BIENVENIDA: $200.000 COP POR TALLER</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                <Building2 className="w-7 h-7 text-cyan-400" />
                Activar Cuenta Taller / Empresa
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Centraliza a tus técnicos bajo una sola cuenta corporativa. Como dueño del taller tendrás control de la{" "}
                <strong className="text-cyan-300">billetera compartida</strong>, asignación de{" "}
                <strong className="text-cyan-300">cupos por técnico</strong>,{" "}
                <strong className="text-cyan-300">validación directa de cursos</strong> y modo de despacho configurable.
              </p>
            </div>

            {feedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-mono ${
                  feedback.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleRegisterWorkshop} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                  Nombre Comercial del Taller *
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ej: ElectroAuto & GPS Medellín SAS"
                  className="w-full rounded-xl bg-[#111827] border border-white/15 px-4 py-3 text-sm text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                    NIT / RFC (Opcional)
                  </label>
                  <input
                    type="text"
                    value={regNit}
                    onChange={(e) => setRegNit(e.target.value)}
                    placeholder="Ej: 901.234.567-8"
                    className="w-full rounded-xl bg-[#111827] border border-white/15 px-4 py-3 text-sm text-white focus:border-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                    Ciudad Principal *
                  </label>
                  <input
                    type="text"
                    required
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="Medellín"
                    className="w-full rounded-xl bg-[#111827] border border-white/15 px-4 py-3 text-sm text-white focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                  Dirección de Sede Principal
                </label>
                <input
                  type="text"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="Ej: Calle 30 # 65-20"
                  className="w-full rounded-xl bg-[#111827] border border-white/15 px-4 py-3 text-sm text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                  Modo de Despacho Inicial (Alternable en cualquier momento)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRegDispatchMode("manual")}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      regDispatchMode === "manual"
                        ? "border-cyan-400 bg-cyan-500/15 text-white"
                        : "border-white/10 bg-[#111827]/60 text-slate-400"
                    }`}
                  >
                    <div className="text-xs font-bold">Asignación por el Taller</div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Tú recibes los servicios y decides a qué técnico asignarlos.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegDispatchMode("direct")}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      regDispatchMode === "direct"
                        ? "border-emerald-400 bg-emerald-500/15 text-white"
                        : "border-white/10 bg-[#111827]/60 text-slate-400"
                    }`}
                  >
                    <div className="text-xs font-bold">Recepción Directa</div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Tus técnicos aceptan servicios directamente usando su cupo asignado.
                    </p>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-slate-300 font-mono space-y-1">
                <div>• Tu cuenta de dueño es exclusivamente administrativa (no apareces como técnico de campo).</div>
                <div>• Recibes $200.000 COP de bienvenida en la billetera compartida del taller.</div>
              </div>

              <button
                type="submit"
                disabled={submittingReg}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>{submittingReg ? "Creando Taller..." : "Crear Taller y Recibir $200.000 COP de Bienvenida"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const techniciansList = org.members.filter((m) => m.org_role === "technician")
  const canManage = org.my_membership.org_role === "owner" || org.my_membership.org_role === "manager"

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 pt-24 pb-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ─── Top Workshop Header & Dispatch Mode Switch ─── */}
        <div className="rounded-2xl border border-white/10 bg-[#0B0F19]/90 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                <Building2 className="w-3.5 h-3.5" />
                CUENTA EMPRESA / TALLER
              </span>
              {org.nit && (
                <span className="text-xs font-mono text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/10">
                  NIT: {org.nit}
                </span>
              )}
              <span className="text-xs font-mono text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/10">
                📍 {org.city}
              </span>
              <span className="text-xs font-mono text-violet-300 bg-violet-500/15 px-2.5 py-0.5 rounded-lg border border-violet-500/30">
                Rol: {org.my_membership.org_role === "owner" ? "Dueño Administrativo (No Técnico)" : org.my_membership.org_role}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {org.name}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Gestión centralizada de subcuentas técnicas, cupos de billetera, cursos Escuela Tec360 y despacho.
            </p>
          </div>

          {/* Dispatch Mode Switch */}
          {canManage && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#111827] border border-white/10 p-3.5 rounded-2xl">
              <div className="space-y-0.5 pr-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Modo de Despacho del Taller
                </div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  {org.dispatch_mode === "manual" ? (
                    <span className="text-cyan-300">Asignación por el Taller (Manual)</span>
                  ) : (
                    <span className="text-emerald-300">Recepción Directa por Técnicos</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleDispatchMode}
                className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  org.dispatch_mode === "manual"
                    ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/30"
                    : "bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30"
                }`}
              >
                {org.dispatch_mode === "manual" ? (
                  <>
                    <ToggleLeft className="w-4 h-4 text-cyan-300" />
                    <span>Cambiar a Directo</span>
                  </>
                ) : (
                  <>
                    <ToggleRight className="w-4 h-4 text-emerald-300" />
                    <span>Cambiar a Manual</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => loadOrganization(true)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                title="Actualizar panel"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
              </button>
            </div>
          )}
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── Shared Wallet + KPIs Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Shared Organization Wallet Card */}
          <div className="lg:col-span-7 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#081226] via-[#0B0F19] to-[#071A1E] p-6 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-300">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>BILLETERA COMPARTIDA DEL TALLER</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                    {formatCOP(org.wallet.balance)}
                  </span>
                  <span className="text-xs font-mono text-slate-400">COP disponibles</span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-lg">
                  <Sparkles className="w-3 h-3" />
                  <span>Bono único por Taller acreditado: {formatCOP(org.wallet.welcome_bonus_amount)}</span>
                </div>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setRechargeOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 self-start"
                >
                  <Plus className="w-4 h-4" />
                  <span>Recargar Billetera Taller</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
                <span className="text-[10px] text-slate-400 block">TOTAL ACREDITADO</span>
                <span className="font-bold text-white">{formatCOP(org.wallet.total_recharged)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
                <span className="text-[10px] text-slate-400 block">CONSUMIDO EQUIPO</span>
                <span className="font-bold text-amber-400">{formatCOP(org.wallet.total_consumed)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
                <span className="text-[10px] text-slate-400 block">CUPOS ASIGNADOS</span>
                <span className="font-bold text-cyan-300">{formatCOP(org.wallet.total_quota_assigned)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
                <span className="text-[10px] text-slate-400 block">COBERTURA EN SERVICIOS</span>
                <span className="font-bold text-emerald-400">{formatCOP(org.wallet.balance * 10)}</span>
              </div>
            </div>
          </div>

          {/* Workshop Team KPIs */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3.5 font-mono">
            <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>TÉCNICOS SUBCUENTA</span>
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-white">{org.metrics.total_technicians}</div>
                <div className="text-[11px] text-emerald-400">
                  {org.metrics.available_technicians} disponibles ahora
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>CURSOS VALIDADOS</span>
                <GraduationCap className="w-4 h-4 text-violet-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-white">
                  {org.metrics.validated_technicians} / {org.metrics.total_technicians}
                </div>
                <div className="text-[11px] text-violet-300">Habilitados para operar</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>EN EJECUCIÓN</span>
                <Wrench className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-white">{org.metrics.active_services}</div>
                <div className="text-[11px] text-slate-400">Trabajos activos del taller</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>COMPLETADOS</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-white">{org.metrics.completed_services}</div>
                <div className="text-[11px] text-emerald-400">Servicios finalizados</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Navigation Tabs ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("team")}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === "team"
                  ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-200"
                  : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Subcuentas de Técnicos y Cupos ({techniciansList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("dispatch")}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === "dispatch"
                  ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-200"
                  : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Consola de Despacho y Servicios ({availableServices.length} disponibles)</span>
            </button>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => setAddMemberOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-lg"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Agregar Técnico al Taller</span>
            </button>
          )}
        </div>

        {/* ─── TAB 1: SUBCUENTAS DE TÉCNICOS, CUPOS Y VALIDACIÓN DE CURSOS ─── */}
        {activeTab === "team" && (
          <div className="space-y-4">
            {techniciansList.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-10 text-center space-y-3">
                <Users className="w-10 h-10 text-cyan-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">Aún no has vinculado técnicos a tu taller</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Agrega a tus técnicos por su número celular, asígnales un cupo específico de la billetera de tu taller y valida sus cursos para que puedan operar de inmediato.
                </p>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setAddMemberOpen(true)}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs inline-flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Agregar Primer Técnico</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {techniciansList.map((tech) => {
                  const hasQuota = tech.credit_quota !== null && tech.credit_quota !== undefined
                  const quotaPct =
                    hasQuota && tech.credit_quota! > 0
                      ? Math.min(100, Math.round((tech.quota_used / tech.credit_quota!) * 100))
                      : 0

                  return (
                    <div
                      key={tech.id}
                      className="rounded-2xl border border-white/10 bg-[#0B0F19] p-5 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-white">{tech.full_name}</h3>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                  tech.is_available
                                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {tech.is_available ? "Disponible" : "Ocupado / Offline"}
                              </span>
                            </div>
                            <p className="text-xs font-mono text-slate-400 mt-0.5">{tech.phone}</p>
                          </div>

                          {/* Course Validation Status Badge */}
                          <div>
                            {tech.courses_validated ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Cursos Validados
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Falta Validar Cursos
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quota Bar */}
                        <div className="p-3.5 rounded-xl bg-[#111827] border border-white/10 space-y-2 font-mono text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">CUPO ASIGNADO EN BILLETERA:</span>
                            <span className="font-bold text-cyan-300">
                              {hasQuota ? formatCOP(tech.credit_quota!) : "Sin tope individual (Usa saldo taller)"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Consumido por este técnico:</span>
                            <span className="text-amber-300 font-bold">{formatCOP(tech.quota_used)}</span>
                          </div>
                          {hasQuota && (
                            <>
                              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    quotaPct >= 90 ? "bg-rose-500" : quotaPct >= 70 ? "bg-amber-400" : "bg-cyan-400"
                                  }`}
                                  style={{ width: `${quotaPct}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>Uso del cupo: {quotaPct}%</span>
                                <span className="text-emerald-300">
                                  Restante: {formatCOP(tech.quota_remaining || 0)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons for Owner/Manager */}
                      {canManage && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => openQuotaModal(tech)}
                            className="px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Asignar Cupo</span>
                          </button>

                          {!tech.courses_validated && (
                            <button
                              type="button"
                              onClick={() => handleValidateCourses(tech)}
                              className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5"
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>Validar Cursos</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveMember(tech)}
                            className="ml-auto p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300"
                            title="Desvincular técnico del taller"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: CONSOLA DE DESPACHO Y ASIGNACIÓN DE SERVICIOS ─── */}
        {activeTab === "dispatch" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Servicios Disponibles para Asignar a tu Equipo
                  </h2>
                  <p className="text-xs font-mono text-slate-400">
                    Selecciona qué técnico de tu taller atenderá cada servicio. La comisión (10%) se descontará de la billetera del taller y del cupo del técnico elegido.
                  </p>
                </div>
              </div>

              {availableServices.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-slate-400 border border-dashed border-white/10 rounded-xl">
                  No hay solicitudes pendientes sin asignar en este momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {availableServices.map((svc) => {
                    const estPrice = svc.estimated_price || 0
                    const estCommission = Math.round(estPrice * 0.1)
                    return (
                      <div
                        key={svc.id}
                        className="p-4 rounded-xl bg-[#111827] border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              {svc.service_type}
                            </span>
                            <h3 className="text-sm font-bold text-white">{svc.title}</h3>
                          </div>
                          <p className="text-xs text-slate-400">{svc.service_address}</p>
                          <div className="flex flex-wrap gap-4 text-xs font-mono pt-1">
                            <span className="text-emerald-400 font-bold">
                              Tarifa estimada: {formatCOP(estPrice)}
                            </span>
                            <span className="text-amber-300">
                              Comisión (10%): {formatCOP(estCommission)}
                            </span>
                            {svc.vehicle_model && (
                              <span className="text-slate-300">
                                Vehículo: {svc.vehicle_model} ({svc.vehicle_plate || "S/P"})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                          <select
                            value={selectedTechByService[svc.id] || ""}
                            onChange={(e) =>
                              setSelectedTechByService((prev) => ({
                                ...prev,
                                [svc.id]: e.target.value,
                              }))
                            }
                            className="rounded-xl bg-[#050810] border border-white/15 px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-400"
                          >
                            <option value="">Seleccionar técnico del taller...</option>
                            {techniciansList.map((t) => (
                              <option key={t.user_id} value={t.user_id}>
                                {t.full_name} {t.courses_validated ? "✓" : "(Validar cursos primero)"} — Cupo disp:{" "}
                                {t.credit_quota !== null ? formatCOP(t.quota_remaining || 0) : "Ilimitado"}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={assigningServiceId === svc.id}
                            onClick={() => handleAssignService(svc.id)}
                            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold transition-all disabled:opacity-50"
                          >
                            {assigningServiceId === svc.id ? "Asignando..." : "Asignar Trabajo"}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Active & Historical Team Services */}
            <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-5 space-y-4">
              <h2 className="text-base font-bold text-white">
                Servicios Asignados a Técnicos de tu Taller ({teamServices.length})
              </h2>
              {teamServices.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-slate-400 border border-dashed border-white/10 rounded-xl">
                  Aún no hay servicios asignados a los técnicos de tu taller.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {teamServices.map((ts) => (
                    <div
                      key={ts.id}
                      className="p-3.5 rounded-xl bg-[#111827] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                    >
                      <div>
                        <span className="font-bold text-white">{ts.title}</span>
                        <span className="text-slate-400 ml-2">({ts.service_address})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-cyan-300">Técnico: {ts.technician_name}</span>
                        <span className="px-2 py-0.5 rounded bg-white/10 text-white uppercase">
                          {ts.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: AGREGAR TÉCNICO SUBCUENTA ─── */}
      {addMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0B0F19] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                Agregar Técnico al Taller
              </h3>
              <button onClick={() => setAddMemberOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-mono uppercase text-slate-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={newTechName}
                  onChange={(e) => setNewTechName(e.target.value)}
                  placeholder="Ej: Andrés Gómez"
                  className="w-full rounded-xl bg-[#111827] border border-white/15 px-3.5 py-2.5 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block font-mono uppercase text-slate-300 mb-1">
                  Teléfono Celular (Login OTP del Técnico) *
                </label>
                <input
                  type="tel"
                  required
                  value={newTechPhone}
                  onChange={(e) => setNewTechPhone(e.target.value)}
                  placeholder="Ej: 3101234567"
                  className="w-full rounded-xl bg-[#111827] border border-white/15 px-3.5 py-2.5 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono uppercase text-slate-300 mb-1">Rol en el Taller</label>
                  <select
                    value={newTechRole}
                    onChange={(e) => setNewTechRole(e.target.value as "technician" | "manager")}
                    className="w-full rounded-xl bg-[#111827] border border-white/15 px-3 py-2.5 text-white outline-none"
                  >
                    <option value="technician">Técnico Operativo</option>
                    <option value="manager">Coordinador / Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono uppercase text-slate-300 mb-1">
                    Cupo Créditos (COP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={newTechQuota}
                    onChange={(e) => setNewTechQuota(e.target.value)}
                    placeholder="Vacío = sin tope"
                    className="w-full rounded-xl bg-[#111827] border border-white/15 px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono uppercase text-slate-300 mb-1.5">Especialidades</label>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIALIZATION_OPTIONS.map((sp) => {
                    const selected = newTechSpecs.includes(sp.value)
                    return (
                      <button
                        key={sp.value}
                        type="button"
                        onClick={() =>
                          setNewTechSpecs((prev) =>
                            selected ? prev.filter((x) => x !== sp.value) : [...prev, sp.value]
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border ${
                          selected
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                            : "bg-white/5 border-white/10 text-slate-400"
                        }`}
                      >
                        {sp.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTechValidateCourses}
                  onChange={(e) => setNewTechValidateCourses(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                <span className="text-emerald-200 font-mono text-[11px]">
                  Dar por cursados y validados los cursos obligatorios de Escuela Tec360 para este técnico
                </span>
              </label>

              <button
                type="submit"
                disabled={addingMember}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs"
              >
                {addingMember ? "Agregando..." : "Guardar Técnico en el Taller"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ASIGNAR / EDITAR CUPO DE CRÉDITOS ─── */}
      {quotaModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0B0F19] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Cupo de Billetera — {quotaModalMember.full_name}
              </h3>
              <button onClick={() => setQuotaModalMember(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuota} className="space-y-4 text-xs font-mono">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quotaUnlimited}
                  onChange={(e) => setQuotaUnlimited(e.target.checked)}
                />
                <span className="text-slate-200">
                  Sin tope individual (puede usar hasta el saldo disponible del taller)
                </span>
              </label>

              {!quotaUnlimited && (
                <div>
                  <label className="block text-slate-400 uppercase mb-1">
                    Cupo Máximo Asignado en COP
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={quotaInput}
                    onChange={(e) => setQuotaInput(e.target.value)}
                    className="w-full rounded-xl bg-[#111827] border border-white/15 px-3.5 py-2.5 text-white text-sm"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer text-amber-300">
                <input
                  type="checkbox"
                  checked={quotaResetUsed}
                  onChange={(e) => setQuotaResetUsed(e.target.checked)}
                />
                <span>Reiniciar cupo consumido a $0 COP ({formatCOP(quotaModalMember.quota_used)} usados)</span>
              </label>

              <button
                type="submit"
                disabled={savingQuota}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold"
              >
                {savingQuota ? "Guardando..." : "Actualizar Cupo del Técnico"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: RECARGAR BILLETERA DEL TALLER ─── */}
      {rechargeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0B0F19] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Recargar Billetera del Taller</h3>
              <button onClick={() => setRechargeOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRechargeWallet} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                {[50000, 100000, 200000, 500000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRechargeAmount(preset)}
                    className={`py-2.5 rounded-xl border font-bold ${
                      rechargeAmount === preset
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                        : "border-white/10 bg-white/5 text-slate-300"
                    }`}
                  >
                    {formatCOP(preset)}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-slate-400 uppercase mb-1">Monto en COP</label>
                <input
                  type="number"
                  min={10000}
                  step={10000}
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(Number(e.target.value))}
                  className="w-full rounded-xl bg-[#111827] border border-white/15 px-3.5 py-2.5 text-white text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={recharging}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
              >
                {recharging ? "Procesando..." : `Acreditar ${formatCOP(rechargeAmount)} al Taller`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
