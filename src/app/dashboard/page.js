"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, signOut } from "../auth";
import { getSupabaseClient } from "../supabaseClient";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [viagens, setViagens] = useState([]);
  // Removemos a variável viagensRecentes separada
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verificação direta, sem necessidade de função assíncrona adicional
    const userData = getCurrentUser();

    if (!userData) {
      router.replace("/login");
      return;
    }

    setUser(userData);
    fetchViagens(userData);
  }, [router]);

  const fetchViagens = async (userData) => {
    try {
      setLoading(true);
      // É necessário especificar o esquema "viagem" para conectar à tabela correta
      const supabase = getSupabaseClient("viagem");

      console.log("Tentando buscar viagens para usuário:", userData.usuario_id);

      let query = supabase.from("tbviagem").select(`
        viagem_id,
        data_ida,
        data_volta,
        destino,
        motivo,
        observacoes,
        usuario_id
      `);

      // Se não for admin, mostrar apenas as próprias viagens
      if (userData.login !== "admin") {
        query = query.eq("usuario_id", userData.usuario_id);
      }

      // Log da consulta antes de executá-la
      console.log("Executando consulta no Supabase (esquema: viagem)");

      const { data, error } = await query;

      if (error) {
        console.error("Erro retornado pelo Supabase:", error);
        throw error;
      }

      console.log(
        "Viagens recuperadas com sucesso:",
        data?.length || 0,
        "registros"
      );

      // Todas as viagens
      setViagens(data || []);
    } catch (err) {
      console.error("Detalhes do erro:", err);

      // Definir dados vazios para evitar erros na interface
      setViagens([]);

      // Tenta exibir mais informações sobre o erro
      if (err) {
        if (err.message) console.error("Mensagem de erro:", err.message);
        if (err.code) console.error("Código de erro:", err.code);
        if (err.details) console.error("Detalhes do erro:", err.details);
        if (err.hint) console.error("Dica:", err.hint);
      }
    } finally {
      setLoading(false);
    }
  };

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
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="welcome-text">Olá, {user.nome}</p>
        </div>
        <div className="user-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <nav className="main-nav">
        <Link href="/dashboard" className="nav-link active">
          Dashboard
        </Link>
        <Link href="/dashboard/viagens" className="nav-link">
          Viagens
        </Link>
        {user.tipo_usuario === 2 && (
          <Link href="/dashboard/usuarios" className="nav-link">
            Usuários
          </Link>
        )}
      </nav>

      <div className="dashboard-content">
        <section className="card">
          <div className="card-header">
            <h2>Resumo</h2>
          </div>
          <div className="card-content">
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>Total de Viagens</h3>
                <div className="metric-value">
                  {viagens ? viagens.length : 0}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Viagens Recentes</h2>
            <Link
              href="/dashboard/viagens"
              className="btn btn-sm btn-secondary">
              Ver todas
            </Link>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading">Carregando viagens...</div>
            ) : viagens && viagens.length > 0 ? (
              <div className="trips-grid">
                {viagens.slice(0, 3).map((viagem) => (
                  <Link
                    href={`/dashboard/viagens/${viagem.viagem_id}`}
                    key={viagem.viagem_id}
                    className="trip-card">
                    <h3 className="trip-destination">
                      {viagem.destino || "Sem destino"}
                    </h3>
                    <div className="trip-dates">
                      {formatarData(viagem.data_ida)} a{" "}
                      {formatarData(viagem.data_volta)}
                    </div>
                    <p className="trip-reason">
                      {viagem.motivo || "Sem motivo especificado"}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>Você não tem viagens recentes</p>
                <Link
                  href="/dashboard/viagens/nova"
                  className="btn btn-primary">
                  Criar Nova Viagem
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Ações Rápidas</h2>
          </div>
          <div className="card-content">
            <div className="actions-grid">
              <Link href="/dashboard/viagens/nova" className="action-card">
                <div className="action-icon">➕</div>
                <span className="action-text">Nova Viagem</span>
              </Link>
              {user.tipo_usuario === 2 && (
                <>
                  <Link
                    href="/dashboard/viagens?filtro=pendente"
                    className="action-card">
                    <div className="action-icon">✓</div>
                    <span className="action-text">Aprovar Viagens</span>
                  </Link>
                  <Link
                    href="/dashboard/despesas?status=pendente"
                    className="action-card">
                    <div className="action-icon">💰</div>
                    <span className="action-text">Reembolsos Pendentes</span>
                  </Link>
                </>
              )}
            </div>
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
        
        .user-role {
          font-size: 0.9rem;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          background-color: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
        }
        
        .main-nav {
          display: flex;
          gap: 1.5rem; /* Aumentado de 0.5rem para 1.5rem para maior espaçamento entre os botões */
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
          content: '';
          position: absolute;
          bottom: -0.5rem;
          left: 0;
          width: 100%;
          height: 2px;
          background-color: var(--primary-color);
        }
        
        .dashboard-content {
          display: grid;
          gap: 1.5rem;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        
        .metric-card {
          background-color: rgba(255, 255, 255, 0.03);
          padding: 1rem;
          border-radius: var(--radius-sm);
          text-align: center;
          border: 1px solid var(--border-color);
        }
        
        .metric-card h3 {
          font-size: 0.9rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: var(--text-secondary);
        }
        
        .metric-value {
          font-size: 2rem;
          font-weight: 700;
        }
        
        .metric-value.pending {
          color: var(--warning-color);
        }
        
        .metric-value.approved {
          color: var(--success-color);
        }
        
        .metric-value.rejected {
          color: var(--error-color);
        }
        
        .metric-value.completed {
          color: var(--info-color);
        }
        
        .trips-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        
        .trip-card {
          background-color: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 1rem;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          text-decoration: none;
          color: var(--text-color);
        }
        
        .trip-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        
        .trip-destination {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }
        
        .trip-dates {
          color: var(--text-secondary);
          font-size: 0.85rem;
          margin-bottom: 0.75rem;
        }
        
        .trip-reason {
          font-size: 0.9rem;
          margin-bottom: 1rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          color: var(--text-color);
        }
        
        .trip-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
        }
        
        .action-card {
          background-color: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 1.25rem;
          text-align: center;
          text-decoration: none;
          color: var(--text-color);
          transition: transform 0.15s ease, background-color 0.15s ease;
        }
        
        .action-card:hover {
          transform: translateY(-2px);
          background-color: rgba(255, 255, 255, 0.05);
        }
        
        .action-icon {
          font-size: 1.75rem;
          margin-bottom: 0.75rem;
        }
        
        .action-text {
          font-size: 0.95rem;
        }
        
          background-color: rgba(255, 255, 255, 0.03);
          color: var(--text-color);
          text-decoration: none;
          transition: var(--transition);
          border: 1px solid var(--border-color);
        }
        
        .action-item:hover {
          background-color: rgba(255, 255, 255, 0.05);
          transform: translateY(-2px);
        }
        
        .action-icon {
          font-size: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .action-label {
          font-size: 0.9rem;
        }
        
        .empty-state {
          text-align: center;
          padding: 2.5rem 1rem;
        }
        
        .empty-state p {
          color: var(--text-secondary);
          margin-bottom: 1rem;
        }
        
        .loading {
          padding: 1.5rem;
          text-align: center;
          color: var(--text-secondary);
        }
        
        @media (min-width: 768px) {
          .dashboard-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .dashboard-grid section:first-child {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </div>
  );
}

// Função auxiliar para formatar datas
function formatarData(dataStr) {
  if (!dataStr) return "";
  const [ano, mes, dia] = dataStr.split("-");
  return `${dia}/${mes}/${ano}`;
}
