import React, { useState } from 'react';
import { 
  CheckCircle, 
  X, 
  ShieldCheck, 
  Zap, 
  Banknote, 
  ChevronDown, 
  AlertCircle, 
  CreditCard, 
  Check, 
  Lock 
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onConfirm: (method: string) => void;
}

export default function PaymentModal({ isOpen, onClose, amount, onConfirm }: PaymentModalProps) {
  const [method, setMethod] = useState<'online' | 'cash'>('online');
  const [onlineType, setOnlineType] = useState<'pse' | 'card'>('pse');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen && !isSuccess) return null;

  const handleConfirm = () => {
    setIsLoading(true);
    // Simulamos el tiempo de carga
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      if (onConfirm) onConfirm(method);
      
      // Cerrar después del éxito
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    }, 1500);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative w-full max-w-lg glass-premium rounded-3xl shadow-2xl overflow-hidden transition-all transform ${isOpen || isSuccess ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        
        {isSuccess ? (
          <div className="p-12 flex flex-col items-center text-center animate-fade-in-up">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-3xl font-bold mb-2">¡Pago Exitoso!</h2>
            <p className="text-white/60">Tu servicio ha sido confirmado. Hemos registrado tu método de pago.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Confirmar y Pagar</h2>
                <p className="text-sm text-white/50">Completa tu transacción para finalizar el servicio</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Amount Card */}
              <div className="glass rounded-2xl p-6 flex justify-between items-center bg-white/[0.02]">
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider text-white/40 font-semibold">Total a pagar</span>
                  <div className="text-3xl font-bold font-mono tracking-tight text-white">{formatCurrency(amount || 0)}</div>
                </div>
                <div className="p-3 brand-btn rounded-xl shadow-lg">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/60">Método de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setMethod('online')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${method === 'online' ? 'bg-white/10 border-blue-500/50 ring-1 ring-blue-500/50' : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'}`}
                  >
                    <div className={`p-2 rounded-lg ${method === 'online' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/40'}`}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">Pago en Línea</span>
                  </button>
                  <button 
                    onClick={() => setMethod('cash')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${method === 'cash' ? 'bg-white/10 border-indigo-500/50 ring-1 ring-indigo-500/50' : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'}`}
                  >
                    <div className={`p-2 rounded-lg ${method === 'cash' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 text-white/40'}`}>
                      <Banknote className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">Efectivo</span>
                  </button>
                </div>
              </div>

              {/* Conditional Content */}
              <div className="min-h-[140px] transition-all">
                {method === 'online' ? (
                  <div className="space-y-4 animate-scale-in">
                    <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
                      <button 
                        onClick={() => setOnlineType('pse')}
                        className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${onlineType === 'pse' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                      >
                        PSE / Transferencia
                      </button>
                      <button 
                        onClick={() => setOnlineType('card')}
                        className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${onlineType === 'card' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                      >
                        Tarjeta Crédito
                      </button>
                    </div>

                    {onlineType === 'pse' ? (
                      <div className="space-y-3">
                        <label className="text-xs text-white/40 ml-1">Selecciona tu banco</label>
                        <div className="relative">
                          <select className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3 text-sm appearance-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all">
                            <option className="bg-slate-900">Bancolombia</option>
                            <option className="bg-slate-900">Davivienda</option>
                            <option className="bg-slate-900">Banco de Bogotá</option>
                            <option className="bg-slate-900">Nequi</option>
                            <option className="bg-slate-900">Daviplata</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-white/40" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <input 
                            type="text" 
                            placeholder="Número de tarjeta" 
                            className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50" 
                          />
                        </div>
                        <input 
                          type="text" 
                          placeholder="MM/YY" 
                          className="bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50" 
                        />
                        <input 
                          type="text" 
                          placeholder="CVV" 
                          className="bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50" 
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3 animate-scale-in">
                    <div className="text-amber-500 pt-0.5">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-amber-500">Pago Directo al Técnico</h4>
                      <p className="text-xs text-amber-500/70 leading-relaxed">
                        Debes entregar el valor total en efectivo al técnico una vez finalizado y confirmado el servicio en tu ubicación.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-0">
              <button 
                className="w-full px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 brand-btn text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={isLoading}
                onClick={handleConfirm}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : method === 'online' ? (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>Pagar ahora</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Confirmar Pago en Efectivo</span>
                  </>
                )}
              </button>
              <p className="mt-4 text-[10px] text-center text-white/30 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                Pago seguro procesado por Tec360 Gateway
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
