"use client";

import { useState } from "react";
import { signUp } from "../services/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Register() {
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (login.length > 50) {
      setError("O login deve ter no máximo 50 caracteres");
      return;
    }

    if (name.length > 200) {
      setError("O nome deve ter no máximo 200 caracteres");
      return;
    }

    setLoading(true);

    try {
      await signUp(login, password, name);
      router.push("/login?registered=true");
    } catch (err) {
      setError(
        err.message ||
          "Erro ao criar conta. Verifique os dados e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Criar Conta</h2>
      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Nome Completo
          </label>
          <input
            id="name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={200}
          />
        </div>

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
            minLength={6}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            Confirmar Senha
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="form-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Criando conta..." : "Criar Conta"}
        </button>
      </form>

      <Link href="/login" className="auth-link">
        Já tem uma conta? Faça login
      </Link>
    </div>
  );
}
