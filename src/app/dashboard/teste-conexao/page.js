"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../supabaseClient";
import Link from "next/link";
import { getCurrentUser } from "../../auth";
import { useRouter } from "next/navigation";

export default function TesteConexao() {
  const [user, setUser] = useState(null);
  const [statusSeguranca, setStatusSeguranca] = useState("Verificando...");
  const [statusViagem, setStatusViagem] = useState("Verificando...");
  const [statusFinanceiro, setStatusFinanceiro] = useState("Verificando...");
  const [errorDetails, setErrorDetails] = useState("");
  const [envVars, setEnvVars] = useState({});
  const router = useRouter();
  useEffect(() => {
    const userData = getCurrentUser();
    if (!userData) {
      router.replace("/login");
      return;
    }

    // Permitir acesso apenas para usuários 'admin' e 'gabriel'
    if (userData.login !== "admin" && userData.login !== "gabriel") {
      router.replace("/dashboard");
      return;
    }

    setUser(userData);
    testConnection();
    checkEnvVariables();
  }, [router]);
  const checkEnvVariables = () => {
    // Verificar variáveis de ambiente disponíveis no client
    const vars = {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL || "Não definido",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? "Definido (valor oculto)"
        : "Não definido",
      NODE_ENV: process.env.NODE_ENV || "Não definido",
    };
    setEnvVars(vars);
  };
  const testConnection = async () => {
    setErrorDetails("");
    setStatusSeguranca("Verificando...");
    setStatusViagem("Verificando...");
    setStatusFinanceiro("Verificando...");

    // Verificar se as variáveis de ambiente estão definidas
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      const message =
        "❌ Erro: Variáveis de ambiente do Supabase não configuradas.";
      setStatusSeguranca(message);
      setStatusViagem(message);
      setStatusFinanceiro(message);
      setErrorDetails(
        "As variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY precisam estar definidas no arquivo .env.local na raiz do projeto."
      );
      return;
    }

    // Testar schema seguranca
    try {
      setStatusSeguranca("Conectando...");
      const supabaseSeguranca = getSupabaseClient("seguranca");

      // Verificar se a tabela existe usando um campo específico em vez de count(*)
      console.log("Testando conexão com schema 'seguranca'...");
      const { data: dataSeguranca, error: errorSeguranca } =
        await supabaseSeguranca
          .from("tbusuarios")
          .select("usuario_id")
          .limit(1);

      if (errorSeguranca) {
        console.error(
          "Erro na conexão com schema 'seguranca':",
          errorSeguranca
        );
        setStatusSeguranca(`❌ Erro: ${errorSeguranca.message}`);
        setErrorDetails(
          (prev) =>
            `Schema 'seguranca':\n${JSON.stringify(
              errorSeguranca,
              null,
              2
            )}\n\n${prev}`
        );
      } else {
        console.log(
          "Conexão com schema 'seguranca' bem-sucedida:",
          dataSeguranca
        );
        setStatusSeguranca("✅ Conectado com sucesso!");
      }
    } catch (err) {
      console.error("Exceção ao conectar com schema 'seguranca':", err);
      setStatusSeguranca(`❌ Exceção: ${err.message}`);
      setErrorDetails(
        (prev) =>
          `Exception (seguranca):\n${JSON.stringify(err, null, 2)}\n\n${prev}`
      );
    }

    // Testar schema viagem
    try {
      setStatusViagem("Conectando...");
      const supabaseViagem = getSupabaseClient("viagem");

      // Verificar se a tabela existe usando um campo específico em vez de count(*)
      console.log("Testando conexão com schema 'viagem'...");
      const { data: dataViagem, error: errorViagem } = await supabaseViagem
        .from("tbviagem")
        .select("viagem_id")
        .limit(1);

      if (errorViagem) {
        console.error("Erro na conexão com schema 'viagem':", errorViagem);
        setStatusViagem(`❌ Erro: ${errorViagem.message}`);
        setErrorDetails(
          (prev) =>
            `${prev}Schema 'viagem':\n${JSON.stringify(
              errorViagem,
              null,
              2
            )}\n\n`
        );
      } else {
        console.log("Conexão com schema 'viagem' bem-sucedida:", dataViagem);
        setStatusViagem("✅ Conectado com sucesso!");
      }
    } catch (err) {
      console.error("Exceção ao conectar com schema 'viagem':", err);
      setStatusViagem(`❌ Exceção: ${err.message}`);
      setErrorDetails(
        (prev) =>
          `${prev}Exception (viagem):\n${JSON.stringify(err, null, 2)}\n\n`
      );
    } // Testar schema financeiro
    try {
      setStatusFinanceiro("Conectando...");
      const supabaseFinanceiro = getSupabaseClient("financeiro");

      // Verificar se a tabela existe usando um campo específico em vez de count(*)
      console.log("Testando conexão com schema 'financeiro'...");
      const { data: dataFinanceiro, error: errorFinanceiro } =
        await supabaseFinanceiro
          .from("tbcontaspagar")
          .select("conta_pagar_id")
          .limit(1);

      if (errorFinanceiro) {
        console.error(
          "Erro na conexão com schema 'financeiro':",
          errorFinanceiro
        );
        setStatusFinanceiro(`❌ Erro: ${errorFinanceiro.message}`);
        setErrorDetails(
          (prev) =>
            `${prev}Schema 'financeiro':\n${JSON.stringify(
              errorFinanceiro,
              null,
              2
            )}\n\n`
        );
      } else {
        console.log(
          "Conexão com schema 'financeiro' bem-sucedida:",
          dataFinanceiro
        );
        setStatusFinanceiro("✅ Conectado com sucesso!");
      }
    } catch (err) {
      console.error("Exceção ao conectar com schema 'financeiro':", err);
      setStatusFinanceiro(`❌ Exceção: ${err.message}`);
      setErrorDetails(
        (prev) =>
          `${prev}Exception (financeiro):\n${JSON.stringify(err, null, 2)}\n\n`
      );
    }
  };
  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Diagnóstico de Conexão</h1>
          <p className="welcome-text">Olá, {user?.nome}</p>
        </div>
        <div className="user-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              router.push("/dashboard");
            }}>
            Voltar
          </button>
        </div>
      </header>
      <nav className="main-nav">
        <Link href="/dashboard" className="nav-link">
          Dashboard
        </Link>
        <Link href="/dashboard/viagens" className="nav-link">
          Viagens
        </Link>
        <Link href="/dashboard/usuarios" className="nav-link">
          Usuários
        </Link>
        <Link
          href="/dashboard/teste-conexao"
          className="nav-link diagnostic active">
          Diagnóstico
        </Link>
      </nav>
      <div className="dashboard-content">
        <section className="card">
          <div className="card-header">
            <h2>Status da Conexão</h2>
            <button className="btn btn-primary btn-sm" onClick={testConnection}>
              Testar Novamente
            </button>
          </div>
          <div className="card-content">
            {" "}
            <div className="status-grid">
              <div className="status-item">
                <strong>Schema Seguranca:</strong>
                <span
                  className={
                    statusSeguranca.includes("sucesso") ? "success" : "error"
                  }>
                  {statusSeguranca}
                </span>
              </div>

              <div className="status-item">
                <strong>Schema Viagem:</strong>
                <span
                  className={
                    statusViagem.includes("sucesso") ? "success" : "error"
                  }>
                  {statusViagem}
                </span>
              </div>

              <div className="status-item">
                <strong>Schema Financeiro:</strong>
                <span
                  className={
                    statusFinanceiro.includes("sucesso") ? "success" : "error"
                  }>
                  {statusFinanceiro}
                </span>
              </div>
            </div>
            {errorDetails && (
              <>
                <h3>Detalhes dos Erros</h3>
                <div className="code-block error">
                  <pre>{errorDetails}</pre>
                </div>
              </>
            )}
          </div>
        </section>
      </div>{" "}
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

        .user-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
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

        .nav-link.diagnostic {
          color: #ff9800;
        }

        .nav-link.diagnostic:hover {
          background-color: rgba(255, 152, 0, 0.1);
        }

        .nav-link.diagnostic.active::after {
          background-color: #ff9800;
        }

        .card {
          background-color: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          margin-bottom: 1.5rem;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .card-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 500;
        }

        .card-content {
          padding: 1.5rem;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .status-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background-color: rgba(0, 0, 0, 0.1);
          border-radius: var(--radius-sm);
        }

        .success {
          color: #4caf50;
          font-weight: 500;
        }

        .error {
          color: #f44336;
          font-weight: 500;
        }

        .code-block {
          background-color: rgba(0, 0, 0, 0.2);
          padding: 1rem;
          border-radius: var(--radius-sm);
          overflow: auto;
          max-height: 250px;
          margin: 1rem 0;
        }

        .code-block.error {
          background-color: rgba(244, 67, 54, 0.1);
          border-left: 3px solid #f44336;
        }

        pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .info-box {
          background-color: rgba(33, 150, 243, 0.1);
          padding: 1rem;
          border-radius: var(--radius-sm);
          margin-top: 1.5rem;
          border-left: 3px solid #2196f3;
        }

        .info-box.warning {
          background-color: rgba(255, 152, 0, 0.1);
          border-left: 3px solid #ff9800;
        }

        ol {
          padding-left: 1.5rem;
        }

        li {
          margin-bottom: 0.5rem;
        }

        code {
          font-family: monospace;
          background-color: rgba(255, 255, 255, 0.1);
          padding: 0.1rem 0.3rem;
          border-radius: 3px;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .status-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
