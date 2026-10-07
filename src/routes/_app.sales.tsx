import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { SearchBar } from "@/components/common/search-bar";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { MOCK_SALES } from "@/features/sales/mock-data";
import { formatCurrency } from "@/lib/format";
import type { SaleRow } from "@/types/domain";

export const Route = createFileRoute("/_app/sales")({
  head: () => ({
    meta: [
      { title: "Ventas y recaudos · Reserva Operaciones" },
      {
        name: "description",
        content: "Recaudos por tienda, operador y categoría, con totales y estado de cada pago.",
      },
      { property: "og:title", content: "Ventas y recaudos · Reserva Operaciones" },
      {
        property: "og:description",
        content: "Recaudos por tienda, operador y categoría, con totales y estado de cada pago.",
      },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () =>
      MOCK_SALES.filter((row) =>
        `${row.store} ${row.operator} ${row.category}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [query],
  );

  const total = rows
    .filter((row) => row.status === "confirmed")
    .reduce((sum, row) => sum + row.amount, 0);

  const columns: DataTableColumn<SaleRow>[] = [
    { key: "date", header: "Fecha", render: (row) => row.date },
    { key: "store", header: "Tienda", render: (row) => <span className="font-medium">{row.store}</span> },
    { key: "operator", header: "Operador", render: (row) => row.operator },
    { key: "category", header: "Categoría", render: (row) => row.category },
    {
      key: "amount",
      header: "Monto",
      align: "right",
      render: (row) => <span className="tabular">{formatCurrency(row.amount)}</span>,
    },
    {
      key: "status",
      header: "Estado",
      align: "right",
      render: (row) => (
        <StatusBadge tone={row.status === "confirmed" ? "success" : "danger"}>
          {row.status === "confirmed" ? "Confirmado" : "Anulado"}
        </StatusBadge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Ventas / Recaudos"
        description="Preparado para conectar las tablas payments y sales."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total recaudado" value={formatCurrency(total)} hint="registros confirmados" />
        <StatCard label="Recaudos" value={String(rows.length)} hint="en el periodo mostrado" />
        <StatCard
          label="Anulados"
          value={String(rows.filter((r) => r.status === "voided").length)}
          hint="requieren revisión"
        />
      </div>

      <SearchBar
        value={query}
        onValueChange={setQuery}
        placeholder="Buscar por tienda, operador o categoría…"
        label="Buscar recaudo"
        className="max-w-md"
      />

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        caption="Recaudos registrados"
        emptyTitle="Sin recaudos"
      />
    </>
  );
}
