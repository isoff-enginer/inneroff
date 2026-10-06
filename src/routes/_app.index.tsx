import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Panel de Operación · Reserva" },
      {
        name: "description",
        content: "Sistema central de control de operaciones, despachos con derivadas y recaudos.",
      },
    ],
  }),
  component: IndexRedirect,
});

function IndexRedirect() {
  return <Navigate to="/dashboard" />;
}
