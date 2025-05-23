"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "../../../supabaseClient";
import { getCurrentUser } from "../../../auth";
import "./styles.css"; // Importando o arquivo CSS

// Função para converter timestamp UNIX para data brasileira
const formatarDataLocal = (dataStr) => {
  if (!dataStr) return "";

  // Se for um timestamp UNIX (número), converter para string de data
  if (typeof dataStr === "number") {
    const data = new Date(dataStr * 1000); // Multiplicar por 1000 para converter segundos em milissegundos
    return data.toLocaleDateString("pt-BR");
  }

  // Se for uma string de data ISO, formatá-la
  const [ano, mes, dia] = dataStr.split("-");
  return `${dia}/${mes}/${ano}`;
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function ViagemDetalhesPage() {
  const [viagem, setViagem] = useState(null);
  const [despesas, setDespesas] = useState([]);
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  // Modal para nova despesa
  const [showModal, setShowModal] = useState(false);

  // Função para obter data local formatada para input date (YYYY-MM-DD)
  const getDataLocalFormatada = () => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  };

  // Form state para nova despesa
  const [novaDespesa, setNovaDespesa] = useState({
    descricao: "",
    valor: "",
    valorNumerico: 0,
    data: getDataLocalFormatada(),
    categoria: 1, // Valor padrão - Transporte
    observacoes: "",
  });
  useEffect(() => {
    const userData = getCurrentUser();
    if (!userData) {
      router.push("/login");
      return;
    }

    setUser(userData);

    // Certifique-se de que loading seja true antes de buscar os dados
    setLoading(true);

    // Primeiro busca os dados da viagem
    const loadData = async () => {
      try {
        await fetchViagem();
        // Só busca as despesas depois que a viagem for carregada com sucesso
        await fetchDespesas();
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        // Garantir que loading seja false mesmo em caso de erro
        setLoading(false);
      }
    };

    loadData();
  }, [router, id]);
  const fetchViagem = async () => {
    try {
      // Usar getSupabaseClient com o esquema específico
      const viagemClient = getSupabaseClient("viagem");
      const segurancaClient = getSupabaseClient("seguranca");

      // Resetar erro antes de buscar novos dados
      setError(null);
      const { data, error } = await viagemClient
        .from("tbviagem")
        .select(
          `
          *,
          tipo:viagem_tipo_id(descricao)
        `
        )
        .eq("viagem_id", id)
        .single();

      if (error) {
        // Log mais detalhado para entender o erro específico
        console.error("Erro na busca da viagem:", error.message);
        console.error("Código do erro:", error.code);

        // Se o erro for "não encontrado", tratar especificamente
        if (
          error.code === "PGRST116" ||
          error.message.includes("não encontrada")
        ) {
          setError("Viagem não encontrada. Verifique o ID informado.");
        } else {
          throw error;
        }
        return;
      }

      // Verificar se há dados
      if (!data) {
        setError("Viagem não encontrada. Os dados retornaram vazios.");
        return;
      }

      // Buscar dados do usuário criador da viagem
      if (data.usuario_id) {
        const { data: criadorData, error: criadorError } = await segurancaClient
          .from("tbusuarios")
          .select("nome, login")
          .eq("usuario_id", data.usuario_id)
          .single();

        if (!criadorError && criadorData) {
          data.criador = criadorData;
        }
      }

      // Buscar dados do usuário responsável pela última atualização
      if (data.atualizado_por) {
        const { data: userData, error: userError } = await segurancaClient
          .from("tbusuarios")
          .select("nome, email")
          .eq("usuario_id", data.atualizado_por)
          .single();

        if (!userError && userData) {
          data.responsavel = userData;
        }
      }
      const userData = getCurrentUser();
      if (!userData) {
        router.push("/login");
        return;
      }

      // Só definir a viagem se tivermos dados válidos
      if (data && Object.keys(data).length > 0) {
        setViagem(data);
      } else {
        setError("Dados da viagem estão incompletos ou inválidos.");
        console.warn("Dados da viagem são vazios ou inválidos:", data);
      }
    } catch (err) {
      console.error(
        "Erro ao carregar detalhes da viagem:",
        err?.message || "Erro sem mensagem"
      );

      // Detecção mais avançada de erros
      if (
        err?.code === "PGRST116" ||
        (err?.message && err.message.includes("not found"))
      ) {
        setError(`Viagem com ID ${id} não encontrada na base de dados.`);
      } else if (err?.code === "PGRST301") {
        setError("Você não tem permissão para acessar esta viagem.");
      } else if (err?.message && err.message.includes("network")) {
        setError(
          "Erro de conexão com o banco de dados. Verifique sua conexão com a internet."
        );
      } else {
        setError("Não foi possível carregar os detalhes da viagem.");
      }

      // Registrar todos os detalhes para debugging
      if (err) {
        const errorDetails = {
          message: err.message,
          code: err.code,
          status: err.status,
          details: err.details,
          hint: err.hint,
        };
        console.log("Detalhes do erro:", errorDetails);
      }
    } finally {
      // Sempre marca o carregamento como concluído, mesmo em caso de erro
      setLoading(false);
    }
  };
  const fetchDespesas = async () => {
    // Se não temos ID válido ou já temos erro na viagem, não buscar despesas
    if (!id || error) {
      return;
    }

    try {
      // Usar getSupabaseClient com o esquema 'financeiro'
      const financeiroClient = getSupabaseClient("financeiro");

      const { data, error } = await financeiroClient
        .from("tbcontaspagar")
        .select(
          `
          *,
          tipo_titulo:tipo_titulo_id(descricao)
        `
        )
        .eq("id_viagem", id)
        .order("data_vencimento", { ascending: false });

      if (error) throw error;

      // Calcular o total das despesas
      const total = data.reduce(
        (sum, despesa) => sum + parseFloat(despesa.valor || 0) / 100,
        0
      );
      setTotalDespesas(total);

      // Adicionar categoria legível para interface
      const despesasProcessadas = data.map((despesa) => {
        let categoria;
        switch (despesa.tipo_titulo_id) {
          case 1:
            categoria = "transporte";
            break;
          case 2:
            categoria = "hospedagem";
            break;
          case 3:
            categoria = "alimentacao";
            break;
          default:
            categoria = "outros";
        }

        return {
          ...despesa,
          categoria,
          status: despesa.status_aprovacao || "pendente",
          data: new Date(despesa.data_vencimento).toISOString().split("T")[0],
        };
      });

      setDespesas(despesasProcessadas);
    } catch (err) {
      console.error("Erro ao carregar despesas:", err);
      setError("Não foi possível carregar as despesas desta viagem.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeDespesa = (e) => {
    const { name, value, type, files } = e.target;

    if (type === "file") {
      setNovaDespesa({
        ...novaDespesa,
        [name]: files[0],
      });
    } else if (name === "valor") {
      // Remover caracteres não numéricos para garantir que o valor é válido
      const numericValue = value.replace(/[^\d.]/g, "");
      setNovaDespesa({
        ...novaDespesa,
        [name]: numericValue,
      });
    } else if (name === "categoria") {
      // Converter categoria para o ID correspondente
      setNovaDespesa({
        ...novaDespesa,
        [name]: parseInt(value),
      });
    } else {
      setNovaDespesa({
        ...novaDespesa,
        [name]: value,
      });
    }
  };

  const handleValorChange = (e) => {
    const { value } = e.target;
    // Remover caracteres não numéricos
    const numericValue = value.replace(/[^\d]/g, "");

    // Formatar como moeda brasileira (agora sem dividir por 100)
    const formattedValue = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numericValue / 100);

    setNovaDespesa({
      ...novaDespesa,
      valor: formattedValue,
      valorNumerico: numericValue / 100, // Armazenar o valor numérico para enviar ao banco
    });
  };

  const handleSubmitDespesa = async (e) => {
    e.preventDefault();

    try {
      if (
        !novaDespesa.descricao ||
        !novaDespesa.valor ||
        !novaDespesa.data ||
        !novaDespesa.categoria
      ) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
      }

      const financeiroClient = getSupabaseClient("financeiro");

      // Converter data para timestamp UNIX (inteiro)
      const dataVencimento = Math.floor(
        new Date(novaDespesa.data).getTime() / 1000
      );
      const dataPagamento = Math.floor(new Date().getTime() / 1000); // Data atual como pagamento

      // Gerar um ID único para conta_pagar_id (semelhante ao que fazemos para usuario_id em auth.js)
      const conta_pagar_id = Math.floor(Math.random() * 2147483647);

      // Criar registro de despesa como conta a pagar
      const { data, error } = await financeiroClient
        .from("tbcontaspagar")
        .insert({
          conta_pagar_id: conta_pagar_id, // Adicionando o ID gerado
          id_viagem: Number(id),
          funcionario_id: Number(user.usuario_id),
          descricao: novaDespesa.descricao,
          valor: Math.floor(novaDespesa.valorNumerico * 100), // Converter para centavos (inteiro)
          data_vencimento: dataVencimento, // Timestamp UNIX como inteiro
          data_pagamento: dataPagamento, // Timestamp UNIX como inteiro
          tipo_titulo_id: Number(novaDespesa.categoria),
          observacoes: novaDespesa.observacoes,
          status_aprovacao: "pendente",
          atualizado_em: new Date().toISOString(),
          atualizado_por: Number(user.usuario_id),
        })
        .select();

      if (error) throw error;

      // Upload de comprovante
      if (novaDespesa.comprovante) {
        const fileName = `despesa-${data[0].conta_pagar_id}-${Date.now()}`;
        const { error: uploadError } = await financeiroClient.storage
          .from("comprovantes")
          .upload(fileName, novaDespesa.comprovante);

        if (uploadError) throw uploadError;

        // Atualizar despesa com referência ao comprovante
        await financeiroClient
          .from("tbcontaspagar")
          .update({ comprovante_url: fileName })
          .eq("conta_pagar_id", data[0].conta_pagar_id);
      }

      // Fechar modal e resetar form
      setShowModal(false);
      setNovaDespesa({
        descricao: "",
        valor: "",
        valorNumerico: 0,
        data: getDataLocalFormatada(),
        categoria: 1,
        comprovante: null,
        observacoes: "",
      });

      // Recarregar despesas
      fetchDespesas();
    } catch (err) {
      console.error(
        "Erro ao adicionar despesa:",
        err?.message || "Erro sem mensagem"
      );

      try {
        const errorDetails = {
          name: err?.name,
          code: err?.code,
          details: err?.details,
          hint: err?.hint,
          status: err?.status,
        };

        // Se houver comprovante, adicionar informação sobre ele para debug
        if (novaDespesa.comprovante) {
          errorDetails.comprovanteInfo = {
            name: novaDespesa.comprovante.name,
            size: novaDespesa.comprovante.size,
            type: novaDespesa.comprovante.type,
          };
        }

        console.error("Detalhes do erro ao adicionar despesa:", errorDetails);

        // Mostrar stack trace se disponível
        if (err?.stack) {
          console.error("Stack trace:", err.stack);
        }
      } catch (logError) {
        console.error("Erro ao exibir detalhes do erro:", logError.message);
      }

      alert(
        "Não foi possível adicionar a despesa. Por favor, tente novamente."
      );
    }
  };
  const handleExcluirViagem = async () => {
    // Verificar se o usuário tem permissão para excluir
    const isOwner = viagem?.usuario_id === user?.usuario_id;
    const isAdmin = user?.tipo_usuario === 2 || user?.tipo_usuario === "2";

    if (!isOwner && !isAdmin) {
      alert("Você não tem permissão para excluir esta viagem.");
      return;
    }

    if (
      !confirm(
        "Tem certeza que deseja excluir esta viagem? Todas as despesas relacionadas também serão excluídas."
      )
    )
      return;

    try {
      setLoading(true);

      // Primeiro excluir as despesas relacionadas à viagem
      const financeiroClient = getSupabaseClient("financeiro");
      const { error: despesasError } = await financeiroClient
        .from("tbcontaspagar")
        .delete()
        .eq("id_viagem", id);

      if (despesasError) {
        console.error("Erro ao excluir despesas relacionadas:", despesasError);
        throw despesasError;
      }

      // Depois excluir a viagem
      const viagemClient = getSupabaseClient("viagem");
      const { error: viagemError } = await viagemClient
        .from("tbviagem")
        .delete()
        .eq("viagem_id", id);

      if (viagemError) throw viagemError;

      alert("Viagem excluída com sucesso!");
      router.push("/dashboard/viagens");
    } catch (err) {
      console.error("Erro ao excluir viagem:", err);
      alert("Não foi possível excluir a viagem. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };
  const handleEditarViagem = () => {
    // Verificar se o usuário tem permissão para editar
    const isOwner = viagem?.usuario_id === user?.usuario_id;
    const isAdmin = user?.tipo_usuario === 2 || user?.tipo_usuario === "2";

    console.log(
      "Tipo do usuário:",
      typeof user?.tipo_usuario,
      user?.tipo_usuario
    );
    console.log("É dono:", isOwner);
    console.log("É admin:", isAdmin);

    if (!isOwner && !isAdmin) {
      alert("Você não tem permissão para editar esta viagem.");
      return;
    }

    try {
      setLoading(true);
      console.log(`Redirecionando para edição da viagem ${id}...`);
      router.push(`/dashboard/viagens/editar/${id}`);
    } catch (err) {
      console.error("Erro ao redirecionar para edição:", err);
      alert("Não foi possível abrir a tela de edição. Tente novamente.");
      setLoading(false);
    }
  };

  // Obter destino da viagem
  const getDestino = () => {
    if (!viagem) return "";
    return typeof viagem.tipo === "string"
      ? viagem.tipo
      : viagem.tipo?.descricao || "Sem destino";
  }; // Mostrar mensagem de carregamento enquanto estiver carregando
  if (loading) {
    return (
      <div className="container">
        <p className="loading-message">Carregando detalhes da viagem...</p>
      </div>
    );
  }

  // Mostrar mensagem de erro apenas se o carregamento terminou E temos erro OU não temos dados da viagem
  if (!loading && error) {
    return (
      <div className="container">
        <div className="card error-card">
          <div className="card-header">
            <h2>Viagem não encontrada</h2>
          </div>
          <div className="card-body">
            <p className="error-message">{error}</p>
            <p>
              Isso pode acontecer pelos seguintes motivos:
              <ul>
                <li>O ID da viagem está incorreto</li>
                <li>A viagem foi excluída</li>
                <li>Você não tem permissão para acessar esta viagem</li>
                <li>Houve um problema na conexão com o banco de dados</li>
              </ul>
            </p>
            <Link href="/dashboard/viagens" className="btn btn-primary">
              Voltar para Viagens
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Se não tem viagem após o carregamento, não renderizar mais nada
  if (!viagem) {
    return null;
  }

  return (
    <div className="container">
      <header className="page-header">
        <div>
          <h1>Detalhes da Viagem</h1>
          <div className="breadcrumbs">
            <Link href="/dashboard/viagens">Viagens</Link> &gt;{" "}
            <span>{getDestino()}</span>
          </div>
        </div>{" "}
        <div className="actions">
          <Link href="/dashboard/viagens" className="btn btn-outline">
            Voltar para Viagens
          </Link>
          <Link
            href={`/dashboard/viagens/${id}/despesas`}
            className="btn btn-outline">
            Ver Todas as Despesas
          </Link>{" "}
          {/* Mostrar os botões de aprovação/rejeição apenas para gerentes e viagens pendentes */}
          {(user?.tipo_usuario === 2 || user?.tipo_usuario === "2") &&
            viagem?.status === "pendente" && (
              <>
                <button
                  className="btn btn-outline-danger"
                  onClick={() => handleAprovarRejeitar("rejeitada")}>
                  Rejeitar
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => handleAprovarRejeitar("aprovada")}>
                  Aprovar
                </button>
              </>
            )}{" "}
          {/* Mostrar botão concluir apenas para o dono da viagem e se estiver aprovada */}
          {viagem?.usuario_id === user?.usuario_id &&
            viagem?.status === "aprovada" && (
              <button
                className="btn btn-primary"
                onClick={handleConcluirViagem}>
                Concluir Viagem
              </button>
            )}{" "}
          {/* Botões de Editar e Excluir (mostrados apenas para o dono da viagem ou administradores/tipo_usuario=2) */}
          {(viagem?.usuario_id === user?.usuario_id ||
            user?.tipo_usuario === 2 ||
            user?.tipo_usuario === "2") && (
            <>
              <button
                className="btn btn-secondary btn-action"
                onClick={handleEditarViagem}
                title="Editar Viagem"
                aria-label="Editar Viagem">
                <span className="btn-text">Editar Viagem</span>
              </button>
              <button
                className="btn btn-danger btn-action"
                onClick={handleExcluirViagem}
                title="Excluir Viagem"
                aria-label="Excluir Viagem">
                <span className="btn-text">Excluir Viagem</span>
              </button>
            </>
          )}
        </div>
      </header>

      <div className="card">
        <div className="card-header">
          <h2>Detalhes da Viagem</h2>
        </div>
        <div className="card-body">
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Destino</div>
              <div className="info-value">
                {viagem.destino || "Destino não informado"}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Data de Ida</div>
              <div className="info-value">
                {formatarDataLocal(viagem.data_ida)}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Data de Volta</div>
              <div className="info-value">
                {formatarDataLocal(viagem.data_volta)}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Viajante</div>
              <div className="info-value">
                {viagem.criador?.nome || "Não informado"}
              </div>
            </div>
            {viagem.observacoes && (
              <div className="info-item full-width">
                <div className="info-label">Observações</div>
                <div className="info-value">{viagem.observacoes}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <div className="card-header">
          <h2>Despesas</h2>
          <div className="header-actions">
            <div className="total-value">
              Total: {formatCurrency(totalDespesas)}
            </div>

            {/* Exibir botão de adicionar despesa para qualquer status de viagem */}
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}>
              Adicionar Despesa
            </button>
          </div>
        </div>
        <div className="card-body">
          {despesas.length === 0 ? (
            <p className="empty-state">
              Nenhuma despesa registrada para esta viagem.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {despesas.map((despesa) => (
                    <tr key={despesa.conta_pagar_id}>
                      <td>{formatarDataLocal(despesa.data_vencimento)}</td>
                      <td>{despesa.descricao}</td>
                      <td>
                        <span className={`category-tag ${despesa.categoria}`}>
                          {despesa.tipo_titulo?.descricao ||
                            despesa.categoria.charAt(0).toUpperCase() +
                              despesa.categoria.slice(1)}
                        </span>
                      </td>
                      <td className="text-right">
                        {formatCurrency(despesa.valor / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal para nova despesa */}
      {showModal && (
        <div className="modal">
          <div className="modal-backdrop" onClick={() => setShowModal(false)} />
          <div className="modal-content">
            <div className="modal-header">
              <h3>Nova Despesa</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <form onSubmit={handleSubmitDespesa}>
              <div className="form-group">
                <label htmlFor="descricao">Descrição*</label>
                <input
                  type="text"
                  id="descricao"
                  name="descricao"
                  value={novaDespesa.descricao}
                  onChange={handleChangeDespesa}
                  className="form-input"
                  required
                  placeholder="Descreva a despesa"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="valor">Valor (R$)*</label>
                  <input
                    type="text"
                    id="valor"
                    name="valor"
                    value={novaDespesa.valor}
                    onChange={handleValorChange}
                    className="form-input"
                    required
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="data">Data*</label>
                  <input
                    type="date"
                    id="data"
                    name="data"
                    value={novaDespesa.data}
                    onChange={handleChangeDespesa}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="categoria">Categoria*</label>
                <select
                  id="categoria"
                  name="categoria"
                  value={novaDespesa.categoria}
                  onChange={handleChangeDespesa}
                  className="form-select"
                  required>
                  <option value={1}>Transporte</option>
                  <option value={2}>Hospedagem</option>
                  <option value={3}>Alimentação</option>
                  <option value={4}>Outros</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="observacoes">Observações</label>
                <textarea
                  id="observacoes"
                  name="observacoes"
                  value={novaDespesa.observacoes}
                  onChange={handleChangeDespesa}
                  className="form-textarea"
                  rows={3}
                  placeholder="Observações adicionais (opcional)"
                />
              </div>

              <div className="form-buttons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Adicionar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
