import { createFileRoute } from "@tanstack/react-router";
import { Plus, ArrowDown } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/common/page-header";
import { SearchBar } from "@/components/common/search-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DISPATCH_STATUS_LABELS,
  DISPATCH_STATUS_TONES,
  MOCK_DISPATCHES,
} from "@/features/dispatches/mock-data";
import { formatCurrency } from "@/lib/format";
import type { DispatchStatus } from "@/types/domain";

export const Route = createFileRoute("/_app/dispatches")({
  head: () => ({
    meta: [
      { title: "Despachos · Reserva Operaciones" },
      {
        name: "description",
        content: "Seguimiento de despachos entre fábrica, bodegas y tiendas con estado y valor.",
      },
      { property: "og:title", content: "Despachos · Reserva Operaciones" },
      {
        property: "og:description",
        content: "Seguimiento de despachos entre fábrica, bodegas y tiendas con estado y valor.",
      },
    ],
  }),
  component: DispatchesPage,
});

const ALL = "all";
const STATUSES: DispatchStatus[] = ["draft", "pending", "dispatched", "received", "cancelled"];

function DispatchesPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(ALL);

  const dispatches = useMemo(
    () =>
      MOCK_DISPATCHES.filter((dispatch) => {
        const text = `${dispatch.number} ${dispatch.fromName} ${dispatch.toName}`.toLowerCase();
        return (
          text.includes(query.trim().toLowerCase()) && (status === ALL || dispatch.status === status)
        );
      }),
    [query, status],
  );

  return (
    <>
      <PageHeader
        title="Despachos"
        description="Estructura visual. El registro real usará las funciones existentes en Supabase."
        actions={
          <Button disabled title="Disponible al conectar la lógica funcional">
            <Plus className="size-4" aria-hidden="true" />
            Nuevo despacho
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SearchBar
          value={query}
          onValueChange={setQuery}
          placeholder="Buscar por número, origen o destino…"
          label="Buscar despacho"
          className="sm:col-span-2"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filtrar por estado">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            {STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {DISPATCH_STATUS_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {dispatches.length === 0 ? (
        <EmptyState title="Sin despachos" description="No hay despachos para estos filtros." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dispatches.map((dispatch) => (
            <li key={dispatch.id} className="surface p-5">
              <div className="flex items-center justify-between">
                <p className="tabular text-sm font-semibold">
                  #{String(dispatch.number).padStart(3, "0")}
                </p>
                <StatusBadge tone={DISPATCH_STATUS_TONES[dispatch.status]}>
                  {DISPATCH_STATUS_LABELS[dispatch.status]}
                </StatusBadge>
              </div>
              <div className="mt-4 space-y-1.5">
                <p className="text-sm font-medium">{dispatch.fromName}</p>
                <ArrowDown className="size-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium">{dispatch.toName}</p>
              </div>
              <dl className="mt-4 flex items-end justify-between border-t border-border pt-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Valor</dt>
                  <dd className="tabular text-sm font-semibold">
                    {formatCurrency(dispatch.totalValue)}
                  </dd>
                </div>
                <div className="text-right">
                  <dt className="text-xs text-muted-foreground">Fecha</dt>
                  <dd className="text-sm">{dispatch.date}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
