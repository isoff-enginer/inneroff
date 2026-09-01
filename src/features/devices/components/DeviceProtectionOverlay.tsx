import { useState, useEffect, type ReactNode } from "react";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { getProtectedData } from "../../messages/crypto/KeyStore";
import type { DeviceIdentityPublicRecord } from "../../messages/crypto/DeviceIdentity";
import { useSession } from "../../auth/session";

type ProtectionState = "checking" | "setup_pin" | "confirm_pin" | "registering" | "error" | "protected";

export function DeviceProtectionOverlay({ children }: { children: ReactNode }) {
  const { isAuthenticated, registerDevice } = useSession();
  
  const [currentState, setCurrentState] = useState<ProtectionState>("checking");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Solo ejecutar lógica en el cliente
  useEffect(() => {
    if (typeof window === "undefined" || !isAuthenticated) {
      return;
    }

    let mounted = true;

    async function verifyLocalIdentity() {
      try {
        const publicRecord = await getProtectedData('identity', 'local_device_identity_public') as DeviceIdentityPublicRecord | null;
        
        if (!mounted) return;

        // Comprobación defensiva para garantizar que la identidad no esté corrupta
        if (
          publicRecord &&
          publicRecord.device_id &&
          publicRecord.public_identity_key_b64 &&
          publicRecord.public_agreement_key_b64
        ) {
          // LOCAL_IDENTITY_EXISTS (válida)
          setCurrentState("protected");
        } else {
          // LOCAL_IDENTITY_MISSING o LOCAL_IDENTITY_INVALID
          // Asumimos que necesita generar o regenerar una identidad de forma segura.
          setCurrentState("setup_pin");
        }
      } catch (err) {
        console.error("Error al verificar identidad local", err);
        if (mounted) {
          setCurrentState("setup_pin"); // Permite reinicializar
        }
      }
    }

    verifyLocalIdentity();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  // Si no está autenticado, el overlay no interviene
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Prevenir renderizado durante SSR o mientras se verifica
  if (currentState === "checking") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary/50" />
      </div>
    );
  }

  if (currentState === "protected") {
    return <>{children}</>;
  }

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) return;
    setCurrentState("confirm_pin");
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin !== confirmPin) {
      setErrorMessage("Los PIN no coinciden.");
      return;
    }

    setErrorMessage("");
    setCurrentState("registering");

    let currentPin = pin; // Copia estricta a memoria local de la función
    
    try {
      await registerDevice(currentPin);
      
      // Verificación defensiva post-registro
      const publicRecord = await getProtectedData('identity', 'local_device_identity_public') as DeviceIdentityPublicRecord | null;
      if (publicRecord?.device_id) {
        setCurrentState("protected");
      } else {
        throw new Error("Local identity missing after registration");
      }
    } catch (err) {
      setCurrentState("error");
    } finally {
      // Limpieza absoluta
      currentPin = "";
      setPin("");
      setConfirmPin("");
    }
  };

  // --- RENDER UI (Minimalista, Estilo iOS) ---
  
  if (currentState === "registering") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <Loader2 className="size-12 animate-spin text-primary mb-6" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Protegiendo dispositivo...</h1>
      </div>
    );
  }

  if (currentState === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <AlertCircle className="size-16 text-destructive mb-6" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">No pudimos proteger este dispositivo.</h1>
        <p className="text-[15px] text-muted-foreground mb-10 max-w-sm mx-auto">
          Inténtalo nuevamente para continuar usando la aplicación de forma segura.
        </p>
        <button
          onClick={() => setCurrentState("setup_pin")}
          className="h-14 w-full max-w-xs mx-auto rounded-2xl bg-primary px-8 text-[17px] font-semibold text-primary-foreground active:scale-[0.98] transition-transform"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  const isSetup = currentState === "setup_pin";
  const inputValue = isSetup ? pin : confirmPin;
  const setInputValue = isSetup ? setPin : setConfirmPin;
  const isInputValid = inputValue.length >= 4 && inputValue.length <= 6 && /^\d+$/.test(inputValue);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="size-8 text-primary" />
        </div>
        
        <h1 className="text-[28px] font-bold tracking-tight text-foreground mb-3">
          {isSetup ? "Protege tu dispositivo" : "Confirma tu PIN"}
        </h1>
        
        <p className="text-[16px] text-muted-foreground mb-10 leading-relaxed">
          {isSetup 
            ? "Configura un PIN para proteger la identidad de este dispositivo." 
            : "Ingresa el mismo PIN numérico nuevamente."}
        </p>

        <form onSubmit={isSetup ? handlePinSubmit : handleConfirmSubmit} className="flex flex-col items-center">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            minLength={4}
            value={inputValue}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || /^\d+$/.test(val)) {
                setInputValue(val);
                setErrorMessage("");
              }
            }}
            className="mb-8 h-16 w-full max-w-[240px] rounded-2xl border-2 border-border bg-transparent text-center text-3xl font-bold tracking-[0.3em] text-foreground focus:border-primary focus:outline-none transition-colors"
            autoFocus
          />

          {errorMessage && (
            <p className="text-sm font-medium text-destructive mb-6 -mt-2">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={!isInputValid}
            className="h-14 w-full rounded-2xl bg-primary px-8 text-[17px] font-semibold text-primary-foreground disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] transition-transform"
          >
            {isSetup ? "Continuar" : "Activar seguridad"}
          </button>
          
          {!isSetup && (
            <button
              type="button"
              onClick={() => {
                setCurrentState("setup_pin");
                setConfirmPin("");
              }}
              className="mt-4 h-12 w-full text-[15px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Volver
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
