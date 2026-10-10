"use client";

import { Toaster as SonnerToaster } from "sonner";

// Notifiche discrete in basso: confermano salvataggi e invii senza bloccare la pagina.
export function Toaster() {
  return <SonnerToaster position="bottom-left" richColors={false} closeButton toastOptions={{ className: "toast" }} />;
}
