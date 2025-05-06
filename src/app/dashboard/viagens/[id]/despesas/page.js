"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "../../../../supabaseClient";
import { getCurrentUser } from "../../../../auth";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

// Registrar componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

// Função para formatar data considerando diferentes formatos
const formatarData = (dataValue) => {
  if (!dataValue) return "Data não definida";

  try {
    // Se for timestamp UNIX (em segundos)
    if (typeof dataValue === "number") {
      return new Date(dataValue * 1000).toLocaleDateString("pt-BR");
    }

    // Se for string ISO ou outro formato de data
    if (typeof dataValue === "string") {
      // Se tiver traços, pode ser formato ISO (YYYY-MM-DD)
      if (dataValue.includes("-")) {
        const [ano, mes, dia] = dataValue.split("-");
        if (ano && mes && dia) {
          return `${dia}/${mes}/${ano}`;
        }
      }

      // Tentar converter normalmente
      const data = new Date(dataValue);
      if (!isNaN(data.getTime())) {
        return data.toLocaleDateString("pt-BR");
      }
    }

    // Se for objeto Date
    if (dataValue instanceof Date && !isNaN(dataValue.getTime())) {
      return dataValue.toLocaleDateString("pt-BR");
    }

    return "Data não definida";
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return "Data não definida";
  }
};

