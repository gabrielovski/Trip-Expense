"use client";

import { useState, useEffect } from "react";
import { signIn } from "../auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccess("Conta criada com sucesso! Faça login para continuar.");
    } else if (searchParams.get("password_reset") === "true") {
      setSuccess("Senha alterada com sucesso! Faça login para continuar.");
    }
  }, [searchParams]);

  // Função anti-throttling para evitar tentativas repetidas
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return; // Prevenir múltiplos cliques

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Pequeno delay para segurança contra ataques de força bruta
      await new Promise((resolve) => setTimeout(resolve, 300));

      await signIn(login, password);

      // Limpar campos sensíveis
      setPassword("");

      router.push("/dashboard");
    } catch (err) {
      setError(
        err.message || "Erro ao fazer login. Verifique suas credenciais."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Login</h2>
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="login" className="form-label">
            Usuário
          </label>
          <input
            id="login"
            type="text"
            className="form-input"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            maxLength={50}
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Senha
          </label>
          <div className="password-input-container">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="auth-links">
        <Link href="/recuperar-senha" className="auth-link">
          Esqueci minha senha
        </Link>
        <Link href="/cadastro" className="auth-link">
          Criar conta
        </Link>
      </div>

      <style jsx>{`
        .password-input-container {
          position: relative;
          display: flex;
        }

        .password-toggle {
          position: absolute;
          right: 0;
          top: 0;
          height: 100%;
          padding: 0 10px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.8rem;
        }

        .password-toggle:hover {
          color: var(--primary-color);
        }
      `}</style>
    </div>
  );
}
