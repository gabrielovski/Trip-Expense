"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut } from "../auth";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Verificação direta, sem necessidade de função assíncrona adicional
    const userData = getCurrentUser();

    if (!userData) {
      router.replace("/login");
      return;
    }

    setUser(userData);
  }, [router]);

  const handleLogout = () => {
    signOut();
    router.replace("/login");
  };

  // Se não tiver usuário, mostra apenas tela de carregamento
  if (!user) {
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

      <div>
        <p className="welcome-text">Olá, {user.nome}</p>
        <p className="welcome-text">Usuário: {user.login}</p>
        <button
          className="btn btn-primary"
          onClick={handleLogout}
          style={{ maxWidth: "200px", margin: "0 auto", display: "block" }}>
          Sair
        </button>
      </div>
    </div>
  );
}
