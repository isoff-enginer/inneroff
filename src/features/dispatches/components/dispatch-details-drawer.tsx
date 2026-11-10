import React from "react";
import { 
  X, 
  ArrowRight, 
  Calendar, 
  Building2, 
  User, 
  CheckCircle2, 
  Truck, 
  Clock, 
  PackageCheck,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { ProductVisualIcon } from "@/features/inventory/components/ProductVisualIcon";
import { getProductPackagings } from "@/features/inventory/product-presentations";
import type { LiveDispatch } from "@/features/dispatches/use-dispatches";

interface DispatchDetailsDrawerProps {
  dispatch: LiveDispatch | null;
  isOpen: boolean;
  onClose: () => void;
  onReceive?: (dispatchId: string) => Promise<void>;
  isReceiving?: boolean;
}

export function DispatchDetailsDrawer({
  dispatch,
  isOpen,
  onClose,
  onReceive,
  isReceiving = false,
}: DispatchDetailsDrawerProps) {
  if (!dispatch) return null;

  const isDispatched = dispatch.status === "dispatched";
  const isReceived = dispatch.status === "received";

  // Formato de fecha
  const formattedDate = dispatch.createdAt 
    ? new Date(dispatch.createdAt).toLocaleString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "Reciente";

  const totalItemsCount = (dispatch.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0);

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-[#F8FAFC] border-t-0 px-4 pb-8 max-h-[92vh] rounded-t-[36px] outline-none">
        {/* iOS Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-2 shrink-0" />

        <div className="flex flex-col max-h-[85vh]">
          {/* HEADER MINIMALISTA TIPO IPHONE */}
          <div className="flex items-start justify-between py-3 border-b border-slate-200/80 mb-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide ${
                  isReceived
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300/60"
                    : isDispatched
                    ? "bg-amber-100 text-amber-900 border border-amber-300/60"
                    : "bg-slate-100 text-slate-700 border border-slate-300/60"
                }`}>
                  {isReceived ? (
                    <>
                      <CheckCircle2 className="size-3" /> Recibido
                    </>
                  ) : isDispatched ? (
                    <>
                      <Truck className="size-3" /> En Tránsito
                    </>
                  ) : (
                    <>
                      <Clock className="size-3" /> Pendiente
                    </>
                  )}
                </span>
                <span className="text-[12px] font-bold text-slate-400">
                  {formattedDate}
                </span>
              </div>

              <h2 className="text-[22px] font-black text-slate-950 tracking-tight mt-1">
                Despacho #{dispatch.dispatchNumber}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-full bg-slate-200/70 text-slate-700 hover:bg-slate-300 active:scale-95 transition-transform"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* CONTENIDO SCROLLEABLE */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5 scrollbar-hide">
            
            {/* RUTA: ORIGEN ➔ DESTINO */}
            <div className="p-4 rounded-[26px] bg-white border border-slate-200/80 shadow-xs space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Ruta de Traslado
              </span>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-400">Origen</span>
                  <span className="text-[15px] font-black text-slate-900 mt-0.5">
                    {dispatch.fromLocationName}
                  </span>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700 uppercase w-fit">
                    {dispatch.fromLocationType === "factory" ? "Fábrica" : dispatch.fromLocationType === "warehouse" ? "Bodega" : "Tienda"}
                  </span>
                </div>

                <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 text-slate-800">
                  <ArrowRight className="size-5" />
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-bold text-slate-400">Destino</span>
                  <span className="text-[15px] font-black text-slate-900 mt-0.5">
                    {dispatch.toLocationName}
                  </span>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-900 text-white uppercase w-fit">
                    {dispatch.toLocationType === "store" ? "Tienda" : dispatch.toLocationType === "warehouse" ? "Bodega" : "Fábrica"}
                  </span>
                </div>
              </div>
            </div>

            {/* RESPONSABLES DE OPERACIÓN */}
            <div className="p-4 rounded-[26px] bg-white border border-slate-200/80 shadow-xs grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2.5">
                <div className="size-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                  <User className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-400">Despachado por</span>
                  <span className="text-[13px] font-black text-slate-900">
                    {dispatch.createdByName || "Administración"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  dispatch.receivedByName ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-400"
                }`}>
                  <ShieldCheck className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-400">Recibido por</span>
                  <span className={`text-[13px] font-black ${
                    dispatch.receivedByName ? "text-emerald-700" : "text-slate-400 italic"
                  }`}>
                    {dispatch.receivedByName || "Pendiente"}
                  </span>
                </div>
              </div>
            </div>

            {/* DETALLE DE PRODUCTOS CON FOTOS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Productos y Presentaciones ({dispatch.items?.length || 0})
                </span>
                <span className="text-[12px] font-black text-slate-700">
                  {totalItemsCount} unds en total
                </span>
              </div>

              {(!dispatch.items || dispatch.items.length === 0) ? (
                <div className="p-6 text-center bg-white rounded-2xl border border-slate-200/80 text-slate-400 text-sm">
                  Sin items especificados en este despacho.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dispatch.items.map((it) => {
                    const prodDetails = getProductPackagings(it.productName);
                    const groupBadge = prodDetails.group === "blanco" 
                      ? { label: "Blanco", bg: "bg-slate-100 text-slate-800 border-slate-200" }
                      : prodDetails.group === "verde"
                      ? { label: "Verde", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" }
                      : { label: "Adicionales", bg: "bg-rose-50 text-rose-800 border-rose-200" };

                    return (
                      <div 
                        key={it.id || it.productId}
                        className="p-3.5 rounded-[24px] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5"
                      >
                        {/* FOTO DEL PRODUCTO */}
                        <div className="size-16 rounded-2xl bg-slate-50 border border-slate-200/60 p-1 shrink-0 flex items-center justify-center overflow-hidden shadow-xs">
                          <ProductVisualIcon name={it.productName} className="size-full object-contain" />
                        </div>

                        {/* DATOS DEL PRODUCTO Y PRESENTACIÓN */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[15px] font-black text-slate-950 truncate">
                              {prodDetails.name || it.productName}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase ${groupBadge.bg}`}>
                              {groupBadge.label}
                            </span>
                          </div>

                          <p className="text-[12px] font-bold text-slate-500 mt-0.5">
                            {it.quantity} unidades físicas
                          </p>

                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                            <span className="text-[11px] font-semibold text-slate-400">
                              Val. Unitario: {formatCurrency(it.unitValue || prodDetails.unitPrice)}
                            </span>
                            <span className="text-[13px] font-black text-slate-900">
                              {formatCurrency(it.totalValue || (it.quantity * (it.unitValue || prodDetails.unitPrice)))}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* NOTAS ADICIONALES */}
            {dispatch.notes && (
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 text-[12px] text-slate-600">
                <span className="font-bold text-slate-900 block mb-0.5">Notas del Despacho:</span>
                {dispatch.notes}
              </div>
            )}

            {/* RESUMEN FINANCIERO TOTAL */}
            <div className="p-4 rounded-[26px] bg-slate-950 text-white shadow-md flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Valor Total del Despacho
                </span>
                <span className="text-2xl font-black text-white tracking-tight mt-0.5 block">
                  {formatCurrency(dispatch.totalValue || 0)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Unidades
                </span>
                <span className="text-lg font-black text-white">
                  {totalItemsCount} un
                </span>
              </div>
            </div>

          </div>

          {/* ACCIÓN INFERIOR (RECEPCIÓN O CERRAR) */}
          <div className="pt-3 shrink-0 space-y-2">
            {isDispatched && onReceive && (
              <Button
                onClick={() => onReceive(dispatch.id)}
                disabled={isReceiving}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
              >
                <PackageCheck className="size-5" />
                {isReceiving ? "Confirmando recepción..." : "Confirmar Recepción de Mercancía"}
              </Button>
            )}

            <Button
              onClick={onClose}
              variant="outline"
              className="w-full h-12 rounded-2xl font-bold text-[14px] bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition-all"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

