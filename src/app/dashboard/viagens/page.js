"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "../../supabaseClient";
import { getCurrentUser, signOut } from "../../auth";

export default function ViagensPage() {
  const [viagens, setViagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const userData = getCurrentUser();
    if (!userData) {
      router.push("/login");
      return;
    }

    setUser(userData);
    fetchViagens(userData);
  }, [router]);

  const fetchViagens = async (userData) => {
    try {
      setLoading(true); // Debug: verificar se o usuário é reconhecido como admin
      console.log("Dados do usuário:", userData);
      console.log("Login do usuário:", userData.login);
      console.log(
        "É admin?",
        userData.login === "admin" || userData.login === "gabriel"
      );

      const supabase = getSupabaseClient("viagem");
      // Consulta correta para schema viagem
      let query = supabase.from("tbviagem").select(`
        viagem_id,
        data_ida,
        data_volta,
        destino,
        motivo,
        observacoes,
        atualizado_por,
        usuario_id      `);

      // Se não for admin, mostrar apenas as próprias viagens
      if (userData.login !== "admin" && userData.login !== "gabriel") {
        console.log("Aplicando filtro por usuario_id:", userData.usuario_id);
        query = query.eq("usuario_id", userData.usuario_id);
      } else {
        console.log("Usuário é admin, mostrando todas as viagens");
      }

      const { data, error } = await query.order("data_ida", {
        ascending: false,
      });

      if (error) throw error;

      setViagens(data || []);
    } catch (err) {
      // Método melhorado para exibir detalhes do erro
      console.error(
        "Erro ao buscar viagens (mensagem):",
        err?.message || "Erro sem mensagem"
      );

      // Evitar tentativas de acessar propriedades de um erro nulo/indefinido
      if (err) {
        // Usar console.log para informações mais detalhadas
        console.log("Objeto de erro completo:", err);

        // Exibir apenas propriedades que realmente existem
        const errorDetails = {};

        if (err.name) errorDetails.name = err.name;
        if (err.code) errorDetails.code = err.code;
        if (err.details) errorDetails.details = err.details;
        if (err.hint) errorDetails.hint = err.hint;
        if (err.status) errorDetails.status = err.status;

        console.log("Detalhes filtrados do erro:", errorDetails);
      } else {
        console.log("O erro é nulo ou indefinido");
      }

      setError(
        "Não foi possível carregar as viagens. Verifique a conexão com o banco de dados."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    signOut();
    router.replace("/login");
  };

  if (!user) {
    return (
      <div className="page-container">
        <h2>Carregando...</h2>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Minhas Viagens</h1>
          <p className="welcome-text">Olá, {user.nome}</p>
        </div>
        <div className="user-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>{" "}
      <nav className="main-nav">
        {" "}
        <Link href="/dashboard" className="nav-link">
          Dashboard
        </Link>
        <Link href="/dashboard/viagens" className="nav-link active">
          Viagens
        </Link>{" "}
        <Link href="/dashboard/usuarios" className="nav-link">
          Usuários
        </Link>
        {(user.login === "admin" || user.login === "gabriel") && (
          <Link href="/dashboard/teste-conexao" className="nav-link diagnostic">
            Diagnóstico
          </Link>
        )}
      </nav>
      <div className="dashboard-content">
        <section className="card">
          <div className="card-header">
            <h2>Lista de Viagens</h2>
            <Link
              href="/dashboard/viagens/nova"
              className="btn btn-primary btn-sm">
              Nova Viagem
            </Link>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading">Carregando viagens...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : viagens.length === 0 ? (
              <div className="empty-state">
                <p>Nenhuma viagem encontrada</p>
                <Link
                  href="/dashboard/viagens/nova"
                  className="btn btn-primary">
                  Criar Nova Viagem
                </Link>
              </div>
            ) : (
              <div className="viagens-grid">
                {viagens.map((viagem) => (
                  <Link
                    href={`/dashboard/viagens/${viagem.viagem_id}`}
                    key={viagem.viagem_id}
                    className="viagem-card">
                    <div className="viagem-header">
                      <h3>{viagem.destino}</h3>
                    </div>
                    <div className="viagem-date">
                      {formatarDataLocal(viagem.data_ida)} -{" "}
                      {formatarDataLocal(viagem.data_volta)}
                    </div>
                    <div className="viagem-motivo">{viagem.motivo}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .welcome-text {
          color: var(--text-secondary);
          margin: 0;
        }

        .user-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .main-nav {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
        }

        .nav-link {
          padding: 0.5rem 1rem;
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: var(--radius-sm);
          transition: var(--transition);
        }

        .nav-link:hover {
          color: var(--text-color);
          background-color: rgba(255, 255, 255, 0.05);
        }

        .nav-link.active {
          color: var(--primary-color);
          font-weight: 500;
          position: relative;
        }

        .nav-link.active::after {
          content: "";
          position: absolute;
          bottom: -0.5rem;
          left: 0;
          width: 100%;
          height: 2px;
          background-color: var(--primary-color);
        }

        .nav-link.diagnostic {
          color: #ff9800;
        }

        .nav-link.diagnostic:hover {
          background-color: rgba(255, 152, 0, 0.1);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .viagens-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }

        .viagem-card {
          background-color: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 1.25rem;
          text-decoration: none;
          color: var(--text-color);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .viagem-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .viagem-header h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
        }

        .viagem-date {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
          font-weight: 500;
        }

        .viagem-motivo {
          margin-bottom: 0;
          font-size: 0.95rem;
          line-height: 1.6;
          color: var(--text-color);
        }

        .loading {
          text-align: center;
          padding: 2rem 0;
          color: var(--text-secondary);
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
        }

        .empty-state p {
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }

        .error-message {
          color: var(--error-color);
          background-color: rgba(239, 68, 68, 0.1);
          padding: 1.25rem;
          border-radius: var(--radius-sm);
          text-align: center;
          margin: 1.5rem 0;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .viagens-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function formatarDataLocal(dataStr) {
  if (!dataStr) return "";
  const [ano, mes, dia] = dataStr.split("-");
  return `${dia}/${mes}/${ano}`;
}
