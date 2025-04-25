"use client";

import { useState, useEffect, Suspense } from "react";
import { verifyResetCode } from "../../auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// Componente cliente que usa useSearchParams
function VerificarCodigoForm() {
  const [code, setCode] = useState("");
  const [login, setLogin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const userLogin = searchParams.get("login");
    if (userLogin) {
      setLogin(userLogin);
    } else {
      router.replace("/recuperar-senha");
    }
  }, [searchParams, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Verificar o código de recuperação
      await verifyResetCode(login, code);
      // Se for válido, redirecionar para definir nova senha
      router.push(
        `/recuperar-senha/nova-senha?login=${encodeURIComponent(
          login
        )}&code=${encodeURIComponent(code)}`
      );
    } catch (err) {
      setError(err.message || "Código inválido ou expirado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Insira o Código de Recuperação</h2>
      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="login">Login</label>
          <input
            type="text"
            id="login"
            value={login}
            readOnly
            disabled
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label htmlFor="code">Código de Recuperação</label>
          <input
            type="text"
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Insira o código recebido"
            required
            className="form-control"
          />
        </div>
        <button
          type="submit"
          className="auth-button"
          disabled={loading || !code}>
          {loading ? "Verificando..." : "Verificar Código"}
        </button>
      </form>

      <div className="auth-links">
        <Link href="/recuperar-senha" className="auth-link">
          Solicitar novo código
        </Link>
        <Link href="/login" className="auth-link">
          Voltar ao login
        </Link>
      </div>
    </div>
  );
}

// Componente principal da página com Suspense
export default function VerificarCodigo() {
  return (
    <Suspense fallback={<div className="loading">Carregando...</div>}>
      <VerificarCodigoForm />
    </Suspense>
  );
}