export default function DespesasPage() {
  const [viagem, setViagem] = useState(null);
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [ordenacao, setOrdenacao] = useState("data-desc");
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  // Estados para relatórios
  const [totaisPorCategoria, setTotaisPorCategoria] = useState({});

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
    data: getDataLocalFormatada(), // Usando a função para obter data local
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
    fetchViagemEDespesas();
  }, [router, id]);

  const fetchViagemEDespesas = async () => {
    try {
      setLoading(true);
      const supabaseViagem = getSupabaseClient("viagem");
      const supabaseFinanceiro = getSupabaseClient("financeiro");

      // Buscar detalhes da viagem
      const { data: viagemData, error: viagemError } = await supabaseViagem
        .from("tbviagem")
        .select(
          `
          *,
          tipo:viagem_tipo_id(descricao)
        `
        )
        .eq("viagem_id", id)
        .single();

      if (viagemError) throw viagemError;

      // Adicionar dados do usuário manualmente
      const userData = getCurrentUser();
      if (!userData) {
        router.push("/login");
        return;
      }

      const viagemComUsuario = {
        ...viagemData,
        destino: viagemData.destino || viagemData.tipo?.descricao || "Viagem",
        usuario_nome: userData.login,
      };

      setViagem(viagemComUsuario);

      // Verificar se o usuário tem acesso à viagem (se for o dono ou gerente)
      if (
        viagemData.usuario_id !== userData.usuario_id &&
        userData.tipo_usuario !== 2
      ) {
        setError(
          "Você não tem permissão para acessar os detalhes desta viagem."
        );
        return;
      }

      // Buscar despesas da viagem
      const { data: despesasData, error: despesasError } =
        await supabaseFinanceiro
          .from("tbcontaspagar")
          .select(
            `
          *,
          tipo_titulo:tipo_titulo_id(descricao)
        `
          )
          .eq("id_viagem", id)
          .order("data_vencimento", { ascending: false });

      if (despesasError) throw despesasError;

      // Converter dados das despesas para o formato esperado pela interface
      const despesasProcessadas = despesasData.map((despesa) => {
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
          despesa_id: despesa.conta_pagar_id,
          categoria,
          descricao: despesa.descricao,
          valor: despesa.valor / 100, // Converter de centavos para reais
          data: new Date(despesa.data_vencimento * 1000).toISOString(),
        };
      });

      setDespesas(despesasProcessadas);

      // Calcular totais por categoria para relatórios
      calcularTotais(despesasProcessadas);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError(
        "Não foi possível carregar os detalhes da viagem e suas despesas."
      );
    } finally {
      setLoading(false);
    }
  };

  const calcularTotais = (despesasData) => {
    // Inicializar contadores
    const categorias = {
      transporte: 0,
      hospedagem: 0,
      alimentacao: 0,
      outros: 0,
    };

    // Calcular totais
    despesasData.forEach((despesa) => {
      if (categorias.hasOwnProperty(despesa.categoria)) {
        categorias[despesa.categoria] += parseFloat(despesa.valor);
      }
    });

    setTotaisPorCategoria(categorias);
  };

  const handleOrdenacaoChange = (e) => {
    setOrdenacao(e.target.value);
  };

  const despesasFiltradas = () => {
    let resultado = [...despesas];

    // Aplicar ordenação
    switch (ordenacao) {
      case "valor-desc":
        resultado.sort((a, b) => parseFloat(b.valor) - parseFloat(a.valor));
        break;
      case "valor-asc":
        resultado.sort((a, b) => parseFloat(a.valor) - parseFloat(b.valor));
        break;
      case "data-asc":
        resultado.sort((a, b) => new Date(a.data) - new Date(b.data));
        break;
      case "data-desc":
      default:
        resultado.sort((a, b) => new Date(b.data) - new Date(a.data));
    }

    return resultado;
  };

  const getTotalDespesas = () => {
    return despesas.reduce(
      (total, despesa) => total + parseFloat(despesa.valor),
      0
    );
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getCategoriaLabel = (categoria) => {
    switch (categoria) {
      case "transporte":
        return "Transporte";
      case "hospedagem":
        return "Hospedagem";
      case "alimentacao":
        return "Alimentação";
      case "outros":
        return "Outros";
      default:
        return categoria;
    }
  };

  const getCategoriaIconClass = (categoria) => {
    switch (categoria) {
      case "transporte":
        return "fa-car";
      case "hospedagem":
        return "fa-hotel";
      case "alimentacao":
        return "fa-utensils";
      case "outros":
        return "fa-receipt";
      default:
        return "fa-receipt";
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

      // Gerar um ID único para conta_pagar_id
      const conta_pagar_id = Math.floor(Math.random() * 2147483647);

      // Criar registro de despesa como conta a pagar
      const { data, error } = await financeiroClient
        .from("tbcontaspagar")
        .insert({
          conta_pagar_id: conta_pagar_id,
          id_viagem: Number(id),
          funcionario_id: Number(user.usuario_id),
          descricao: novaDespesa.descricao,
          valor: Math.floor(novaDespesa.valorNumerico * 100), // Converter para centavos (inteiro)
          data_vencimento: dataVencimento,
          data_pagamento: dataPagamento,
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
        data: getDataLocalFormatada(), // Usando a função para obter data local
        categoria: 1,
        comprovante: null,
        observacoes: "",
      });

      // Recarregar dados de despesas
      fetchViagemEDespesas();
      alert("Despesa adicionada com sucesso!");
    } catch (err) {
      console.error("Erro ao adicionar despesa:", err);
      alert(
        "Não foi possível adicionar a despesa. Por favor, tente novamente."
      );
    }
  };

  // Dados para o gráfico de categoria
  const chartData = {
    labels: ["Transporte", "Hospedagem", "Alimentação", "Outros"],
    datasets: [
      {
        data: [
          totaisPorCategoria.transporte || 0,
          totaisPorCategoria.hospedagem || 0,
          totaisPorCategoria.alimentacao || 0,
          totaisPorCategoria.outros || 0,
        ],
        backgroundColor: ["#36A2EB", "#4BC0C0", "#FFCE56", "#9966FF"],
        borderColor: ["#36A2EB", "#4BC0C0", "#FFCE56", "#9966FF"],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 15,
        },
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem) {
            return formatCurrency(tooltipItem.raw);
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="container">
        <p>Carregando dados...</p>
      </div>
    );
  }

  if (error || !viagem) {
    return (
      <div className="container">
        <p className="error-message">{error || "Viagem não encontrada"}</p>
        <Link href="/dashboard/viagens" className="btn btn-primary">
          Voltar para Viagens
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header-container">
        <h1>Despesas da Viagem</h1>
        <div className="actions">
          <Link href={`/dashboard/viagens/${id}`} className="btn btn-outline">
            Voltar para Viagem
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary">
            Nova Despesa
          </button>
        </div>
      </div>

      <div className="breadcrumb">
        <Link href="/dashboard/viagens">Viagens</Link>
        {" > "}
        <Link href={`/dashboard/viagens/${id}`}>{viagem.destino}</Link>
        {" > "}
        <span>Despesas</span>
      </div>

      <div className="viagem-info-container">
        <div className="viagem-info-header">
          <h3>Detalhes da Viagem</h3>
        </div>
        <div className="viagem-info">
          <div className="info-row">
            <span className="info-label">Destino:</span>
            <span className="info-value">{viagem.destino}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Período:</span>
            <span className="info-value">
              {formatarData(viagem.data_ida)} a{" "}
              {formatarData(viagem.data_volta)}
            </span>
          </div>
        </div>
      </div>

      {/* Componente de Relatório */}
      <div className="relatorio-container">
        <div className="relatorio-header">
          <h3>Resumo Financeiro</h3>
        </div>

        <div className="cards-container">
          <div className="card">
            <div className="card-value">
              {formatCurrency(getTotalDespesas())}
            </div>
            <div className="card-label">Total de Despesas</div>
          </div>
        </div>

        <div className="charts-container">
          <div className="chart-card">
            <h4>Despesas por Categoria</h4>
            <div className="chart-wrapper">
              <Doughnut data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Despesas */}
      <div className="despesas-container">
        <div className="despesas-header">
          <h3>Despesas ({despesas.length})</h3>
          <div className="filtros">
            <div className="filtro-group">
              <label htmlFor="ordenacao">Ordenar por:</label>
              <select
                id="ordenacao"
                value={ordenacao}
                onChange={handleOrdenacaoChange}
                className="form-control">
                <option value="data-desc">Data (mais recente)</option>
                <option value="data-asc">Data (mais antiga)</option>
                <option value="valor-desc">Valor (maior)</option>
                <option value="valor-asc">Valor (menor)</option>
              </select>
            </div>
          </div>
        </div>

        {despesasFiltradas().length === 0 ? (
          <div className="despesas-empty">
            <p>Nenhuma despesa encontrada.</p>
          </div>
        ) : (
          <div className="despesas-list">
            {despesasFiltradas().map((despesa) => (
              <Link
                href={`/dashboard/viagens/${id}/despesas/${despesa.despesa_id}`}
                key={despesa.despesa_id}
                className="despesa-card">
                <div className="despesa-conteudo">
                  <div className="despesa-header">
                    <div className="despesa-titulo-com-icone">
                      <span
                        className={`categoria-icon categoria-${despesa.categoria}`}>
                        <i
                          className={`fas ${getCategoriaIconClass(
                            despesa.categoria
                          )}`}></i>
                      </span>
                      <h4 className="despesa-titulo">{despesa.descricao}</h4>
                    </div>
                    <div className="despesa-valor">
                      {formatCurrency(despesa.valor)}
                    </div>
                  </div>
                  <div className="despesa-detalhes">
                    <span className="despesa-data">
                      {new Date(despesa.data).toLocaleDateString("pt-BR")}
                    </span>
                    {" · "}
                    <span className="despesa-categoria-text">
                      {getCategoriaLabel(despesa.categoria)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
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

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
          background-color: var(--background-color);
        }
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .actions {
          display: flex;
          gap: 10px;
        }
        .breadcrumb {
          margin-bottom: 20px;
          color: var(--text-secondary);
        }
        .breadcrumb a {
          color: var(--primary-color);
          text-decoration: none;
        }
        .breadcrumb a:hover {
          text-decoration: underline;
        }
        .viagem-info-container {
          background-color: var(--foreground-color);
          padding: 20px;
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
          margin-bottom: 20px;
          border: 1px solid var(--border-color);
        }
        .viagem-info-header {
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border-color);
        }
        .viagem-info-header h3 {
          margin: 0;
        }
        .info-row {
          display: flex;
          margin-bottom: 10px;
        }
        .info-row:last-child {
          margin-bottom: 0;
        }
        .info-label {
          font-weight: 500;
          width: 80px;
          margin-right: 10px;
          color: var(--text-secondary);
        }
        .relatorio-container {
          background-color: var(--foreground-color);
          padding: 25px;
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
          margin-bottom: 20px;
          border: 1px solid var(--border-color);
        }
        .relatorio-header {
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border-color);
        }
        .relatorio-header h3 {
          margin: 0;
        }
        .cards-container {
          display: flex;
          gap: 20px;
          margin-bottom: 25px;
        }
        .card {
          flex: 1;
          padding: 20px;
          background-color: var(--background-color);
          border-radius: 8px;
          text-align: center;
          border: 1px solid var(--border-color);
        }
        .card-value {
          font-size: 1.6rem;
          font-weight: 700;
          margin-bottom: 10px;
          color: var(--text-color);
        }
        .card-label {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .charts-container {
          display: flex;
          gap: 20px;
        }
        .chart-card {
          flex: 1;
          padding: 20px;
          background-color: var(--background-color);
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }
        .chart-card h4 {
          margin: 0 0 15px 0;
          text-align: center;
          font-weight: 600;
          color: var(--text-color);
        }
        .chart-wrapper {
          max-width: 300px;
          margin: 0 auto;
        }
        .despesas-container {
          background-color: var(--foreground-color);
          padding: 25px;
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-color);
        }
        .despesas-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid var(--border-color);
        }
        .despesas-header h3 {
          margin: 0;
          color: var(--text-color);
        }
        .filtros {
          display: flex;
          gap: 15px;
        }
        .filtro-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .filtro-group label {
          margin: 0;
          white-space: nowrap;
          color: var(--text-secondary);
        }
        .form-control {
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 14px;
          background-color: var(--background-color);
          color: var(--text-color);
        }
        .despesas-empty {
          padding: 30px 0;
          text-align: center;
          color: var(--text-secondary);
        }
        .despesas-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .despesa-card {
          padding: 15px;
          border-radius: 8px;
          background-color: var(--background-color);
          text-decoration: none;
          color: var(--text-color);
          transition: all 0.2s;
          border: 1px solid var(--border-color);
        }
        .despesa-card:hover {
          background-color: var(--foreground-color);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .despesa-conteudo {
          width: 100%;
        }
        .despesa-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .despesa-titulo-com-icone {
          display: flex;
          align-items: center;
        }
        .categoria-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          color: white;
          font-size: 0.9rem;
          margin-right: 12px;
          flex-shrink: 0;
        }
        .despesa-titulo {
          margin: 0;
          font-size: 1.1rem;
          color: var(--text-color);
        }
        .despesa-detalhes {
          font-size: 0.9rem;
          color: var(--text-secondary);
          padding-left: 44px;
        }
        .despesa-valor {
          font-weight: 600;
          color: var(--text-color);
          font-size: 1.1rem;
        }
        .categoria-transporte {
          background-color: #36a2eb;
        }
        .categoria-hospedagem {
          background-color: #4bc0c0;
        }
        .categoria-alimentacao {
          background-color: #ffce56;
        }
        .categoria-outros {
          background-color: #9966ff;
        }
        .error-message {
          background-color: rgba(239, 68, 68, 0.1);
          color: var(--error-color);
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 20px;
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
          background-color: var(--primary-hover);
        }
        .btn-outline {
          background-color: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-color);
        }
        .btn-outline:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }

        /* Estilos para o modal */
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
        }

        .modal-content {
          background-color: var(--foreground-color);
          border-radius: 8px;
          box-shadow: var(--shadow-lg);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          z-index: 1001;
          padding: 0;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          border-bottom: 1px solid var(--border-color);
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
        }

        .modal-content form {
          padding: 20px;
        }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.5rem;
          color: var(--text-secondary);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-row {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-row .form-group {
          flex: 1;
          margin-bottom: 0;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 1rem;
          background-color: var(--background-color);
          color: var(--text-color);
        }

        .form-select {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 1rem;
          background-color: var(--background-color);
          color: var(--text-color);
          appearance: auto;
        }

        .form-select option {
          background-color: var(--background-color);
          color: var(--text-color);
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .form-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 30px;
        }

        .btn-secondary {
          background-color: transparent;
          color: var(--text-color);
          border: 1px solid var(--border-color);
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
