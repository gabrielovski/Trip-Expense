"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "../../../auth";
import { getSupabaseClient } from "../../../supabaseClient";
import bcrypt from "bcryptjs";

export default function NovoUsuario() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    login: "",
    senha: "",
    confirmarSenha: "",
    tipo_usuario: 1,
  });
  const [errors, setErrors] = useState({});
  const router = useRouter();
  useEffect(() => {
    const userData = getCurrentUser();
    if (!userData) {
      router.replace("/login");
      return;
    }

    // Qualquer usuário logado pode acessar esta página
    setUser(userData);
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
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

    if (!formData.senha) {
      newErrors.senha = "A senha é obrigatória";
    } else if (formData.senha.length < 6) {
      newErrors.senha = "A senha deve ter pelo menos 6 caracteres";
    }

    if (formData.senha !== formData.confirmarSenha) {
      newErrors.confirmarSenha = "As senhas não coincidem";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const supabase = getSupabaseClient("seguranca");

      // Verifica se o login já existe de forma otimizada
      const { count, error: loginError } = await supabase
        .from("tbusuarios")
        .select("usuario_id", { count: "exact", head: true })
        .eq("login", formData.login);

      if (loginError) {
        throw loginError;
      }

      if (count > 0) {
        setErrors({
          ...errors,
          login: "Este login já está em uso",
        });
        return;
      } // Garantir que usuários não-admin não possam criar administradores
      let tipoUsuarioFinal = 1; // Sempre criar usuários do tipo padrão

      // Gerar senha hash com bcrypt usando genSaltSync/hashSync de forma segura
      const salt = bcrypt.genSaltSync(10);
      const senhaHash = bcrypt.hashSync(formData.senha, salt);

      // Gerar ID aleatório para o usuário dentro do intervalo seguro para integer
      const usuario_id = Math.floor(Math.random() * 2147483647);

      // Inserir o novo usuário
      const { error } = await supabase.from("tbusuarios").insert([
        {
          usuario_id,
          nome: formData.nome,
          login: formData.login,
          senha: senhaHash,
          atualizado_em: new Date().toISOString(),
        },
      ]);

      if (error) {
        throw error;
      }

      // Redirecionar para a lista de usuários
      router.push("/dashboard/usuarios");
      alert("Usuário criado com sucesso!");
    } catch (err) {
      console.error("Erro ao criar usuário:", err.message);
      alert(
        `Erro ao criar usuário: ${
          err.message || "Ocorreu um erro durante o cadastro"
        }`
      );
    } finally {
      setLoading(false);
    }
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
          <h1>Novo Usuário</h1>
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
            <h2>Cadastrar Novo Usuário</h2>
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
                />{" "}
                {errors.login && (
                  <div className="error-message">{errors.login}</div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="senha" className="form-label">
                  Senha*
                </label>
                <input
                  type="password"
                  id="senha"
                  name="senha"
                  value={formData.senha}
                  onChange={handleChange}
                  className={`form-input ${errors.senha ? "error" : ""}`}
                  placeholder="Digite a senha"
                />
                {errors.senha && (
                  <div className="error-message">{errors.senha}</div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="confirmarSenha" className="form-label">
                  Confirmar Senha*
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
                  placeholder="Confirme a senha"
                />{" "}
                {errors.confirmarSenha && (
                  <div className="error-message">{errors.confirmarSenha}</div>
                )}
              </div>
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}>
                  {loading ? "Cadastrando..." : "Cadastrar Usuário"}
                </button>
                <Link href="/dashboard/usuarios" className="btn btn-secondary">
                  Cancelar
                </Link>
              </div>
            </form>
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

        .form-input.error {
          border-color: var(--error-color);
        }
        .error-message {
          color: var(--error-color);
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }

        .helper-text {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-top: 0.25rem;
          display: block;
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
      `}</style>
    </div>
  );
}
