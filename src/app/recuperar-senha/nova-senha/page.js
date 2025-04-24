"use client";

import { useState, useEffect } from "react";
import { resetPassword } from "../../auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function NovaSenha() {
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [login, setLogin] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const userLogin = searchParams.get("login");
    const resetCode = searchParams.get("code");

    if (!userLogin || !resetCode) {
      router.replace("/recuperar-senha");
    } else {
      setLogin(userLogin);
      setCode(resetCode);
    }
  }, [searchParams, router]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { password, confirmPassword } = formData;

    // Validação básica
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      // Redefinir a senha
      await resetPassword(login, code, password);
      setSuccess("Senha redefinida com sucesso!");

      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        router.push("/login?password_reset=true");
      }, 2000);
    } catch (err) {
      setError(err.message || "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Nova Senha</h2>
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}

      <p className="form-info">Define sua nova senha para o usuário {login}.</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Nova Senha
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
            Confirmar Nova Senha
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
          {loading ? "Processando..." : "Redefinir Senha"}
        </button>
      </form>

      <Link href="/login" className="auth-link">
        Voltar para o login
      </Link>
    </div>
  );
}
