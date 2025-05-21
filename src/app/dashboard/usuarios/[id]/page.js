"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "../../../auth";
import { getSupabaseClient } from "../../../supabaseClient";
import bcrypt from "bcryptjs";

export default function EditarUsuario({ params }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    login: "",
    senha: "",
    confirmarSenha: "",
    alterarSenha: false,
  });
  const [errors, setErrors] = useState({});
  const [usuarioOriginal, setUsuarioOriginal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const usuarioId = parseInt(unwrappedParams.id); // Convertemos para número
  useEffect(() => {
    const userData = getCurrentUser();
    if (!userData) {
      router.replace("/login");
      return;
    }

    setUser(userData);

    // Verificar se o usuário é administrador ou está acessando seu próprio perfil
    const isAdmin =
      userData.tipo_usuario === 2 ||
      userData.login === "admin" ||
      userData.login === "gabriel";
    const isOwnProfile = userData.usuario_id === usuarioId;

    // Se não for admin e não for o próprio perfil, define como somente leitura
    if (!isAdmin && !isOwnProfile) {
      setIsReadOnly(true);
    }

    fetchUsuario();
  }, [router, usuarioId]);
  const fetchUsuario = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient("seguranca");
      const { data, error } = await supabase
        .from("tbusuarios")
        .select("usuario_id, nome, login")
        .eq("usuario_id", usuarioId)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        alert("Usuário não encontrado");
        router.replace("/dashboard/usuarios");
        return;
      }
      setUsuarioOriginal(data);
      // Definir o tipo_usuario com base no login
      const tipo_usuario =
        data.login === "admin" || data.login === "gabriel" ? 2 : 1;
      setFormData({
        nome: data.nome || "",
        login: data.login || "",
        senha: "",
        confirmarSenha: "",
        tipo_usuario: tipo_usuario,
        alterarSenha: false,
      });
    } catch (err) {
      console.error("Erro ao buscar usuário:", err);
      alert(`Erro ao buscar informações do usuário: ${err.message}`);
      router.replace("/dashboard/usuarios");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });

    // Limpar o erro desse campo quando o usuário começa a digitar
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome.trim()) {
      newErrors.nome = "O nome é obrigatório";
    }

    if (!formData.login.trim()) {
      newErrors.login = "O login é obrigatório";
    } else if (formData.login.length < 3) {
      newErrors.login = "O login deve ter pelo menos 3 caracteres";
    }

    if (formData.alterarSenha) {
      if (!formData.senha) {
        newErrors.senha = "A senha é obrigatória";
      } else if (formData.senha.length < 6) {
        newErrors.senha = "A senha deve ter pelo menos 6 caracteres";
      }

      if (formData.senha !== formData.confirmarSenha) {
        newErrors.confirmarSenha = "As senhas não coincidem";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Verifica se o usuário é administrador ou está editando seu próprio perfil
    const isAdmin =
      user.tipo_usuario === 2 ||
      user.login === "admin" ||
      user.login === "gabriel";
    const isOwnProfile = user.usuario_id === usuarioId;

    // Se não for admin e não for o próprio perfil, mostra o modal
    if (!isAdmin && !isOwnProfile) {
      setShowModal(true);
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      const supabase = getSupabaseClient("seguranca");

      // Verificar se o novo login já existe (apenas se o login foi alterado)
      if (formData.login !== usuarioOriginal.login) {
        const { data: loginExists, error: loginError } = await supabase
          .from("tbusuarios")
          .select("usuario_id")
          .eq("login", formData.login)
          .maybeSingle();

        if (loginError) {
          throw loginError;
        }

        if (loginExists) {
          setErrors({
            ...errors,
            login: "Este login já está em uso",
          });
          setSaving(false);
          return;
        }
      } // Preparar os dados para atualização
      const updateData = {
        nome: formData.nome,
        login: formData.login,
        atualizado_em: new Date().toISOString(),
      };

      // Adicionar senha apenas se o campo alterarSenha estiver marcado
      if (formData.alterarSenha && formData.senha) {
        const salt = bcrypt.genSaltSync(10);
        const senhaHash = bcrypt.hashSync(formData.senha, salt);
        updateData.senha = senhaHash;
      }

      // Atualizar o usuário
      const { error } = await supabase
        .from("tbusuarios")
        .update(updateData)
        .eq("usuario_id", usuarioId);

      if (error) {
        throw error;
      }

      // Redirecionar para a lista de usuários
      router.push("/dashboard/usuarios");
      alert("Usuário atualizado com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar usuário:", err);
      alert(`Erro ao atualizar usuário: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="page-container">
        <h2>Carregando...</h2>
      </div>
    );
  }

  const isAdmin =
    usuarioOriginal?.login === "admin" || usuarioOriginal?.login === "gabriel";

  return (
    <div className="page-container">
      {" "}
      <header className="page-header">
        <div>
          <h1>Editar Usuário</h1>
          <p className="welcome-text">Olá, {user.nome}</p>
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
      </nav>
      <div className="dashboard-content">
        <section className="card">
          <div className="card-header">
            <h2>Editar Usuário: {usuarioOriginal?.nome}</h2>
            <Link
              href="/dashboard/usuarios"
              className="btn btn-secondary btn-sm">
              Voltar
            </Link>
          </div>
          <div className="card-content">
            <form onSubmit={handleSubmit} className="form">
              <div className="form-group">
                <label htmlFor="nome" className="form-label">
                  Nome*
                </label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className={`form-input ${errors.nome ? "error" : ""}`}
                  placeholder="Digite o nome completo"
                />
                {errors.nome && (
                  <div className="error-message">{errors.nome}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="login" className="form-label">
                  Login*
                </label>
                <input
                  type="text"
                  id="login"
                  name="login"
                  value={formData.login}
                  onChange={handleChange}
                  className={`form-input ${errors.login ? "error" : ""}`}
                  placeholder="Digite o login"
                  disabled={isAdmin} // Não permitir alterar o login do admin
                />
                {errors.login && (
                  <div className="error-message">{errors.login}</div>
                )}
                {isAdmin && (
                  <div className="info-message">
                    O login do administrador não pode ser alterado
                  </div>
                )}
              </div>

              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="alterarSenha"
                  name="alterarSenha"
                  checked={formData.alterarSenha}
                  onChange={handleChange}
                />
                <label htmlFor="alterarSenha" className="checkbox-label">
                  Alterar senha
                </label>
              </div>

              {formData.alterarSenha && (
                <>
                  <div className="form-group">
                    <label htmlFor="senha" className="form-label">
                      Nova Senha*
                    </label>
                    <input
                      type="password"
                      id="senha"
                      name="senha"
                      value={formData.senha}
                      onChange={handleChange}
                      className={`form-input ${errors.senha ? "error" : ""}`}
                      placeholder="Digite a nova senha"
                    />
                    {errors.senha && (
                      <div className="error-message">{errors.senha}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmarSenha" className="form-label">
                      Confirmar Nova Senha*
                    </label>
                    <input
                      type="password"
                      id="confirmarSenha"
                      name="confirmarSenha"
                      value={formData.confirmarSenha}
                      onChange={handleChange}
                      className={`form-input ${
                        errors.confirmarSenha ? "error" : ""
                      }`}
                      placeholder="Confirme a nova senha"
                    />
                    {errors.confirmarSenha && (
                      <div className="error-message">
                        {errors.confirmarSenha}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || isReadOnly}>
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </button>
                <Link href="/dashboard/usuarios" className="btn btn-secondary">
                  Cancelar
                </Link>
              </div>
            </form>
          </div>
        </section>
      </div>
      {/* Modal de contato para administrador */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Contate o Administrador</h3>
            <p>
              Para editar informações de outros usuários, você precisa contatar
              um administrador:
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

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .form {
          max-width: 800px;
          margin: 0 auto;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background-color: rgba(255, 255, 255, 0.05);
          color: var(--text-color);
          font-size: 1rem;
        }

        .form-input:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .form-input.error {
          border-color: var(--error-color);
        }

        .error-message {
          color: var(--error-color);
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }

        .info-message {
          color: var(--info-color);
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .checkbox-label {
          margin-bottom: 0;
          cursor: pointer;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-sm);
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition);
          border: none;
          font-size: 1rem;
        }

        .btn-primary {
          background-color: var(--primary-color);
          color: white;
        }

        .btn-primary:hover {
          background-color: #0056b3;
        }

        .btn-secondary {
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--text-color);
        }

        .btn-secondary:hover {
          background-color: rgba(255, 255, 255, 0.15);
        }

        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }

        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
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
