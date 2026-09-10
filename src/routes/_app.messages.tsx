import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/messages")({
  head: () => ({
    meta: [
      { title: "Mensajes · Reserva Operaciones" },
      {
        name: "description",
        content: "Mensajería interna del equipo de operación.",
      },
    ],
  }),
  component: MessagesLayout,
});

function MessagesLayout() {
  return <Outlet />;
}
