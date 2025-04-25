"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "../../../supabaseClient";
import { getCurrentUser } from "../../../auth";

export default function NovaViagemPage() {
  const [formData, setFormData] = useState({
    destino: "",
    data_inicio: "",
    data_fim: "",
    motivo: "",
    observacoes: "",
    viagem_tipo_id: "1", // Valor padrão: Nacional
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
    }
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validações básicas
    if (
      !formData.destino ||
      !formData.data_inicio ||
      !formData.data_fim ||
      !formData.motivo ||
      !formData.viagem_tipo_id
    ) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    // Verifica se a data de fim é posterior à data de início
    if (new Date(formData.data_fim) < new Date(formData.data_inicio)) {
      setError("A data de fim deve ser posterior à data de início.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const user = getCurrentUser();

      // Verificar se o usuário está autenticado
      if (!user || !user.usuario_id) {
        setError("Você precisa estar autenticado para criar uma viagem.");
        router.push("/login");
        return;
      }

      // Use o client já configurado para o schema viagem
      const supabase = getSupabaseClient("viagem");

      // Preparar dados da viagem conforme o banco
      const viagemData = {
        data_ida: formData.data_inicio,
        data_volta: formData.data_fim,
        viagem_tipo_id: parseInt(formData.viagem_tipo_id),
        atualizado_em: new Date().toISOString(),
        atualizado_por: user.usuario_id,
        destino: formData.destino,
        motivo: formData.motivo,
        observacoes: formData.observacoes,
        usuario_id: user.usuario_id, // Adiciona o usuário responsável
      };

      const { data, error } = await supabase
        .from("tbviagem")
        .insert(viagemData);

      if (error) {
        throw error;
      }

      // Buscar o ID da viagem criada
      const { data: viagemCriada, error: queryError } = await supabase
        .from("tbviagem")
        .select("viagem_id")
        .eq("data_ida", formData.data_inicio)
        .eq("data_volta", formData.data_fim)
        .eq("viagem_tipo_id", formData.viagem_tipo_id)
        .order("atualizado_em", { ascending: false })
        .limit(1)
        .single();

      console.log("viagemCriada:", viagemCriada); // <-- Adicionado para debug

      if (queryError) {
        throw new Error(
          "Viagem foi criada, mas não foi possível recuperar seu ID."
        );
      }

      if (!viagemCriada) {
        throw new Error("Não foi possível recuperar a viagem criada.");
      }

      // Redirecionar para a página da viagem criada
      router.push(`/dashboard/viagens/${viagemCriada.viagem_id}`);
    } catch (err) {
      console.log("Erro ao criar viagem:", err);

      // Tratamento mais completo do erro
      let errorMessage =
        "Não foi possível criar a viagem. Por favor, tente novamente.";
      let errorDetails = {};
      let errorCode = null;

      // Tentativa de extrair informações úteis do erro, mesmo se for um objeto vazio
      try {
        if (err) {
          // Verificar se é um erro do Supabase
          if (err.code) {
            errorCode = err.code;
            errorMessage = err.message || errorMessage;

            errorDetails = {
              code: err.code,
              hint: err.hint,
              details: err.details,
            };
          }
          // Verificar se é um Error padrão do JavaScript
          else if (err instanceof Error) {
            errorMessage = err.message;
            errorDetails = {
              name: err.name,
              stack: err.stack ? err.stack.split("\n")[0] : undefined,
            };
          }
        }

        // Log com informações significativas
        console.log("Erro detalhado:", {
          message: errorMessage,
          ...errorDetails,
        });
      } catch (logError) {
        // Caso ocorra erro ao tentar extrair detalhes do erro
        console.error("Erro ao processar detalhes do erro:", logError.message);
      }

      // Mostrar mensagem apropriada para o usuário com base no tipo de erro
      if (errorCode === "23505") {
        setError("Esta viagem já existe no sistema.");
      } else if (errorCode === "23503") {
        setError("Referência inválida. Verifique os dados informados.");
      } else if (errorCode === "23502") {
        setError("Campo obrigatório não preenchido.");
      } else if (errorMessage.includes("ID")) {
        setError(
          "Viagem criada com sucesso, mas houve um problema ao recuperar os detalhes."
        );
        // Redirecionar para a lista de viagens, já que a viagem foi criada
        setTimeout(() => router.push("/dashboard/viagens"), 2000);
        return;
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header-container">
        <h1>Nova Viagem</h1>
        <Link href="/dashboard/viagens" className="btn btn-secondary">
          Voltar
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="form-container">
        <div className="form-group">
          <label htmlFor="destino">Destino*</label>
          <input
            type="text"
            id="destino"
            name="destino"
            value={formData.destino}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="data_inicio">Data de Início*</label>
            <input
              type="date"
              id="data_inicio"
              name="data_inicio"
              value={formData.data_inicio}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="data_fim">Data de Fim*</label>
            <input
              type="date"
              id="data_fim"
              name="data_fim"
              value={formData.data_fim}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="motivo">Motivo da Viagem*</label>
          <input
            type="text"
            id="motivo"
            name="motivo"
            value={formData.motivo}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="observacoes">Observações</label>
          <textarea
            id="observacoes"
            name="observacoes"
            value={formData.observacoes}
            onChange={handleChange}
            className="form-control"
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="viagem_tipo_id">Tipo de Viagem*</label>
          <select
            id="viagem_tipo_id"
            name="viagem_tipo_id"
            value={formData.viagem_tipo_id}
            onChange={handleChange}
            className="form-control"
            required>
            <option value="1">Nacional</option>
            <option value="2">Internacional</option>
            <option value="3">Regional</option>
          </select>
        </div>

        <div className="form-buttons">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => router.push("/dashboard/viagens")}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Criando..." : "Criar Viagem"}
          </button>
        </div>
      </form>

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .form-container {
          background-color: var(--foreground-color);
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .form-control {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 16px;
          background-color: var(--background-color);
          color: var(--text-color);
        }
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--text-color);
        }
        .form-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 30px;
        }
        .error-message {
          color: var(--error-color);
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 20px;
          text-align: center;
        }
        .btn {
          padding: 10px 16px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background-color: var(--primary-color);
          color: white;
          border: none;
        }
        .btn-primary:hover {
          background-color: #4338ca;
        }
        .btn-primary:disabled {
          background-color: #333333;
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-secondary {
          background-color: #6c757d;
          color: white;
          border: none;
          text-decoration: none;
        }
        .btn-secondary:hover {
          background-color: #5a6268;
        }
        .btn-outline {
          background-color: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-color);
        }
        .btn-outline:hover {
          background-color: var(--background-color);
        }
      `}</style>
    </div>
  );
}
