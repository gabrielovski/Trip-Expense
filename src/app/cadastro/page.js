"use client";

import { useState } from "react";
import { signUp } from "../auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    login: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Handler unificado para todos os campos do formulário
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { name, login, password, confirmPassword } = formData;

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (login.length > 50 || name.length > 200) {
      setError("Login ou nome muito longo");
      return;
    }

    setLoading(true);
    try {
      await signUp(login, password, name);
      router.push("/login?registered=true");
    } catch (err) {
      setError(err.message || "Erro ao criar conta");
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
            value={formData.name}
            onChange={handleChange}
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
            value={formData.login}
            onChange={handleChange}
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
            value={formData.password}
            onChange={handleChange}
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
            value={formData.confirmPassword}
            onChange={handleChange}
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
