"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut } from "../auth";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await getCurrentUser();
        if (!userData) {
          router.push("/login");
          return;
        }
        setUser(userData);
      } catch (error) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="page-container">
        <h2>Carregando...</h2>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Bem-vindo ao Trip-Expense</h1>
      <p className="welcome-text">
        Sistema de Controle de Despesas de Viagens de Negócios
      </p>

      {user && (
        <div>
          <p className="welcome-text">Olá, {user.nome}</p>
          <p className="welcome-text">Usuário: {user.login}</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              signOut();
              router.push("/login");
            }}
            style={{ maxWidth: "200px", margin: "0 auto", display: "block" }}>
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
