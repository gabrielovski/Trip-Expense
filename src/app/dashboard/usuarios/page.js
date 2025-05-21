"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, signOut } from "../../auth";
import { getSupabaseClient } from "../../supabaseClient";

export default function Usuarios() {
  const [user, setUser] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(""); // "edit" ou "delete"
  const router = useRouter();
  useEffect(() => {
    const userData = getCurrentUser();

    if (!userData) {
      router.replace("/login");
      return;
    }

    // Agora todos os usuários podem acessar esta página
    setUser(userData);
    fetchUsuarios();
  }, [router]);
  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      setErrorMessage(""); // Limpar mensagens de erro anteriores
      console.log("Conectando ao Supabase (schema: seguranca)...");
      const supabase = getSupabaseClient("seguranca");

      console.log("Executando consulta para buscar usuários...");
      const { data, error } = await supabase.from("tbusuarios").select(`
          usuario_id,
          nome,
          login,
          atualizado_em
        `);

      if (error) {
        console.error(
          "Erro ao buscar usuários:",
          error.message || JSON.stringify(error)
        );
        setErrorMessage(
          `Erro ao buscar usuários: ${error.message || "Erro desconhecido"}`
        );
        throw error;
      }

      console.log(
        `Busca bem-sucedida: ${data ? data.length : 0} usuários encontrados`
      );
      setUsuarios(data || []);
    } catch (err) {
      console.error("Detalhes do erro:", err.message || JSON.stringify(err));
      if (err.code) console.error("Código do erro:", err.code);
      if (err.details) console.error("Detalhes adicionais:", err.details);
      if (err.hint) console.error("Sugestão:", err.hint);

      setErrorMessage(
        `Falha ao conectar ao banco de dados. ${
          err.message ||
          "Verifique sua conexão com a internet e tente novamente."
        }`
      );
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    signOut();
    router.replace("/login");
  };
  const getTipoUsuario = (usuario) => {
    // Determinar o tipo com base no login
    return usuario.login === "admin" || usuario.login === "gabriel"
      ? "Administrador"
      : "Padrão";
  };
  const handleExcluirUsuario = async (usuarioId, login) => {
    // Não permitir excluir o usuário admin ou gabriel
    if (login === "admin" || login === "gabriel") {
      alert("Não é possível excluir um usuário administrador do sistema.");
      return;
    }

    // Não permitir excluir o usuário atual
    if (user.usuario_id === usuarioId) {
      alert("Não é possível excluir seu próprio usuário.");
      return;
    }

    // Verificar se o usuário atual é admin ou gabriel
    const isAdmin =
      user.login === "admin" ||
      user.login === "gabriel" ||
      user.tipo_usuario === 2;

    if (!isAdmin) {
      // Se não for admin, mostrar modal
      setModalAction("excluir");
      setShowModal(true);
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir o usuário ${login}?`)) {
      try {
        const supabase = getSupabaseClient("seguranca");

        const { error } = await supabase
          .from("tbusuarios")
          .delete()
          .eq("usuario_id", usuarioId);

        if (error) {
          console.error(
            "Erro ao excluir usuário:",
            error.message || JSON.stringify(error)
          );
          alert(
            `Erro ao excluir usuário: ${error.message || "Erro desconhecido"}`
          );
          return;
        }

        // Atualizar a lista de usuários
        fetchUsuarios();
        alert("Usuário excluído com sucesso!");
      } catch (err) {
        console.error(
          "Erro ao excluir usuário:",
          err.message || JSON.stringify(err)
        );
        alert(`Erro ao excluir usuário: ${err.message || "Erro desconhecido"}`);
      }
    }
  };

  const handleEditarUsuario = (usuarioId, login) => {
    // Verifica se o usuário é o próprio usuário logado ou se é admin
    const isAdmin =
      user.login === "admin" ||
      user.login === "gabriel" ||
      user.tipo_usuario === 2;
    const isOwnUser = user.usuario_id === usuarioId;

    if (isAdmin || isOwnUser) {
      // Pode editar se for admin ou o próprio usuário
      router.push(`/dashboard/usuarios/${usuarioId}`);
    } else {
      // Caso contrário, mostra o modal
      setModalAction("editar");
      setShowModal(true);
    }
  };

  const usuariosFiltrados = usuarios.filter((usuario) => {
    return (
      usuario.nome?.toLowerCase().includes(filtro.toLowerCase()) ||
      usuario.login?.toLowerCase().includes(filtro.toLowerCase())
    );
  });

  if (!user) {
    return (
      <div className="page-container">
        <h2>Carregando...</h2>
      </div>
    );
  }

  return (
    <div className="page-container">
      {" "}
      <header className="page-header">
        <div>
          <h1>Gerenciamento de Usuários</h1>
          <p className="welcome-text">Olá, {user.nome}</p>
        </div>
        <div className="user-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>
      <nav className="main-nav">
        <Link href="/dashboard" className="nav-link">
          Dashboard
        </Link>
        <Link href="/dashboard/viagens" className="nav-link">
          Viagens
        </Link>
        <Link href="/dashboard/usuarios" className="nav-link active">
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
            <div className="search-container">
              <input
                type="text"
                placeholder="Buscar usuários..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="search-input"
              />
            </div>
            <Link
              href="/dashboard/usuarios/novo"
              className="btn btn-primary btn-sm">
              {" "}
              Novo Usuário
            </Link>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading">Carregando usuários...</div>
            ) : errorMessage ? (
              <div className="error-message">
                <p>{errorMessage}</p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => fetchUsuarios()}>
                  Tentar novamente
                </button>
              </div>
            ) : usuariosFiltrados.length > 0 ? (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Login</th>
                      <th>Tipo</th>
                      <th>Última Atualização</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosFiltrados.map((usuario) => (
                      <tr key={usuario.usuario_id}>
                        <td>{usuario.nome || "-"}</td>
                        <td>{usuario.login}</td>
                        <td>{getTipoUsuario(usuario)}</td>
                        <td>
                          {usuario.atualizado_em
                            ? new Date(
                                usuario.atualizado_em
                              ).toLocaleDateString()
                            : "-"}
                        </td>{" "}
                        <td className="actions-cell">
                          <button
                            onClick={() =>
                              handleEditarUsuario(
                                usuario.usuario_id,
                                usuario.login
                              )
                            }
                            className="btn btn-sm btn-info"
                            title="Editar">
                            Editar
                          </button>
                          <button
                            onClick={() =>
                              handleExcluirUsuario(
                                usuario.usuario_id,
                                usuario.login
                              )
                            }
                            className="btn btn-sm btn-danger"
                            title="Excluir"
                            disabled={
                              usuario.login === "admin" ||
                              usuario.login === "gabriel"
                            }>
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>Nenhum usuário encontrado</p>
              </div>
            )}
          </div>
        </section>{" "}
      </div>
      {/* Modal de contato para administrador */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Contate o Administrador</h3>
            <p>
              Para {modalAction === "editar" ? "editar" : "excluir"} informações
              de outros usuários, você precisa contatar um administrador:
              <br />
              <br />
              (Você pode editar somente o seu próprio usuário!)
            </p>
            <div className="admin-contact">
              <p>
                <strong>Gabriel Cavalcante Rodrigues</strong>
              </p>
              <p>(85) 9 8613-9769</p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={() => setShowModal(false)}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
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

        .search-container {
          flex-grow: 1;
          margin-right: 1rem;
        }

        .search-input {
          width: 100%;
          max-width: 400px;
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

        .btn-danger {
          background-color: var(--error-color);
          color: white;
        }

        .btn-danger:hover {
          background-color: #d32f2f;
        }

        .btn-info {
          background-color: var(--info-color);
          color: white;
        }

        .btn-info:hover {
          background-color: #0288d1;
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

        .error-message {
          color: var(--error-color);
          background-color: rgba(239, 68, 68, 0.1);
          padding: 1.25rem;
          border-radius: var(--radius-sm);
          text-align: center;
          margin: 1.5rem 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .error-message p {
          margin-bottom: 0.5rem;
        }

        /* Estilos do Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background-color: var(--foreground-color);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          width: 90%;
          max-width: 500px;
          padding: 2rem;
          animation: fadeIn 0.3s ease;
        }

        .modal-content h3 {
          margin-top: 0;
          color: var(--primary-color);
          margin-bottom: 1rem;
        }

        .admin-contact {
          margin: 1.5rem 0;
          padding: 1rem;
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-sm);
          text-align: center;
        }

        .admin-contact p {
          margin: 0.5rem 0;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
