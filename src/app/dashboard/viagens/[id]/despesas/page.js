"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "../../../../supabaseClient";
import { getCurrentUser } from "../../../../auth";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

// Registrar componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

export default function DespesasPage({ params }) {
  const [viagem, setViagem] = useState(null);
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [filtro, setFiltro] = useState("todas");
  const [ordenacao, setOrdenacao] = useState("data-desc");
  const router = useRouter();
  const { id } = params;

  // Estados para relatórios
  const [totaisPorCategoria, setTotaisPorCategoria] = useState({});
  const [totaisPorStatus, setTotaisPorStatus] = useState({});

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
      const supabase = getSupabaseClient();

      // Buscar detalhes da viagem
      const { data: viagemData, error: viagemError } = await supabase
        .from("tbviagens")
        .select(
          `
          *,
          tbusuarios (nome, email)
        `
        )
        .eq("viagem_id", id)
        .single();

      if (viagemError) throw viagemError;

      setViagem(viagemData);

      // Verificar se o usuário tem acesso à viagem (se for o dono ou gerente)
      if (
        viagemData.usuario_id !== user.usuario_id &&
        user.tipo_usuario !== 2
      ) {
        setError(
          "Você não tem permissão para acessar os detalhes desta viagem."
        );
        return;
      }

      // Buscar despesas da viagem
      const { data: despesasData, error: despesasError } = await supabase
        .from("tbdespesas")
        .select(
          `
          *,
          tbusuarios!usuario_id (nome),
          tbusuarios!revisor_id (nome)
        `
        )
        .eq("viagem_id", id)
        .order("data", { ascending: false });

      if (despesasError) throw despesasError;

      setDespesas(despesasData);

      // Calcular totais por categoria e status para relatórios
      calcularTotais(despesasData);
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

    const status = {
      pendente: 0,
      aprovada: 0,
      rejeitada: 0,
      reembolsado: 0,
    };

    // Calcular totais
    despesasData.forEach((despesa) => {
      if (categorias.hasOwnProperty(despesa.categoria)) {
        categorias[despesa.categoria] += parseFloat(despesa.valor);
      }

      if (status.hasOwnProperty(despesa.status)) {
        status[despesa.status] += parseFloat(despesa.valor);
      }
    });

    setTotaisPorCategoria(categorias);
    setTotaisPorStatus(status);
  };

  const handleFiltroChange = (e) => {
    setFiltro(e.target.value);
  };

  const handleOrdenacaoChange = (e) => {
    setOrdenacao(e.target.value);
  };

  const despesasFiltradas = () => {
    let resultado = [...despesas];

    // Aplicar filtro
    if (filtro !== "todas") {
      resultado = resultado.filter((despesa) => despesa.status === filtro);
    }

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

  const getDespesasAprovadas = () => {
    return despesas
      .filter(
        (despesa) =>
          despesa.status === "aprovada" || despesa.status === "reembolsado"
      )
      .reduce((total, despesa) => total + parseFloat(despesa.valor), 0);
  };

  const getDespesasReembolsadas = () => {
    return despesas
      .filter((despesa) => despesa.status === "reembolsado")
      .reduce((total, despesa) => total + parseFloat(despesa.valor), 0);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getBadgeClass = (status) => {
    switch (status) {
      case "pendente":
        return "badge-warning";
      case "aprovada":
        return "badge-success";
      case "rejeitada":
        return "badge-danger";
      case "concluida":
        return "badge-info";
      case "reembolsado":
        return "badge-primary";
      default:
        return "badge-secondary";
    }
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

  // Dados para o gráfico de status
  const statusChartData = {
    labels: ["Pendente", "Aprovada", "Rejeitada", "Reembolsada"],
    datasets: [
      {
        data: [
          totaisPorStatus.pendente || 0,
          totaisPorStatus.aprovada || 0,
          totaisPorStatus.rejeitada || 0,
          totaisPorStatus.reembolsado || 0,
        ],
        backgroundColor: ["#FFCE56", "#4BC0C0", "#FF6384", "#36A2EB"],
        borderColor: ["#FFCE56", "#4BC0C0", "#FF6384", "#36A2EB"],
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
          <Link
            href={`/dashboard/viagens/${id}/despesas/nova`}
            className="btn btn-primary">
            Nova Despesa
          </Link>
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
              {new Date(viagem.data_inicio).toLocaleDateString("pt-BR")} a{" "}
              {new Date(viagem.data_fim).toLocaleDateString("pt-BR")}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Status:</span>
            <span className="info-value">
              <span className={`status-badge ${getBadgeClass(viagem.status)}`}>
                {viagem.status.charAt(0).toUpperCase() + viagem.status.slice(1)}
              </span>
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

          <div className="card">
            <div className="card-value">
              {formatCurrency(getDespesasAprovadas())}
            </div>
            <div className="card-label">Despesas Aprovadas</div>
          </div>

          <div className="card">
            <div className="card-value">
              {formatCurrency(getDespesasReembolsadas())}
            </div>
            <div className="card-label">Reembolsos Realizados</div>
          </div>
        </div>

        <div className="charts-container">
          <div className="chart-card">
            <h4>Despesas por Categoria</h4>
            <div className="chart-wrapper">
              <Doughnut data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="chart-card">
            <h4>Despesas por Status</h4>
            <div className="chart-wrapper">
              <Doughnut data={statusChartData} options={chartOptions} />
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
              <label htmlFor="filtro">Status:</label>
              <select
                id="filtro"
                value={filtro}
                onChange={handleFiltroChange}
                className="form-control">
                <option value="todas">Todas</option>
                <option value="pendente">Pendentes</option>
                <option value="aprovada">Aprovadas</option>
                <option value="rejeitada">Rejeitadas</option>
                <option value="reembolsado">Reembolsadas</option>
              </select>
            </div>

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
                <div className="despesa-categoria">
                  <span
                    className={`categoria-icon categoria-${despesa.categoria}`}>
                    <i
                      className={`fas ${getCategoriaIconClass(
                        despesa.categoria
                      )}`}></i>
                  </span>
                </div>

                <div className="despesa-info">
                  <h4 className="despesa-titulo">{despesa.descricao}</h4>
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

                <div className="despesa-status">
                  <span
                    className={`status-badge ${getBadgeClass(despesa.status)}`}>
                    {despesa.status.charAt(0).toUpperCase() +
                      despesa.status.slice(1)}
                  </span>
                  <div className="despesa-valor">
                    {formatCurrency(despesa.valor)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
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
          color: #666;
        }
        .breadcrumb a {
          color: #007bff;
          text-decoration: none;
        }
        .breadcrumb a:hover {
          text-decoration: underline;
        }
        .viagem-info-container {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }
        .viagem-info-header {
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
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
        }
        .relatorio-container {
          background-color: white;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }
        .relatorio-header {
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
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
          background-color: #f8f9fa;
          border-radius: 8px;
          text-align: center;
        }
        .card-value {
          font-size: 1.6rem;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .card-label {
          color: #6c757d;
          font-size: 0.9rem;
        }
        .charts-container {
          display: flex;
          gap: 20px;
        }
        .chart-card {
          flex: 1;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        .chart-card h4 {
          margin: 0 0 15px 0;
          text-align: center;
          font-weight: 600;
        }
        .chart-wrapper {
          max-width: 300px;
          margin: 0 auto;
        }
        .despesas-container {
          background-color: white;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .despesas-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }
        .despesas-header h3 {
          margin: 0;
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
        }
        .form-control {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .despesas-empty {
          padding: 30px 0;
          text-align: center;
          color: #6c757d;
        }
        .despesas-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .despesa-card {
          display: flex;
          align-items: center;
          padding: 15px;
          border-radius: 8px;
          background-color: #f8f9fa;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s;
        }
        .despesa-card:hover {
          background-color: #e9ecef;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .despesa-categoria {
          margin-right: 15px;
        }
        .categoria-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          color: white;
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
        .despesa-info {
          flex: 1;
        }
        .despesa-titulo {
          margin: 0 0 5px 0;
          font-size: 1.1rem;
        }
        .despesa-detalhes {
          font-size: 0.9rem;
          color: #6c757d;
        }
        .despesa-status {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .despesa-valor {
          margin-top: 5px;
          font-weight: 600;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .badge-warning {
          background-color: #fff3cd;
          color: #856404;
        }
        .badge-success {
          background-color: #d4edda;
          color: #155724;
        }
        .badge-danger {
          background-color: #f8d7da;
          color: #721c24;
        }
        .badge-info {
          background-color: #d1ecf1;
          color: #0c5460;
        }
        .badge-primary {
          background-color: #cce5ff;
          color: #004085;
        }
        .badge-secondary {
          background-color: #e2e3e5;
          color: #383d41;
        }
        .error-message {
          background-color: #f8d7da;
          color: #721c24;
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
          background-color: #007bff;
          color: white;
          border: none;
        }
        .btn-primary:hover {
          background-color: #0069d9;
        }
        .btn-outline {
          background-color: transparent;
          border: 1px solid #6c757d;
          color: #6c757d;
        }
        .btn-outline:hover {
          background-color: #f8f9fa;
        }
      `}</style>
    </div>
  );
}
