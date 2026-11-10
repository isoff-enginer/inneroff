import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { 
  ChevronLeft, 
  Plus, 
  CircleDollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock, 
  Trash2, 
  Receipt, 
  Eye, 
  EyeOff, 
  Store,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight
} from "lucide-react";
import { useLiquidacionesData, type DayLiquidation } from "@/features/liquidaciones/use-liquidaciones-data";
import { formatCurrency } from "@/lib/format";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSession } from "@/features/auth/session";

const QUICK_EXPENSE_PRESETS = [
  "Transporte / Flete",
  "Nómina / Turno",
  "Empaques & Bolsas",
  "Almuerzos & Refrigerios",
  "Servicios Públicos",
  "Mantenimiento",
  "Papelería & Varios",
];

export function LiquidacionesView() {
  const navigate = useNavigate();
  const { role, user } = useSession();
  const {
    dailyLiquidaciones,
    summaryTotals,
    stores,
    isLoading,
    addExpense,
    isAddingExpense,
    deleteExpense,
    isDeletingExpense,
  } = useLiquidacionesData();

  // Estados visuales
  const [showAmountEye, setShowAmountEye] = useState(true);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // Drawer de Gasto
  const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseConcept, setExpenseConcept] = useState("");
  const [expenseStoreId, setExpenseStoreId] = useState("");
  const [expenseDate, setExpenseDate] = useState("");

  const toggleExpand = (dateKey: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const handleOpenAddExpense = (targetDateKey?: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setExpenseDate(targetDateKey || todayStr);
    setExpenseAmount("");
    setExpenseConcept("");
    setExpenseStoreId(stores[0]?.id || "");
    setIsExpenseDrawerOpen(true);
  };

  const handleSaveExpense = async () => {
    const val = Number(expenseAmount.replace(/[^0-9]/g, ""));
    if (!val || val <= 0) {
      toast.error("Por favor ingresa un monto válido mayor a 0");
      return;
    }
    if (!expenseConcept.trim()) {
      toast.error("Por favor escribe el concepto o detalle del gasto");
      return;
    }

    try {
      await addExpense({
        amount: val,
        notes: expenseConcept.trim(),
        storeId: expenseStoreId || undefined,
        date: expenseDate || undefined,
      });
      toast.success(`Gasto de ${formatCurrency(val)} registrado exitosamente.`);
      setIsExpenseDrawerOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error al registrar gasto");
    }
  };

  const handleDeleteExpense = async (id: string, concept: string, amount: number) => {
    if (!confirm(`¿Eliminar el gasto de "${concept}" por ${formatCurrency(amount)}?`)) return;

    try {
      await deleteExpense(id);
      toast.success("Gasto eliminado. Saldo recalculado.");
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar gasto");
    }
  };

  const displayName = user?.fullName?.split(" ")[0] || "Jefe";

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white pb-36 font-sans selection:bg-[#CCFF00] selection:text-black">
      <div className="mx-auto max-w-md px-5 pt-3 space-y-4">
        
        {/* HEADER */}
        <header className="flex items-center justify-between py-2">
          <button 
            onClick={() => navigate({ to: "/dashboard" })}
            className="flex size-10 items-center justify-center rounded-full bg-[#161922] border border-white/10 shadow-xs text-white active:scale-95 transition-transform"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="flex flex-col items-center">
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              <CircleDollarSign className="size-5 text-[#CCFF00]" />
              <span>Liquidaciones & Cierre</span>
            </h1>
            <span className="text-[11px] font-bold text-slate-400">Recaudos diarios y balance neto</span>
          </div>

          <button 
            onClick={() => handleOpenAddExpense()}
            className="flex size-10 items-center justify-center rounded-full bg-[#CCFF00] text-black shadow-lg font-black active:scale-95 transition-transform"
            title="Ingresar gasto"
          >
            <Plus className="size-5 stroke-[3]" />
          </button>
        </header>

        {/* HERO CARD BENTO (NET PROFIT & RESTA) */}
        <div className="rounded-[34px] bg-[#CCFF00] text-black p-6 shadow-2xl relative overflow-hidden transition-all">
          <div className="flex items-center justify-between">
            <div className="size-9 rounded-full bg-black/10 flex items-center justify-center text-black shadow-xs">
              <Receipt className="size-5 stroke-[2.5]" />
            </div>
            <span className="font-mono text-[11px] font-black tracking-wider text-black/75 uppercase">
              GANANCIA NETA TOTAL
            </span>
          </div>

          <div className="my-4 flex items-center justify-between">
            <span className="text-[36px] sm:text-[42px] font-black tracking-tight leading-none text-black">
              {showAmountEye ? formatCurrency(summaryTotals.grandGananciaNeta) : "••••••••"}
            </span>

            <button 
              onClick={() => setShowAmountEye(prev => !prev)}
              className="size-8 rounded-full bg-black/10 flex items-center justify-center text-black hover:bg-black/20 active:scale-95 transition-all"
              title={showAmountEye ? "Ocultar monto" : "Mostrar monto"}
            >
              {showAmountEye ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </button>
          </div>

          {/* Fila de desglose: Recaudado - Gastos */}
          <div className="pt-3 border-t border-black/10 grid grid-cols-2 gap-2 text-[12px]">
            <div className="flex items-center gap-1.5">
              <div className="size-5 rounded-full bg-black/10 flex items-center justify-center">
                <ArrowDownRight className="size-3 text-black stroke-[3]" />
              </div>
              <div>
                <span className="text-black/60 font-bold block text-[10px]">Total Recaudado</span>
                <span className="font-black text-black">
                  {showAmountEye ? formatCurrency(summaryTotals.grandRecaudado) : "••••"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 border-l border-black/10 pl-2">
              <div className="size-5 rounded-full bg-black/10 flex items-center justify-center">
                <ArrowUpRight className="size-3 text-black stroke-[3]" />
              </div>
              <div>
                <span className="text-black/60 font-bold block text-[10px]">Total Gastos</span>
                <span className="font-black text-black">
                  {showAmountEye ? `-${formatCurrency(summaryTotals.grandGastos)}` : "••••"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTÓN RÁPIDO PARA REGISTRAR GASTO */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleOpenAddExpense()}
            className="flex-1 h-12 rounded-2xl bg-[#161922] hover:bg-[#1f2330] border border-white/10 text-[#CCFF00] font-black text-[13px] flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <Plus className="size-4 stroke-[3]" />
            <span>Ingresar Gasto Diario</span>
          </Button>

          <Link
            to="/sales"
            className="flex items-center justify-center h-12 px-4 rounded-2xl bg-[#161922] hover:bg-[#1f2330] border border-white/10 text-white font-bold text-[13px] active:scale-98 transition-all"
          >
            Ver Recaudos
          </Link>
        </div>

        {/* LISTADO DE CIERRES DIARIOS (DÍA POR DÍA A MEDIANOCHE) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[14px] font-black tracking-tight text-white flex items-center gap-2">
              <Calendar className="size-4 text-[#CCFF00]" />
              <span>Cierres Diarios & Liquidación</span>
            </h2>
            <span className="text-[11px] font-bold text-slate-400">
              {dailyLiquidaciones.length} días registrados
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-[28px] bg-[#161922]/50 animate-pulse border border-white/5" />
              ))}
            </div>
          ) : dailyLiquidaciones.length === 0 ? (
            <div className="p-8 rounded-[30px] bg-[#161922] border border-white/10 text-center space-y-2">
              <CircleDollarSign className="size-10 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-white">No hay recaudos ni gastos aún</p>
              <p className="text-xs text-slate-400">
                Los recaudos confirmados y gastos diarios se agruparán automáticamente aquí fecha a fecha.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailyLiquidaciones.map((day: DayLiquidation) => {
                const isExpanded = !!expandedDates[day.dateKey];
                const hasDetails = day.payments.length > 0 || day.expenses.length > 0;

                return (
                  <div
                    key={day.dateKey}
                    className="rounded-[28px] bg-[#161922] border border-white/10 p-5 shadow-lg space-y-3 transition-all hover:border-white/20"
                  >
                    {/* Header del día: Fecha y Estado */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-black text-white capitalize">
                          {day.dateDisplay}
                        </span>
                        {day.isToday && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#CCFF00] text-black">
                            HOY
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                        <Clock className="size-3 text-[#CCFF00]" />
                        <span>
                          {day.lastRecaudoAt
                            ? `Último recaudo: ${day.lastRecaudoAt}`
                            : "Sin recaudos aún"}
                        </span>
                      </div>
                    </div>

                    {/* Fila de balance del día: Recaudado - Gastos = Neto */}
                    <div className="p-3.5 rounded-2xl bg-[#0B0E14] border border-white/5 grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">Recaudado</span>
                        <span className="text-[14px] font-black text-white">
                          {formatCurrency(day.totalRecaudado)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-rose-400 block">Gastos</span>
                        <span className="text-[14px] font-black text-rose-400">
                          {day.totalGastos > 0 ? `-${formatCurrency(day.totalGastos)}` : "$0"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-[#CCFF00] block">Ganancia Neta</span>
                        <span className="text-[14px] font-black text-[#CCFF00]">
                          {formatCurrency(day.gananciaNeta)}
                        </span>
                      </div>
                    </div>

                    {/* Acciones de la tarjeta */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleOpenAddExpense(day.dateKey)}
                        className="text-[11px] font-extrabold text-[#CCFF00] hover:underline flex items-center gap-1"
                      >
                        <Plus className="size-3 stroke-[3]" />
                        <span>Agregar gasto a este día</span>
                      </button>

                      {hasDetails && (
                        <button
                          onClick={() => toggleExpand(day.dateKey)}
                          className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white"
                        >
                          <span>{isExpanded ? "Ocultar detalle" : `Ver detalle (${day.paymentsCount + day.expensesCount})`}</span>
                          {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Acordeón expandible con desglose de recaudos y gastos */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-white/10 space-y-3">
                        {/* Lista de gastos del día */}
                        {day.expenses.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-black tracking-wider text-rose-400 uppercase block">
                              Gastos del día ({day.expenses.length})
                            </span>
                            <div className="space-y-1">
                              {day.expenses.map((exp) => (
                                <div
                                  key={exp.id}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[12px]"
                                >
                                  <div>
                                    <span className="font-bold text-white block">{exp.notes}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      {exp.storeName} • {new Date(exp.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-rose-400">
                                      -{formatCurrency(exp.amount)}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteExpense(exp.id, exp.notes, exp.amount)}
                                      className="size-7 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-300 hover:bg-rose-500/40"
                                      title="Eliminar gasto"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Lista de recaudos del día */}
                        {day.payments.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-black tracking-wider text-emerald-400 uppercase block">
                              Recaudos del día ({day.payments.length})
                            </span>
                            <div className="space-y-1">
                              {day.payments.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-[12px]"
                                >
                                  <div>
                                    <span className="font-bold text-white block">
                                      {p.notes || "Recaudo general"}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      {p.storeName} • {new Date(p.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                    </span>
                                  </div>
                                  <span className="font-black text-emerald-400">
                                    +{formatCurrency(p.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DRAWER MODAL PARA INGRESAR GASTO */}
        <Drawer open={isExpenseDrawerOpen} onOpenChange={setIsExpenseDrawerOpen}>
          <DrawerContent className="bg-[#131620] border-t border-white/10 text-white max-w-md mx-auto p-5 rounded-t-[36px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white">Ingresar Gasto Operativo</h3>
                  <p className="text-xs text-slate-400">Se restará automáticamente del total recaudado del día.</p>
                </div>
                <div className="size-9 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                  <Receipt className="size-4.5 stroke-[2.5]" />
                </div>
              </div>

              {/* Input de Monto */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Monto del Gasto ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-[#CCFF00]">$</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-[#1A1E2C] border border-white/10 rounded-2xl py-3.5 pl-9 pr-4 text-xl font-black text-white outline-none focus:border-[#CCFF00]"
                  />
                </div>
              </div>

              {/* Presets Rápidos de Concepto */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Concepto / Motivo</label>
                <input
                  type="text"
                  placeholder="Ej. Transporte de producto, Almuerzos..."
                  value={expenseConcept}
                  onChange={(e) => setExpenseConcept(e.target.value)}
                  className="w-full bg-[#1A1E2C] border border-white/10 rounded-2xl py-3 px-4 text-sm font-bold text-white outline-none focus:border-[#CCFF00]"
                />

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-hide">
                  {QUICK_EXPENSE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setExpenseConcept(preset)}
                      className="whitespace-nowrap px-2.5 py-1 rounded-xl text-[10px] font-bold bg-[#161922] border border-white/10 text-slate-300 hover:text-white hover:border-[#CCFF00]"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Sede & Fecha */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Sede Asignada</label>
                  <select
                    value={expenseStoreId}
                    onChange={(e) => setExpenseStoreId(e.target.value)}
                    className="w-full bg-[#1A1E2C] border border-white/10 rounded-2xl py-2.5 px-3 text-xs font-bold text-white outline-none focus:border-[#CCFF00]"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#1A1E2C] text-white">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Fecha del Gasto</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-[#1A1E2C] border border-white/10 rounded-2xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-[#CCFF00]"
                  />
                </div>
              </div>

              {/* Botón Guardar */}
              <Button
                onClick={handleSaveExpense}
                disabled={isAddingExpense}
                className="w-full h-13 rounded-2xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-black text-sm shadow-xl active:scale-98 transition-all"
              >
                {isAddingExpense ? "Guardando..." : "Guardar Gasto y Restar"}
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

      </div>
    </div>
  );
}

