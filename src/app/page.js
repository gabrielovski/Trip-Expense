"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "./auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Verificação simples e redireciona imediatamente
    const user = getCurrentUser();
    router.replace(user ? "/dashboard" : "/login");
  }, [router]);

  // UI minimalista sem estado loading desnecessário
  return (
    <div className="page-container" style={{ textAlign: "center" }}>
      <h2>Trip-Expense</h2>
      <p>Carregando...</p>
    </div>
  );
}
