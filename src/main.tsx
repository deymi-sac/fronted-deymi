import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import { Toaster } from "./components/ui/Toaster";
import { notificar } from "./lib/toast";
import "./index.css";

// Las mutaciones que declaran meta.exito avisan con un toast al terminar bien
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_datos, _vars, _ctx, mutacion) => {
      const exito = mutacion.meta?.exito;
      if (typeof exito === "string") notificar(exito);
    },
  }),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);