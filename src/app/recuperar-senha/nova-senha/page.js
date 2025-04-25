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
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
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
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: value,
    });

    if (id === "password") {
      // Avaliar força da senha (0-100)
      const strength = calculatePasswordStrength(value);
      setPasswordStrength(strength);
    }
  };

  // Função para calcular a força da senha
  const calculatePasswordStrength = (password) => {
    if (!password) return 0;

    let score = 0;

    // Comprimento (máx 40 pontos)
    score += Math.min(password.length * 4, 40);

    // Variedade de caracteres (máx 60 pontos)
    if (/[a-z]/.test(password)) score += 10; // Minúsculas
    if (/[A-Z]/.test(password)) score += 10; // Maiúsculas
    if (/[0-9]/.test(password)) score += 10; // Números
    if (/[^a-zA-Z0-9]/.test(password)) score += 15; // Caracteres especiais

    // Se tem diferentes tipos de caracteres (máx 15 pontos)
    let charTypes = 0;
    if (/[a-z]/.test(password)) charTypes++;
    if (/[A-Z]/.test(password)) charTypes++;
    if (/[0-9]/.test(password)) charTypes++;
    if (/[^a-zA-Z0-9]/.test(password)) charTypes++;
    score += (charTypes - 1) * 5;

    return Math.min(score, 100);
  };

  const getStrengthLabel = (strength) => {
    if (strength < 30)
      return { text: "Muito fraca", color: "var(--error-color)" };
    if (strength < 50) return { text: "Fraca", color: "#f59e0b" };
    if (strength < 70) return { text: "Média", color: "#eab308" };
    if (strength < 90) return { text: "Forte", color: "#22c55e" };
    return { text: "Muito forte", color: "#16a34a" };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { password, confirmPassword } = formData;

    // Validações de segurança
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    if (passwordStrength < 50) {
      setError(
        "Sua senha é muito fraca. Adicione letras maiúsculas, números e caracteres especiais."
      );
      return;
    }

    setLoading(true);
    try {
      // Redefinir a senha
      await resetPassword(login, code, password);
      setSuccess("Senha redefinida com sucesso!");

      // Limpar dados sensíveis
      setFormData({ password: "", confirmPassword: "" });

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

  const strengthInfo = getStrengthLabel(passwordStrength);

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
          <div className="password-input-container">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {formData.password && (
            <div className="password-strength">
              <div className="strength-bar">
                <div
                  className="strength-fill"
                  style={{
                    width: `${passwordStrength}%`,
                    backgroundColor: strengthInfo.color,
                  }}></div>
              </div>
              <span style={{ color: strengthInfo.color }}>
                {strengthInfo.text}
              </span>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            Confirmar Nova Senha
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            className="form-input"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Processando..." : "Redefinir Senha"}
        </button>
      </form>

      <Link href="/login" className="auth-link">
        Voltar para o login
      </Link>

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

        .password-strength {
          margin-top: 8px;
          font-size: 0.8rem;
        }

        .strength-bar {
          height: 4px;
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          margin-bottom: 4px;
        }

        .strength-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease, background-color 0.3s ease;
        }
      `}</style>
    </div>
  );
}
