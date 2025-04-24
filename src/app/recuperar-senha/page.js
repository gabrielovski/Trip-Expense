"use client";

import { useState } from "react";
import { requestPasswordReset } from "../auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RecuperarSenha() {
  const [login, setLogin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Solicita o código de recuperação
      const result = await requestPasswordReset(login);
      setSuccess("Código de recuperação gerado com sucesso!");
      setResetCode(result.resetCode); // Apenas para demonstração
      setShowCode(true);
    } catch (err) {
      setError(err.message || "Erro ao solicitar recuperação de senha");
    } finally {
      setLoading(false);
    }
  };

  const handleContinuar = () => {
    // Em um sistema real, o código seria enviado por email e não seria mostrado aqui
    router.push(`/recuperar-senha/codigo?login=${encodeURIComponent(login)}`);
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Recuperar Senha</h2>
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}

      {!showCode ? (
        <>
          <p className="form-info">
            Digite seu nome de usuário para receber um código de recuperação.
          </p>
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

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}>
              {loading ? "Processando..." : "Recuperar Senha"}
            </button>
          </form>
        </>
      ) : (
        <div className="reset-code-container">
          <p className="form-info">
            Um código de recuperação foi gerado para o usuário {login}.
          </p>
          <p className="form-info">
            Em um sistema real, este código seria enviado por email.
          </p>
          <div className="code-display">
            <p className="reset-code">{resetCode}</p>
          </div>
          <button onClick={handleContinuar} className="btn btn-primary">
            Continuar
          </button>
        </div>
      )}

      <Link href="/login" className="auth-link">
        Voltar para o login
      </Link>
    </div>
  );
}
