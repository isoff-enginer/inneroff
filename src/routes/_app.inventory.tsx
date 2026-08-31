import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { SearchBar } from "@/components/common/search-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MOCK_CATEGORIES, MOCK_INVENTORY, MOCK_LOCATIONS } from "@/features/inventory/mock-data";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { InventoryRow } from "@/types/domain";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({
    meta: [
      { title: "Inventario · Reserva Operaciones" },
      {
        name: "description",
        content: "Consulta el inventario por fábrica, bodega, tienda, categoría y producto.",
      },
      { property: "og:title", content: "Inventario · Reserva Operaciones" },
      {
        property: "og:description",
        content: "Consulta el inventario por fábrica, bodega, tienda, categoría y producto.",
      },
    ],
  }),
  component: InventoryPage,
});

const ALL = "all";

function InventoryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [location, setLocation] = useState(ALL);

  const rows = useMemo(
    () =>
      MOCK_INVENTORY.filter((row) => {
        const matchesQuery = row.product.toLowerCase().includes(query.trim().toLowerCase());
        const matchesCategory = category === ALL || row.category === category;
        const matchesLocation = location === ALL || row.locationName === location;
        return matchesQuery && matchesCategory && matchesLocation;
      }),
    [query, category, location],
  );

  const columns: DataTableColumn<InventoryRow>[] = [
    { key: "product", header: "Producto", render: (row) => <span className="font-medium">{row.product}</span> },
    { key: "category", header: "Categoría", render: (row) => row.category },
    { key: "location", header: "Ubicación", render: (row) => row.locationName },
    {
      key: "quantity",
      header: "Cantidad",
      align: "right",
      render: (row) => <span className="tabular">{formatNumber(row.quantity)}</span>,
    },
    {
      key: "value",
      header: "Valor",
      align: "right",
      render: (row) => (
        <span className="tabular">{formatCurrency(row.quantity * row.unitValue)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Datos de demostración. La fuente real se conectará a Supabase."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SearchBar
          value={query}
          onValueChange={setQuery}
          placeholder="Buscar producto…"
          label="Buscar producto"
          className="lg:col-span-2"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger aria-label="Filtrar por categoría">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las categorías</SelectItem>
            {MOCK_CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger aria-label="Filtrar por ubicación">
            <SelectValue placeholder="Ubicación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las ubicaciones</SelectItem>
            {MOCK_LOCATIONS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        caption="Inventario por producto y ubicación"
        emptyTitle="Sin inventario para estos filtros"
      />
    </>
  );
}
