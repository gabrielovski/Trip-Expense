"use client";

import { useState, useEffect } from "react";
import { verifyResetCode } from "../../auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerificarCodigo() {
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
      setError(err.message || "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Verificar Código</h2>
      {error && <p className="error-message">{error}</p>}

      <p className="form-info">
        Digite o código de recuperação que você recebeu para o usuário {login}.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="code" className="form-label">
            Código de Recuperação
          </label>
          <input
            id="code"
            type="text"
            className="form-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            placeholder="Digite o código de 6 dígitos"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Verificando..." : "Verificar Código"}
        </button>
      </form>

      <Link href="/recuperar-senha" className="auth-link">
        Voltar
      </Link>
    </div>
  );
}
