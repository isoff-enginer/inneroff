import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/features/auth/session";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

type ContactArea = "Administración" | "Operaciones" | "Fábrica" | "Bodega" | "Tienda";

interface Contact {
  id: string;
  name: string;
  areas: ContactArea[]; // Can belong to multiple areas visually
  roles: string[];      // Raw effective roles
}

function canMessageRoles(sourceRoles: string[], targetRoles: string[]): boolean {
  if (!sourceRoles.length || !targetRoles.length) return false;

  for (const sRole of sourceRoles) {
    for (const tRole of targetRoles) {
      if (['boss', 'boss_admin'].includes(sRole) || ['boss', 'boss_admin'].includes(tRole)) return true;
      if (sRole === 'operations_admin' && ['factory', 'warehouse', 'store'].includes(tRole)) return true;
      if (tRole === 'operations_admin' && ['factory', 'warehouse', 'store'].includes(sRole)) return true;
      if (sRole === 'factory' && ['warehouse', 'store'].includes(tRole)) return true;
      if (tRole === 'factory' && ['warehouse', 'store'].includes(sRole)) return true;
      if (sRole === 'warehouse' && ['store', 'factory'].includes(tRole)) return true;
      if (tRole === 'warehouse' && ['store', 'factory'].includes(sRole)) return true;
      if (sRole === 'store' && ['warehouse', 'factory'].includes(tRole)) return true;
      if (tRole === 'store' && ['warehouse', 'factory'].includes(sRole)) return true;
    }
  }
  return false;
}

function mapRoleToArea(role: string): ContactArea {
  switch (role) {
    case 'boss':
    case 'boss_admin':
      return "Administración";
    case 'operations_admin':
      return "Operaciones";
    case 'factory':
      return "Fábrica";
    case 'warehouse':
      return "Bodega";
    case 'store':
      return "Tienda";
    default:
      return "Fábrica";
  }
}

export function NewMessageModal({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeArea, setActiveArea] = useState<ContactArea | "Todos">("Todos");
  const [isCreating, setIsCreating] = useState(false);

  const userRoles = useMemo(() => {
    const roles: string[] = [];
    if (user?.role === "boss") roles.push("boss");
    if (user?.role === "boss_admin") roles.push("boss_admin");
    if (user?.role === "operations_admin") roles.push("operations_admin");
    if (user?.role === "factory") roles.push("factory");
    if (user?.factoryId && !roles.includes("factory")) roles.push("factory");
    if (user?.warehouseId) roles.push("warehouse");
    if (user?.storeId) roles.push("store");
    return roles;
  }, [user]);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, full_name, role, status,
          store_users(store_id),
          warehouse_users(warehouse_id),
          factory_users(factory_id)
        `)
        .eq("status", "active")
        .neq("id", user?.id);

      if (error) throw error;

      return data.map((p: any): Contact => {
        const roles: string[] = [];
        
        if (p.role === 'boss') roles.push('boss');
        if (p.role === 'boss_admin') roles.push('boss_admin');
        if (p.role === 'operations_admin') roles.push('operations_admin');
        if (p.role === 'factory') roles.push('factory');
        
        if (p.warehouse_users && p.warehouse_users.length > 0) roles.push('warehouse');
        if (p.store_users && p.store_users.length > 0) roles.push('store');
        if (!roles.includes('factory') && p.factory_users && p.factory_users.length > 0) roles.push('factory');

        // Eliminar duplicados si los hubiera
        const uniqueRoles = Array.from(new Set(roles));
        const areas = Array.from(new Set(uniqueRoles.map(mapRoleToArea)));

        return {
          id: p.id,
          name: p.full_name,
          roles: uniqueRoles,
          areas
        };
      });
    },
    enabled: open && !!user
  });

  const handleCreateConversation = async (contactId: string) => {
    try {
      setIsCreating(true);
      console.log(`[NewMessage] target_user_id=${contactId}`);
      console.log(`[NewMessage] calling create_direct_conversation`);
      
      const { data, error } = await supabase.rpc("create_direct_conversation", {
        target_user_id: contactId
      });

      if (error) {
        console.error(`[NewMessage] rpc error=${error.code}/${error.message}`);
        throw error;
      }

      console.log(`[NewMessage] rpc result=${data}`);
      console.log(`[NewMessage] navigating to conversation=${data}`);
      
      toast.success("Conversación iniciada");
      setOpen(false);
      navigate({ to: "/messages/$conversationId", params: { conversationId: data as string } });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al iniciar la conversación");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredContacts = contacts?.filter(c => {
    // 1. Check if communication is allowed by matrix
    if (!canMessageRoles(userRoles, c.roles)) return false;
    
    // 2. Filter by selected UI tab
    if (activeArea !== "Todos" && !c.areas.includes(activeArea)) return false;
    
    // 3. Search text
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    
    return true;
  });

  const allAvailableAreas = Array.from(new Set(contacts?.filter(c => canMessageRoles(userRoles, c.roles)).flatMap(c => c.areas) || []));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden flex flex-col h-[85vh] sm:h-[600px]">
        <DialogHeader className="p-5 pb-4 border-b border-border bg-card">
          <DialogTitle>Nuevo mensaje</DialogTitle>
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar persona o área..." 
              className="pl-9 bg-background" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-3">
            <div className="flex flex-wrap gap-1.5 mb-4">
              <Button 
                variant={activeArea === "Todos" ? "default" : "secondary"} 
                size="sm" 
                className="rounded-full text-xs h-7"
                onClick={() => setActiveArea("Todos")}
              >
                Todos
              </Button>
              {allAvailableAreas.map(area => (
                <Button
                  key={area}
                  variant={activeArea === area ? "default" : "secondary"} 
                  size="sm" 
                  className="rounded-full text-xs h-7"
                  onClick={() => setActiveArea(area)}
                >
                  {area}
                </Button>
              ))}
            </div>

            {isLoading ? (
              <div className="text-center p-8 text-sm text-muted-foreground">Cargando contactos...</div>
            ) : filteredContacts?.length === 0 ? (
              <div className="text-center p-8 text-sm text-muted-foreground">No se encontraron destinatarios.</div>
            ) : (
              <ul className="space-y-1">
                {filteredContacts?.map(contact => (
                  <li key={contact.id}>
                    <button
                      type="button"
                      disabled={isCreating}
                      onClick={() => handleCreateConversation(contact.id)}
                      className="flex items-center gap-3 w-full p-2 hover:bg-accent rounded-lg text-left transition-colors disabled:opacity-50"
                    >
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarFallback className="bg-background text-xs">
                          {contact.name.substring(0,2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{contact.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{contact.areas.join(", ")}</div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
