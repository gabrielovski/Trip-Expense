"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "../../../../supabaseClient";
import { getCurrentUser } from "../../../../auth";

export default function EditarViagemPage() {
  const [formData, setFormData] = useState({
    destino: "",
    data_inicio: "",
    data_fim: "",
    motivo: "",
    observacoes: "",
    viagem_tipo_id: "1",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  console.log("Inicializando página de edição de viagem");
  console.log("ID da viagem:", id);
  console.log("Parâmetros:", params);

  useEffect(() => {
    console.log("Executando useEffect para carregar usuário");
    const userData = getCurrentUser();
    if (!userData) {
      console.error("Usuário não autenticado");
      router.push("/login");
      return;
    }

    console.log("Usuário autenticado:", userData);
    setUser(userData);
  }, [router]);
  // Efeito separado para buscar a viagem quando o usuário estiver definido
  useEffect(() => {
    if (user) {
      fetchViagem();
    }
  }, [user, id]);

  const fetchViagem = async () => {
    try {
      setLoading(true);
      console.log("Buscando viagem com ID:", id);
      console.log("Usuário atual:", JSON.stringify(user, null, 2));

      if (!id) {
        console.error("ID da viagem não disponível");
        setError("ID da viagem não encontrado");
        return;
      }

      const viagemClient = getSupabaseClient("viagem");
      console.log("Cliente Supabase para viagem inicializado");

      const { data, error } = await viagemClient
        .from("tbviagem")
        .select("*")
        .eq("viagem_id", id)
        .single();

      if (error) {
        console.error("Erro ao buscar viagem:", error);
        throw error;
      }

      if (!data) {
        console.error("Viagem não encontrada para o ID:", id);
        setError("Viagem não encontrada");
        return;
      }

      console.log("Dados da viagem:", data);
      console.log(
        "Usuário atual é dono da viagem:",
        data.usuario_id === user?.usuario_id
      );
      console.log("Usuário atual é administrador:", user?.tipo_usuario === 2);
      // Verificar se o usuário atual é o dono da viagem ou um administrador
      const isOwner = data.usuario_id === user?.usuario_id;
      const isAdmin = user?.tipo_usuario === 2 || user?.tipo_usuario === "2";

      console.log("É dono:", isOwner);
      console.log("É admin:", isAdmin);
      console.log(
        "Tipo de usuário:",
        typeof user?.tipo_usuario,
        user?.tipo_usuario
      );

      if (!isOwner && !isAdmin) {
        console.log(
          "Permissão negada: o usuário não é o dono nem administrador"
        );
        setError("Você não tem permissão para editar esta viagem");
        return;
      }

      // Formatar data_ida e data_volta para o formato yyyy-MM-dd
      const formatarDataParaInput = (dataStr) => {
        if (!dataStr) return "";

        // Se for um timestamp UNIX (número), converter para string de data
        if (typeof dataStr === "number") {
          const data = new Date(dataStr * 1000);
          return data.toISOString().split("T")[0];
        }

        // Se já estiver no formato yyyy-MM-dd, retornar o mesmo
        if (dataStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dataStr;
        }

        // Converter do formato dd/MM/yyyy para yyyy-MM-dd
        if (dataStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [dia, mes, ano] = dataStr.split("/");
          return `${ano}-${mes}-${dia}`;
        }

        return "";
      };

      setFormData({
        destino: data.destino || "",
        data_inicio: formatarDataParaInput(data.data_ida),
        data_fim: formatarDataParaInput(data.data_volta),
        motivo: data.motivo || "",
        observacoes: data.observacoes || "",
        viagem_tipo_id: data.viagem_tipo_id?.toString() || "1",
      });
    } catch (err) {
      console.error("Erro ao carregar viagem:", err);
      setError("Não foi possível carregar os dados da viagem");
    } finally {
      setLoading(false);
    }
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      // Validação básica
      if (!formData.destino || !formData.data_inicio || !formData.data_fim) {
        setError("Preencha todos os campos obrigatórios");
        return;
      }

      const viagemClient = getSupabaseClient("viagem");

      // Verificar se o ID do usuário é válido
      if (!user || !user.usuario_id) {
        console.error("Usuário não identificado ou sem ID válido:", user);
        setError("Erro de autenticação. Tente fazer login novamente.");
        return;
      }

      // Verificar se o ID da viagem é válido
      if (!id) {
        console.error("ID da viagem não identificado");
        setError("ID da viagem inválido.");
        return;
      }

      console.log("Atualizando viagem com os seguintes dados:", {
        id: id,
        destino: formData.destino,
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
        viagem_tipo_id: parseInt(formData.viagem_tipo_id),
        usuario_id: user.usuario_id,
      });

      // Configurar objeto de atualização com dados corrigidos
      const updateData = {
        destino: formData.destino,
        data_ida: formData.data_inicio,
        data_volta: formData.data_fim,
        motivo: formData.motivo || null,
        observacoes: formData.observacoes || null,
        viagem_tipo_id: parseInt(formData.viagem_tipo_id),
        atualizado_em: new Date().toISOString(),
        atualizado_por: parseInt(user.usuario_id),
      };

      console.log(
        "Dados para atualização:",
        JSON.stringify(updateData, null, 2)
      );

      // Converter o ID para o formato correto se necessário
      const viagemId = parseInt(id) || id;
      console.log("ID da viagem para atualização:", viagemId);

      // Primeira tentativa de atualização
      try {
        console.log(
          "Enviando dados para atualização:",
          JSON.stringify(updateData, null, 2)
        );
        const { data, error } = await viagemClient
          .from("tbviagem")
          .update(updateData)
          .eq("viagem_id", viagemId)
          .select();

        if (error) {
          console.error("Erro ao atualizar viagem:", error);
          console.error("Detalhes do erro:", {
            codigo: error.code,
            mensagem: error.message,
            detalhes: error.details,
            hint: error.hint,
          });

          // Se a primeira tentativa falhar, tentar com formato diferente
          console.log("Tentando segunda abordagem...");
          const { data: data2, error: error2 } = await viagemClient
            .from("tbviagem")
            .update(updateData)
            .eq("viagem_id", id) // Usando o ID original
            .select();

          if (error2) {
            console.error("Erro na segunda tentativa:", error2);
            throw error2;
          }

          console.log("Resposta da segunda tentativa:", data2);
          alert("Viagem atualizada com sucesso!");
          router.push(`/dashboard/viagens/${id}`);
        } else {
          // Se a primeira tentativa for bem-sucedida
          console.log("Resposta da atualização:", data);
          alert("Viagem atualizada com sucesso!");
          router.push(`/dashboard/viagens/${id}`);
        }
      } catch (err) {
        console.error("Erro ao atualizar viagem:", err);
        console.error("Detalhes do erro:", {
          mensagem: err?.message || "Sem mensagem de erro",
          codigo: err?.code || "Sem código de erro",
          detalhes: err?.details || "Sem detalhes adicionais",
          hint: err?.hint || "Sem sugestão disponível",
        });
        throw err;
      }
    } catch (err) {
      console.error("Erro ao atualizar viagem:", err);
      console.error("Detalhes do erro:", {
        mensagem: err?.message || "Sem mensagem de erro",
        codigo: err?.code || "Sem código de erro",
        detalhes: err?.details || "Sem detalhes adicionais",
        hint: err?.hint || "Sem sugestão disponível",
      });
      setError(
        `Erro ao atualizar viagem: ${
          err?.message || "Erro desconhecido"
        }. Tente novamente.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <p>Carregando dados da viagem...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container">
        <div className="alert alert-danger">
          <h4>Erro ao processar a solicitação</h4>
          <p>{error}</p>
          <p>Se o problema persistir, entre em contato com o suporte.</p>
        </div>
        <div className="button-group">
          <button className="btn btn-outline" onClick={() => setError(null)}>
            Tentar novamente
          </button>
          <Link href={`/dashboard/viagens/${id}`} className="btn btn-primary">
            Voltar para Detalhes da Viagem
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="page-header">
        <div>
          <h1>Editar Viagem</h1>
          <div className="breadcrumbs">
            <Link href="/dashboard/viagens">Viagens</Link> &gt;{" "}
            <Link href={`/dashboard/viagens/${id}`}>{formData.destino}</Link>{" "}
            &gt; <span>Editar</span>
          </div>
        </div>
      </header>

      <div className="card">
        <div className="card-header">
          <h2>Informações da Viagem</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="destino">Destino*</label>
              <input
                type="text"
                id="destino"
                name="destino"
                value={formData.destino}
                onChange={handleChange}
                className="form-input"
                required
                placeholder="Para onde você vai?"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="data_inicio">Data de Ida*</label>
                <input
                  type="date"
                  id="data_inicio"
                  name="data_inicio"
                  value={formData.data_inicio}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="data_fim">Data de Volta*</label>
                <input
                  type="date"
                  id="data_fim"
                  name="data_fim"
                  value={formData.data_fim}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="viagem_tipo_id">Tipo de Viagem*</label>
              <select
                id="viagem_tipo_id"
                name="viagem_tipo_id"
                value={formData.viagem_tipo_id}
                onChange={handleChange}
                className="form-select"
                required>
                <option value="1">Negócios</option>
                <option value="2">Treinamento</option>
                <option value="3">Conferência</option>
                <option value="4">Outros</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="motivo">Motivo da Viagem</label>
              <input
                type="text"
                id="motivo"
                name="motivo"
                value={formData.motivo}
                onChange={handleChange}
                className="form-input"
                placeholder="Por que você está viajando?"
              />
            </div>

            <div className="form-group">
              <label htmlFor="observacoes">Observações</label>
              <textarea
                id="observacoes"
                name="observacoes"
                value={formData.observacoes}
                onChange={handleChange}
                className="form-textarea"
                rows="3"
                placeholder="Alguma informação adicional?"></textarea>
            </div>

            <div className="form-buttons">
              <Link
                href={`/dashboard/viagens/${id}`}
                className="btn btn-secondary">
                Cancelar
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
