"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "../../supabaseClient";
import { getCurrentUser } from "../../auth";

export default function ViagensPage() {
  const [viagens, setViagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }

    fetchViagens();
  }, [router]);

  const fetchViagens = async () => {
    try {
      setLoading(true);
      const user = getCurrentUser();

      // Debug: verificar se o usuário é reconhecido como admin
      console.log("Dados do usuário:", user);
      console.log("Login do usuário:", user.login);
      console.log("É admin?", user.login === "admin");

      const supabase = getSupabaseClient("viagem");
      // Consulta correta para schema viagem
      let query = supabase.from("tbviagem").select(`
        viagem_id,
        data_ida,
        data_volta,
        destino,
        motivo,
        observacoes,
        atualizado_por,
        usuario_id
      `);

      // Se não for admin, mostrar apenas as próprias viagens
      if (user.login !== "admin") {
        console.log("Aplicando filtro por usuario_id:", user.usuario_id);
        query = query.eq("usuario_id", user.usuario_id);
      } else {
        console.log("Usuário é admin, mostrando todas as viagens");
      }

      const { data, error } = await query.order("data_ida", {
        ascending: false,
      });

      if (error) throw error;

      setViagens(data || []);
    } catch (err) {
      // Método melhorado para exibir detalhes do erro
      console.error(
        "Erro ao buscar viagens (mensagem):",
        err?.message || "Erro sem mensagem"
      );

      // Evitar tentativas de acessar propriedades de um erro nulo/indefinido
      if (err) {
        // Usar console.log para informações mais detalhadas
        console.log("Objeto de erro completo:", err);

        // Exibir apenas propriedades que realmente existem
        const errorDetails = {};

        if (err.name) errorDetails.name = err.name;
        if (err.code) errorDetails.code = err.code;
        if (err.details) errorDetails.details = err.details;
        if (err.hint) errorDetails.hint = err.hint;
        if (err.status) errorDetails.status = err.status;

        console.log("Detalhes filtrados do erro:", errorDetails);
      } else {
        console.log("O erro é nulo ou indefinido");
      }

      setError(
        "Não foi possível carregar as viagens. Verifique a conexão com o banco de dados."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Minhas Viagens</h1>
        <div className="header-actions">
          <Link href="/dashboard" className="btn btn-outline">
            Voltar ao Dashboard
          </Link>
          <Link href="/dashboard/viagens/nova" className="btn btn-primary">
            Nova Viagem
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="loading-state">Carregando viagens...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : viagens.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma viagem encontrada</p>
          <Link href="/dashboard/viagens/nova" className="btn btn-primary">
            Criar Nova Viagem
          </Link>
        </div>
      ) : (
        <div className="viagens-grid">
          {viagens.map((viagem) => (
            <Link
              href={`/dashboard/viagens/${viagem.viagem_id}`}
              key={viagem.viagem_id}
              className="viagem-card">
              <div className="viagem-header">
                <h3>{viagem.destino}</h3>
              </div>
              <div className="viagem-date">
                {formatarDataLocal(viagem.data_ida)} -{" "}
                {formatarDataLocal(viagem.data_volta)}
              </div>
              <div className="viagem-motivo">{viagem.motivo}</div>
            </Link>
          ))}
        </div>
      )}

      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .viagens-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }

        .viagem-date {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
          font-weight: 500;
        }

        .viagem-motivo {
          margin-bottom: 1.25rem;
          font-size: 0.95rem;
          line-height: 1.6;
          color: var(--text-color);
          flex-grow: 1;
        }

        .loading-state {
          text-align: center;
          padding: 3rem 0;
          color: var(--text-secondary);
          font-size: 1.1rem;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 1rem;
          background-color: var(--foreground-color);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          margin-top: 1.5rem;
        }

        .empty-state p {
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
          font-size: 1.1rem;
        }

        .error-message {
          color: var(--error-color);
          background-color: rgba(239, 68, 68, 0.1);
          padding: 1.25rem;
          border-radius: var(--radius-sm);
          text-align: center;
          margin: 1.5rem 0;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .header-actions {
            display: flex;
            width: 100%;
            gap: 0.75rem;
          }

          .viagens-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function formatarDataLocal(dataStr) {
  if (!dataStr) return "";
  const [ano, mes, dia] = dataStr.split("-");
  return `${dia}/${mes}/${ano}`;
}
