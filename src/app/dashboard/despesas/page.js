"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "../../auth";
import { getSupabaseClient } from "../../supabaseClient";

export default function Despesas() {
  const [user, setUser] = useState(null);
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const router = useRouter();

  useEffect(() => {
    const userData = getCurrentUser();

    if (!userData) {
      router.replace("/login");
      return;
    }

    setUser(userData);
    fetchDespesas(userData);
  }, [router]);

  const fetchDespesas = async (userData) => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient("financeiro");

      let query = supabase.from("tbdespesas").select(`
        despesa_id,
        descricao,
        valor,
        data,
        status,
        viagem_id,
        usuario_id,
        viagem_data:viagem_id(data_ida, destino, viagem_id)
      `); // Se não for admin ou gabriel, mostrar apenas as próprias despesas
      if (
        userData.tipo_usuario !== 2 &&
        userData.login !== "admin" &&
        userData.login !== "gabriel"
      ) {
        query = query.eq("usuario_id", userData.usuario_id);
      }

      // Ordenar por data decrescente
      query = query.order("data", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar despesas:", error);
        throw error;
      }

      setDespesas(data || []);
    } catch (err) {
      console.error("Detalhes do erro:", err);
      setDespesas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    signOut();
    router.replace("/login");
  };

  const filtrarDespesas = () => {
    return despesas.filter((despesa) => {
      // Filtro por texto na descrição
      const matchTexto = despesa.descricao
        ?.toLowerCase()
        .includes(filtro.toLowerCase());

      // Filtro por status
      const matchStatus =
        statusFiltro === "todos" || despesa.status === statusFiltro;

      return matchTexto && matchStatus;
    });
  };

  const formatarValor = (valor) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor || 0);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pendente":
        return <span className="status-pendente">Pendente</span>;
      case "aprovado":
        return <span className="status-aprovado">Aprovado</span>;
      case "rejeitado":
        return <span className="status-rejeitado">Rejeitado</span>;
      default:
        return status;
    }
  };

  if (!user) {
    return (
      <div className="page-container">
        <h2>Carregando...</h2>
      </div>
    );
  }

  const despesasFiltradas = filtrarDespesas();

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Despesas</h1>
          <p className="welcome-text">Olá, {user.nome}</p>
        </div>
        <div className="user-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>{" "}
      <nav className="main-nav">
        <Link href="/dashboard" className="nav-link">
          Dashboard
        </Link>
        <Link href="/dashboard/viagens" className="nav-link">
          Viagens
        </Link>
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
            <div className="filter-container">
              <input
                type="text"
                placeholder="Buscar despesas..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="search-input"
              />
              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
                className="status-filter">
                <option value="todos">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="aprovado">Aprovado</option>
                <option value="rejeitado">Rejeitado</option>
              </select>
            </div>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading">Carregando despesas...</div>
            ) : despesasFiltradas.length > 0 ? (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Valor</th>
                      <th>Data</th>
                      <th>Viagem</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {despesasFiltradas.map((despesa) => (
                      <tr key={despesa.despesa_id}>
                        <td>{despesa.descricao}</td>
                        <td>{formatarValor(despesa.valor)}</td>
                        <td>
                          {despesa.data
                            ? new Date(despesa.data).toLocaleDateString()
                            : "-"}
                        </td>
                        <td>
                          {despesa.viagem_data ? (
                            <Link
                              href={`/dashboard/viagens/${despesa.viagem_id}`}
                              className="link-destino">
                              {despesa.viagem_data.destino}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>{getStatusLabel(despesa.status)}</td>
                        <td className="actions-cell">
                          <Link
                            href={`/dashboard/viagens/${despesa.viagem_id}/despesas/${despesa.despesa_id}`}
                            className="btn btn-sm btn-info">
                            Detalhes
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>Nenhuma despesa encontrada</p>
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

        .filter-container {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          width: 100%;
        }

        .search-input {
          flex-grow: 1;
          min-width: 200px;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background-color: rgba(255, 255, 255, 0.05);
          color: var(--text-color);
        }

        .status-filter {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background-color: rgba(255, 255, 255, 0.05);
          color: var(--text-color);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
        }

        .table th,
        .table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }

        .table th {
          font-weight: 500;
          color: var(--text-secondary);
        }

        .table tr:hover {
          background-color: rgba(255, 255, 255, 0.02);
        }

        .actions-cell {
          display: flex;
          gap: 0.5rem;
        }

        .status-pendente {
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          background-color: rgba(255, 193, 7, 0.2);
          color: #ffc107;
          font-size: 0.875rem;
        }

        .status-aprovado {
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          background-color: rgba(40, 167, 69, 0.2);
          color: #28a745;
          font-size: 0.875rem;
        }

        .status-rejeitado {
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          background-color: rgba(220, 53, 69, 0.2);
          color: #dc3545;
          font-size: 0.875rem;
        }

        .link-destino {
          color: var(--primary-color);
          text-decoration: none;
        }

        .link-destino:hover {
          text-decoration: underline;
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

        .table-responsive {
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}
