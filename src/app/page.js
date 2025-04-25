"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "./auth";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Verificar autenticação com manejo de erros melhorado
    const checkAuth = async () => {
      try {
        const user = getCurrentUser();
        console.log(
          "Estado de autenticação:",
          user ? "Autenticado" : "Não autenticado"
        );

        // Pequeno delay para evitar flash de conteúdo
        setTimeout(() => {
          router.replace(user ? "/dashboard" : "/login");
        }, 300);
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        setError(
          "Ocorreu um erro ao verificar a autenticação. Redirecionando para login..."
        );

        // Em caso de erro, redirecionar para login
        setTimeout(() => {
          router.replace("/login");
        }, 1500);
      }
    };

    checkAuth();

    // Timeout de segurança para garantir redirecionamento
    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        console.log(
          "Timeout de segurança acionado - redirecionando para login"
        );
        router.replace("/login");
      }
    }, 3000);

    return () => clearTimeout(safetyTimeout);
  }, [router, isLoading]);

  // UI com feedback visual e tratamento de erro
  return (
    <div className="page-container" style={{ textAlign: "center" }}>
      <h2>Trip-Expense</h2>
      {error ? (
        <div className="error-message" style={{ margin: "1rem 0" }}>
          {error}
        </div>
      ) : (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Carregando aplicação...</p>
        </div>
      )}

      <style jsx>{`
        .loading-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-top: 2rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          border-top-color: var(--primary-color);
          animation: spin 1s ease infinite;
          margin-bottom: 1rem;
        }

        .error-message {
          color: var(--error-color);
          padding: 1rem;
          background-color: rgba(239, 68, 68, 0.1);
          border-radius: var(--radius-sm);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
