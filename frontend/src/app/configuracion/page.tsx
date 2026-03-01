"use client"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import api from "@/lib/api"
import { toast } from "react-hot-toast"
import { Camera, User, Wrench, Shield, AlertTriangle, LogOut, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ConfigPage() {
    const { user, logout } = useAuth()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [activeTab, setActiveTab] = useState("personal")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Form States
    const [profileData, setProfileData] = useState<any>(null)
    const [personalForm, setPersonalForm] = useState({ full_name: "", email: "", city: "" })
    const [techForm, setTechForm] = useState({ bio: "", experience_years: 0, service_radius_km: 50, specializations: [] as string[] })

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get("/users/me")
                setProfileData(res.data)
                setPersonalForm({
                    full_name: res.data.full_name || "",
                    email: res.data.email || "",
                    city: res.data.city || ""
                })
                if (res.data.technician_profile) {
                    setTechForm({
                        bio: res.data.technician_profile.bio || "",
                        experience_years: res.data.technician_profile.experience_years || 0,
                        service_radius_km: res.data.technician_profile.service_radius_km || 50,
                        specializations: res.data.technician_profile.specializations || []
                    })
                }
            } catch (error) {
                toast.error("Error cargando perfil")
            } finally {
                setLoading(false)
            }
        }
        fetchProfile()
    }, [])

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]

        const formData = new FormData()
        formData.append("file", file)

        try {
            toast.loading("Subiendo foto...", { id: "avatar" })
            const res = await api.post("/uploads/avatar", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            })
            setProfileData({ ...profileData, avatar_url: res.data.url })
            toast.success("Foto actualizada", { id: "avatar" })
        } catch (error) {
            toast.error("Error al subir foto", { id: "avatar" })
        }
    }

    const savePersonalProfile = async () => {
        setSaving(true)
        try {
            await api.put("/users/me", personalForm)
            toast.success("Perfil personal actualizado")
        } catch (error) {
            toast.error("Error actualizando perfil")
        } finally {
            setSaving(false)
        }
    }

    const saveTechnicalProfile = async () => {
        setSaving(true)
        try {
            await api.put("/users/me/technician", techForm)
            toast.success("Perfil técnico actualizado")
        } catch (error) {
            toast.error("Error actualizando perfil técnico")
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (!confirm("¿Estás 100% seguro de que deseas desactivar tu cuenta? Perderás acceso a tus servicios.")) return

        try {
            await api.delete("/users/me")
            toast.success("Cuenta desactivada. Cerrando sesión...")
            setTimeout(() => {
                logout()
                router.push("/")
            }, 2000)
        } catch (error) {
            toast.error("Error desactivando cuenta")
        }
    }

    const toggleSpecialization = (spec: string) => {
        setTechForm(prev => ({
            ...prev,
            specializations: prev.specializations.includes(spec)
                ? prev.specializations.filter(s => s !== spec)
                : [...prev.specializations, spec]
        }))
    }

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#000000] text-[#00f2ff]">Analizando entorno seguro...</div>

    // Custom styling to match Stitch generated screen aesthetics
    return (
        <div className="min-h-screen bg-[#000000] text-slate-300 font-sans selection:bg-[#00f2ff]/30">
            <style>{`
        .glass-input {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        .glass-input:focus {
          background: rgba(255, 255, 255, 0.05);
          border-color: #00f2ff;
          box-shadow: 0 0 15px rgba(0, 242, 255, 0.1);
          outline: none;
        }
      `}</style>

            <div className="max-w-4xl mx-auto py-12 px-6">

                {/* Navigation / Header */}
                <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors text-sm">
                    <ArrowLeft className="w-4 h-4" /> Volver
                </button>

                <header className="mb-10">
                    <h2 className="text-4xl font-black text-white tracking-tight">Configuración <span className="text-[#00f2ff] italic">de Cuenta</span></h2>
                    <p className="text-slate-500 mt-2 text-base font-medium">Personaliza tu entorno de trabajo y parámetros técnicos de seguridad.</p>
                </header>

                {/* Tabs */}
                <div className="border-b border-white/5 mb-10 overflow-x-auto">
                    <nav className="flex space-x-8 min-w-max pb-px">
                        <button
                            onClick={() => setActiveTab("personal")}
                            className={`pb-4 px-1 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === "personal" ? "border-[#00f2ff] text-[#00f2ff] drop-shadow-[0_0_10px_rgba(0,242,255,0.5)]" : "border-transparent text-slate-500 hover:text-slate-200"}`}
                        >
                            <User className="w-4 h-4" /> Perfil Personal
                        </button>

                        {user?.role === "technician" && (
                            <button
                                onClick={() => setActiveTab("technical")}
                                className={`pb-4 px-1 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === "technical" ? "border-[#00f2ff] text-[#00f2ff] drop-shadow-[0_0_10px_rgba(0,242,255,0.5)]" : "border-transparent text-slate-500 hover:text-slate-200"}`}
                            >
                                <Wrench className="w-4 h-4" /> Perfil Técnico
                            </button>
                        )}

                        <button
                            onClick={() => setActiveTab("danger")}
                            className={`pb-4 px-1 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === "danger" ? "border-red-500 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "border-transparent text-slate-500 hover:text-red-400"}`}
                        >
                            <AlertTriangle className="w-4 h-4" /> Zona Crítica
                        </button>
                    </nav>
                </div>

                <div className="space-y-10">

                    {/* PERSONAL TAB */}
                    {activeTab === "personal" && (
                        <section className="bg-[#111111] rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-[#00f2ff] rounded-full"></span> Información Personal
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Identidad del usuario registrado en plataforma.</p>
                            </div>

                            <div className="p-8">
                                <div className="flex flex-col md:flex-row gap-12">

                                    {/* Avatar Upload */}
                                    <div className="flex flex-col items-center gap-5">
                                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <div className="h-36 w-36 rounded-full overflow-hidden ring-4 ring-[#00f2ff]/20 group-hover:ring-[#00f2ff]/40 transition-all duration-300 bg-slate-800 flex items-center justify-center">
                                                {profileData?.avatar_url ? (
                                                    <img src={`https://tec-360.tech${profileData.avatar_url}`} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-4xl text-slate-500">{personalForm.full_name?.charAt(0) || "U"}</span>
                                                )}
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center bg-[#00f2ff]/20 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                <Camera className="text-white w-8 h-8" />
                                            </div>
                                            <input type="file" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" />
                                        </div>
                                        <div className="text-center">
                                            <span className="px-2 py-1 bg-[#00f2ff]/10 text-[#00f2ff] text-[10px] font-bold rounded uppercase tracking-tighter">
                                                Identidad Segura
                                            </span>
                                        </div>
                                    </div>

                                    {/* Fields */}
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="col-span-full">
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nombre Completo</label>
                                            <input
                                                type="text"
                                                value={personalForm.full_name}
                                                onChange={e => setPersonalForm({ ...personalForm, full_name: e.target.value })}
                                                className="w-full glass-input rounded-xl text-white text-sm px-4 py-3"
                                            />
                                        </div>
                                        <div className="col-span-full md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
                                            <input
                                                type="email"
                                                value={personalForm.email}
                                                onChange={e => setPersonalForm({ ...personalForm, email: e.target.value })}
                                                className="w-full glass-input rounded-xl text-white text-sm px-4 py-3"
                                            />
                                        </div>
                                        <div className="col-span-full md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Ciudad Base</label>
                                            <input
                                                type="text"
                                                value={personalForm.city}
                                                onChange={e => setPersonalForm({ ...personalForm, city: e.target.value })}
                                                className="w-full glass-input rounded-xl text-white text-sm px-4 py-3"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-8 py-5 bg-white/[0.02] border-t border-white/5 flex justify-end">
                                <button
                                    onClick={savePersonalProfile}
                                    disabled={saving}
                                    className="bg-[#00f2ff] hover:bg-white hover:text-black text-black px-6 py-2.5 rounded-xl text-sm font-black tracking-tight transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] flex items-center gap-2"
                                >
                                    {saving ? "ENCRIPTANDO..." : "ACTUALIZAR PERFIL"}
                                </button>
                            </div>
                        </section>
                    )}

                    {/* TECHNICAL TAB */}
                    {activeTab === "technical" && user?.role === "technician" && (
                        <section className="bg-[#111111] rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-[#00f2ff] rounded-full"></span> Perfil Profesional
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Configuración operativa y radio de despliegue táctico.</p>
                            </div>

                            <div className="p-8 space-y-8">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Biografía Profesional</label>
                                    <textarea
                                        className="w-full glass-input rounded-xl text-white text-sm px-4 py-3"
                                        rows={3}
                                        value={techForm.bio}
                                        onChange={e => setTechForm({ ...techForm, bio: e.target.value })}
                                        placeholder="Describe tu experiencia técnica..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Años de Experiencia</label>
                                        <input
                                            type="number"
                                            className="w-full glass-input rounded-xl text-white text-sm px-4 py-3"
                                            min="0"
                                            value={techForm.experience_years}
                                            onChange={e => setTechForm({ ...techForm, experience_years: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                                            Radio de Servicio <span className="text-[#00f2ff]">{techForm.service_radius_km} km</span>
                                        </label>
                                        <div className="relative mt-4">
                                            <input
                                                type="range"
                                                min="5" max="200" step="5"
                                                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#00f2ff]"
                                                value={techForm.service_radius_km}
                                                onChange={e => setTechForm({ ...techForm, service_radius_km: parseInt(e.target.value) })}
                                            />
                                            <div className="flex justify-between mt-3 text-[10px] text-slate-500 font-mono">
                                                <span>5 KM</span>
                                                <span>200 KM</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Especializaciones Activas</label>
                                    <div className="flex flex-wrap gap-3">
                                        {["alarmas", "gps", "dashcam"].map((spec) => {
                                            const isActive = techForm.specializations.includes(spec)
                                            return (
                                                <button
                                                    key={spec}
                                                    onClick={() => toggleSpecialization(spec)}
                                                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${isActive
                                                        ? "bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30"
                                                        : "border border-dashed border-white/20 text-slate-500 hover:border-[#00f2ff] hover:text-[#00f2ff]"
                                                        }`}
                                                >
                                                    {spec.toUpperCase()}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="px-8 py-5 bg-white/[0.02] border-t border-white/5 flex justify-end">
                                <button
                                    onClick={saveTechnicalProfile}
                                    disabled={saving}
                                    className="bg-[#00f2ff] hover:bg-white hover:text-black text-black px-6 py-2.5 rounded-xl text-sm font-black tracking-tight transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] flex items-center gap-2"
                                >
                                    {saving ? "ENCRIPTANDO..." : "GUARDAR SETUP"}
                                </button>
                            </div>
                        </section>
                    )}

                    {/* DANGER TAB */}
                    {activeTab === "danger" && (
                        <section className="bg-red-500/5 rounded-2xl border border-red-500/20 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="max-w-xl">
                                    <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
                                        <AlertTriangle className="w-6 h-6" /> Zona Crítica
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-2">
                                        La desactivación de cuenta suspenderá de inmediato todos tus servicios activos y cortará tu acceso a la plataforma. Esta acción marca tu cuenta como inactiva en el sistema central.
                                    </p>
                                </div>
                                <button
                                    onClick={handleDeleteAccount}
                                    className="bg-transparent border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white px-8 py-3 rounded-xl text-xs font-black tracking-widest transition-all whitespace-nowrap"
                                >
                                    DESACTIVAR CUENTA
                                </button>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    )
}
