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
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccess("Conta criada com sucesso! Faça login para continuar.");
    } else if (searchParams.get("password_reset") === "true") {
      setSuccess("Senha alterada com sucesso! Faça login para continuar.");
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await signIn(login, password);
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
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Senha
          </label>
          <input
            id="password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="auth-links">
        <Link href="/cadastro" className="auth-link">
          Não tem uma conta? Cadastre-se
        </Link>
        <Link href="/recuperar-senha" className="auth-link forgot-password">
          Esqueceu sua senha?
        </Link>
      </div>
    </div>
  );
}
