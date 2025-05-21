"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../../supabaseClient";
import { getCurrentUser } from "../../../auth";

export default function AtualizarUsuarios() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState("");
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const userData = getCurrentUser();
    if (!userData) {
      router.replace("/login");
      return;
    }
    if (userData.login !== "admin" && userData.login !== "gabriel") {
      router.replace("/dashboard");
      return;
    }

    setUser(userData);
  }, [router]);

  const handleAtualizacao = async () => {
    try {
      setLoading(true);
      setResultado("Buscando usuários sem tipo definido...");

      const supabase = getSupabaseClient("seguranca");

      // Buscar todos os usuários
      const { data: usuarios, error: errorUsuarios } = await supabase
        .from("tbusuarios")
        .select("usuario_id, login, tipo_usuario");

      if (errorUsuarios) {
        throw errorUsuarios;
      }

      if (!usuarios || usuarios.length === 0) {
        setResultado("Nenhum usuário encontrado no banco de dados.");
        return;
      }

      // Filtrar usuários sem tipo_usuario definido
      const usuariosSemTipo = usuarios.filter(
        (u) => u.tipo_usuario === null || u.tipo_usuario === undefined
      );

      if (usuariosSemTipo.length === 0) {
        setResultado(
          `Todos os ${usuarios.length} usuários já possuem tipo definido.`
        );
        return;
      }

      // Começar a atualização
      setResultado(
        `Encontrados ${usuariosSemTipo.length} usuários sem tipo definido. Iniciando atualização...`
      );

      let atualizados = 0;
      let erros = 0;

      // Atualizar usuários - o admin deve ser tipo 2, os demais tipo 1
      for (const usuario of usuariosSemTipo) {
        // Não alterar o tipo do admin ou gabriel
        const tipo =
          usuario.login === "admin" || usuario.login === "gabriel" ? 2 : 1;

        const { error } = await supabase
          .from("tbusuarios")
          .update({ tipo_usuario: tipo })
          .eq("usuario_id", usuario.usuario_id);

        if (error) {
          console.error(`Erro ao atualizar ${usuario.login}:`, error);
          erros++;
        } else {
          atualizados++;
        }
      }

      setResultado(
        `Atualização concluída! ${atualizados} usuários atualizados. ${erros} erros ocorreram.`
      );
    } catch (err) {
      console.error("Erro durante a atualização:", err);
      setResultado(`Erro durante a atualização: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="container">
      <h1>Atualização de Tipos de Usuário</h1>
      <p>
        Esta ferramenta irá atualizar os usuários que não possuem tipo definido:{" "}
      </p>
      <ul>
        <li>
          O usuário &quot;admin&quot; receberá tipo_usuario = 2 (Administrador)
        </li>
        <li>Todos os outros usuários receberão tipo_usuario = 1 (Padrão)</li>
      </ul>
      <div className="actions">
        <button
          onClick={handleAtualizacao}
          disabled={loading}
          className="btn-update">
          {loading ? "Atualizando..." : "Iniciar Atualização"}
        </button>

        <button onClick={() => router.push("/dashboard")} className="btn-back">
          Voltar para Dashboard
        </button>
      </div>{" "}
      {resultado && (
        <div className="result">
          <h2>Resultado:</h2>
          <p>{resultado}</p>
        </div>
      )}
      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 2rem auto;
          padding: 2rem;
          background-color: var(--foreground-color);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        h1 {
          margin-top: 0;
          color: var(--primary-color);
        }

        .actions {
          display: flex;
          gap: 1rem;
          margin: 2rem 0;
        }

        .btn-update,
        .btn-back {
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-sm);
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-update {
          background-color: var(--primary-color);
          color: white;
        }

        .btn-update:hover {
          background-color: #0056b3;
        }

        .btn-update:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }

        .btn-back {
          background-color: var(--background-lighter);
          color: var(--text-color);
        }

        .btn-back:hover {
          background-color: var(--border-color);
        }

        .result {
          margin-top: 2rem;
          padding: 1rem;
          background-color: rgba(0, 0, 0, 0.05);
          border-radius: var(--radius-sm);
        }

        .result h2 {
          margin-top: 0;
          font-size: 1.2rem;
        }
      `}</style>
    </div>
  );
}
