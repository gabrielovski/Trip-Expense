"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "../../../../../supabaseClient";
import { getCurrentUser } from "../../../../../auth";

export default function DespesaDetalhesPage() {
  // Modificar para usar useParams
  const params = useParams();
  const id = params.id;
  const despesaId = params.despesaId;

  const [despesa, setDespesa] = useState(null);
  const [viagem, setViagem] = useState(null);
  const [comprovante, setComprovante] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [valorReembolso, setValorReembolso] = useState("");
  const [showReembolsoModal, setShowReembolsoModal] = useState(false);
  const router = useRouter();

  // Histórico de reembolsos
  const [historicoReembolsos, setHistoricoReembolsos] = useState([]);

  useEffect(() => {
    const userData = getCurrentUser();
    if (!userData) {
      router.push("/login");
      return;
    }

    setUser(userData);
    fetchDespesa();
  }, [router, id, despesaId]);

  const fetchDespesa = async () => {
    try {
      setLoading(true);
      // Substituir os clientes específicos pelo genérico
      const financeiroClient = getSupabaseClient("financeiro");
      const viagemClient = getSupabaseClient("viagem");

      // Buscar detalhes da despesa
      const { data: despesaData, error: despesaError } = await financeiroClient
        .from("tbcontaspagar")
        .select(
          `
          *,
          tipo_titulo:tipo_titulo_id(descricao)
        `
        )
        .eq("conta_pagar_id", despesaId)
        .single();

      if (despesaError) throw despesaError;

      // Adicionar informações sobre a categoria para a interface
      let categoria;
      switch (despesaData.tipo_titulo_id) {
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

      despesaData.categoria = categoria;
      despesaData.status = despesaData.status_aprovacao || "pendente";
      despesaData.data = new Date(despesaData.data_vencimento)
        .toISOString()
        .split("T")[0];

      setDespesa(despesaData);
      setValorReembolso(despesaData.valor.toString());

      // Se houver comprovante, buscar URL pública
      if (despesaData.comprovante_url) {
        const { data: fileData } = await financeiroClient.storage
          .from("comprovantes")
          .getPublicUrl(despesaData.comprovante_url);

        if (fileData) {
          setComprovante(fileData.publicUrl);
        }
      }

      // Buscar detalhes da viagem
      const { data: viagemData, error: viagemError } = await viagemClient
        .from("tbviagem")
        .select(
          `
          *,
          destino:viagem_tipo_id(descricao)
        `
        )
        .eq("viagem_id", id)
        .single();

      if (viagemError) throw viagemError;

      setViagem(viagemData);

      // Buscar usuário da despesa
      if (despesaData.funcionario_id) {
        const { data: userData, error: userError } = await segurancaClient
          .from("tbusuarios")
          .select("nome, email")
          .eq("usuario_id", despesaData.funcionario_id)
          .single();

        if (!userError && userData) {
          despesaData.usuario = userData;
        }
      }

      // Buscar usuário revisor (se existir)
      if (despesaData.atualizado_por) {
        const { data: revisorData, error: revisorError } = await segurancaClient
          .from("tbusuarios")
          .select("nome, email")
          .eq("usuario_id", despesaData.atualizado_por)
          .single();

        if (!revisorError && revisorData) {
          despesaData.revisor = revisorData;
        }
      }

      // Buscar histórico de reembolsos (se existirem)
      const { data: reembolsosData, error: reembolsosError } =
        await financeiroClient
          .from("tbtitulos_pagos")
          .select(
            `
          *,
          aprovador:usuario_id (nome)
        `
          )
          .eq("conta_pagar_id", despesaId)
          .order("data_pagamento", { ascending: false });

      if (!reembolsosError && reembolsosData) {
        setHistoricoReembolsos(reembolsosData);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Não foi possível carregar os detalhes da despesa.");
    } finally {
      setLoading(false);
    }
  };

  const handleAprovar = async () => {
    try {
      if (!user || user.tipo_usuario !== 2) {
        alert("Você não tem permissão para realizar esta ação.");
        return;
      }

      const financeiroClient = getFinanceiroClient();

      const { error } = await financeiroClient
        .from("tbcontaspagar")
        .update({
          status_aprovacao: "aprovada",
          atualizado_por: user.usuario_id,
          atualizado_em: new Date().toISOString(),
        })
        .eq("conta_pagar_id", despesaId);

      if (error) throw error;

      // Atualizar despesa localmente
      setDespesa({
        ...despesa,
        status: "aprovada",
        status_aprovacao: "aprovada",
        atualizado_por: user.usuario_id,
        atualizado_em: new Date().toISOString(),
        revisor: {
          nome: user.nome,
        },
      });

      alert("Despesa aprovada com sucesso!");
    } catch (err) {
      console.error("Erro ao aprovar despesa:", err);
      alert("Não foi possível aprovar a despesa. Por favor, tente novamente.");
    }
  };

  const handleRejeitar = async () => {
    try {
      if (!motivoRejeicao) {
        alert("Por favor, informe o motivo da rejeição.");
        return;
      }

      if (!user || user.tipo_usuario !== 2) {
        alert("Você não tem permissão para realizar esta ação.");
        return;
      }

      const financeiroClient = getFinanceiroClient();

      const { error } = await financeiroClient
        .from("tbcontaspagar")
        .update({
          status_aprovacao: "rejeitada",
          atualizado_por: user.usuario_id,
          atualizado_em: new Date().toISOString(),
          motivo_rejeicao: motivoRejeicao,
        })
        .eq("conta_pagar_id", despesaId);

      if (error) throw error;

      // Atualizar despesa localmente
      setDespesa({
        ...despesa,
        status: "rejeitada",
        status_aprovacao: "rejeitada",
        atualizado_por: user.usuario_id,
        atualizado_em: new Date().toISOString(),
        motivo_rejeicao: motivoRejeicao,
        revisor: {
          nome: user.nome,
        },
      });

      setShowModal(false);
      setMotivoRejeicao("");

      alert("Despesa rejeitada com sucesso!");
    } catch (err) {
      console.error("Erro ao rejeitar despesa:", err);
      alert("Não foi possível rejeitar a despesa. Por favor, tente novamente.");
    }
  };

  const handleReembolsar = async () => {
    try {
      if (!valorReembolso || parseFloat(valorReembolso) <= 0) {
        alert("Por favor, informe um valor válido para o reembolso.");
        return;
      }

      if (!user || user.tipo_usuario !== 2) {
        alert("Você não tem permissão para realizar esta ação.");
        return;
      }

      const financeiroClient = getFinanceiroClient();

      // Criar registro de reembolso
      const { data: reembolsoData, error: reembolsoError } =
        await financeiroClient
          .from("tbtitulos_pagos")
          .insert({
            conta_pagar_id: despesaId,
            usuario_id: user.usuario_id,
            valor_pago: parseFloat(valorReembolso),
            data_pagamento: new Date().toISOString(),
          })
          .select();

      if (reembolsoError) throw reembolsoError;

      // Atualizar status da despesa
      const { error: despesaError } = await financeiroClient
        .from("tbcontaspagar")
        .update({
          status_aprovacao: "reembolsado",
          data_pagamento: new Date().toISOString(),
        })
        .eq("conta_pagar_id", despesaId);

      if (despesaError) throw despesaError;

      // Atualizar despesa localmente
      setDespesa({
        ...despesa,
        status: "reembolsado",
        status_aprovacao: "reembolsado",
        data_pagamento: new Date().toISOString(),
      });

      setShowReembolsoModal(false);

      // Recarregar dados para atualizar o histórico
      fetchDespesa();

      alert("Reembolso realizado com sucesso!");
    } catch (err) {
      console.error("Erro ao processar reembolso:", err);
      alert(
        "Não foi possível processar o reembolso. Por favor, tente novamente."
      );
    }
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

  // Função para obter nome da categoria com base no ID de tipo de título
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
        return "Desconhecida";
    }
  };

  // Obter destino da viagem
  const getDestino = () => {
    if (!viagem) return "";
    return typeof viagem.destino === "string"
      ? viagem.destino
      : viagem.destino?.descricao || "Sem destino";
  };

  if (loading) {
    return (
      <div className="container">
        <p>Carregando dados da despesa...</p>
      </div>
    );
  }

  if (error || !despesa || !viagem) {
    return (
      <div className="container">
        <p className="error-message">{error || "Despesa não encontrada"}</p>
        <Link href={`/dashboard/viagens/${id}`} className="btn btn-primary">
          Voltar para Viagem
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header-container">
        <h1>Detalhes da Despesa</h1>
        <div className="actions">
          <Link href={`/dashboard/viagens/${id}`} className="btn btn-outline">
            Voltar para Viagem
          </Link>

          {/* Mostrar botões de aprovação apenas para gerentes e despesas pendentes */}
          {user?.tipo_usuario === 2 && despesa.status === "pendente" && (
            <>
              <button
                className="btn btn-danger"
                onClick={() => setShowModal(true)}>
                Rejeitar
              </button>
              <button className="btn btn-success" onClick={handleAprovar}>
                Aprovar
              </button>
            </>
          )}

          {/* Botão para reembolsar (apenas para gerentes e despesas aprovadas) */}
          {user?.tipo_usuario === 2 && despesa.status === "aprovada" && (
            <button
              className="btn btn-primary"
              onClick={() => setShowReembolsoModal(true)}>
              Processar Reembolso
            </button>
          )}
        </div>
      </div>

      <div className="breadcrumb">
        <Link href="/dashboard/viagens">Viagens</Link>
        {" > "}
        <Link href={`/dashboard/viagens/${id}`}>{getDestino()}</Link>
        {" > "}
        <span>Despesa: {despesa.descricao}</span>
      </div>

      <div className="despesa-container">
        <div className="despesa-header">
          <div className="despesa-titulo">
            <h2>{despesa.descricao}</h2>
            <span className={`status-badge ${getBadgeClass(despesa.status)}`}>
              {despesa.status.charAt(0).toUpperCase() + despesa.status.slice(1)}
            </span>
          </div>
          <div className="despesa-valor">
            <span className="valor-label">Valor:</span>
            <span className="valor">{formatCurrency(despesa.valor)}</span>
          </div>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <span className="label">Categoria:</span>
            <span className="value">
              <span
                className={`categoria-badge categoria-${despesa.categoria}`}>
                {getCategoriaLabel(despesa.categoria)}
              </span>
            </span>
          </div>

          <div className="info-item">
            <span className="label">Data:</span>
            <span className="value">
              {new Date(despesa.data).toLocaleDateString("pt-BR")}
            </span>
          </div>

          <div className="info-item">
            <span className="label">Solicitante:</span>
            <span className="value">
              {despesa.usuario?.nome || "Não informado"}
            </span>
          </div>

          <div className="info-item">
            <span className="label">Data de Criação:</span>
            <span className="value">
              {new Date(
                despesa.atualizado_em || despesa.data
              ).toLocaleDateString("pt-BR")}
            </span>
          </div>

          {(despesa.status === "aprovada" ||
            despesa.status === "rejeitada" ||
            despesa.status === "reembolsado") && (
            <div className="info-item">
              <span className="label">Revisado por:</span>
              <span className="value">
                {despesa.revisor?.nome || "Não informado"}
              </span>
            </div>
          )}

          {(despesa.status === "aprovada" ||
            despesa.status === "rejeitada" ||
            despesa.status === "reembolsado") && (
            <div className="info-item">
              <span className="label">Data de Revisão:</span>
              <span className="value">
                {new Date(despesa.atualizado_em).toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}

          {despesa.status === "reembolsado" && (
            <div className="info-item">
              <span className="label">Data do Reembolso:</span>
              <span className="value">
                {despesa.data_pagamento
                  ? new Date(despesa.data_pagamento).toLocaleDateString("pt-BR")
                  : "Não informado"}
              </span>
            </div>
          )}

          {despesa.status === "rejeitada" && (
            <div className="info-item full-width">
              <span className="label">Motivo da Rejeição:</span>
              <span className="value alert-text">
                {despesa.motivo_rejeicao}
              </span>
            </div>
          )}

          {despesa.observacoes && (
            <div className="info-item full-width">
              <span className="label">Observações:</span>
              <span className="value">{despesa.observacoes}</span>
            </div>
          )}
        </div>

        {/* Mostrar comprovante se existir */}
        {comprovante && (
          <div className="comprovante-container">
            <h3>Comprovante</h3>
            <div className="comprovante-image">
              <a
                href={comprovante}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-small">
                Ver em tamanho completo
              </a>
              <div className="image-wrapper">
                <img src={comprovante} alt="Comprovante da despesa" />
              </div>
            </div>
          </div>
        )}

        {/* Histórico de reembolsos */}
        {historicoReembolsos.length > 0 && (
          <div className="historico-container">
            <h3>Histórico de Reembolsos</h3>
            <table className="reembolsos-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Aprovador</th>
                </tr>
              </thead>
              <tbody>
                {historicoReembolsos.map((reembolso) => (
                  <tr key={reembolso.id}>
                    <td>
                      {new Date(reembolso.data_pagamento).toLocaleDateString(
                        "pt-BR"
                      )}
                    </td>
                    <td className="valor-cell">
                      {formatCurrency(reembolso.valor_pago)}
                    </td>
                    <td>{reembolso.aprovador?.nome || "Não informado"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para rejeição */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Rejeitar Despesa</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="motivoRejeicao">Motivo da Rejeição*</label>
              <textarea
                id="motivoRejeicao"
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                className="form-control"
                rows={4}
                required
              />
            </div>

            <div className="form-buttons">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleRejeitar}>
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para reembolso */}
      {showReembolsoModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Processar Reembolso</h3>
              <button
                className="btn-close"
                onClick={() => setShowReembolsoModal(false)}>
                &times;
              </button>
            </div>

            <div className="reembolso-info">
              <p>
                <strong>Despesa:</strong> {despesa.descricao}
              </p>
              <p>
                <strong>Valor Solicitado:</strong>{" "}
                {formatCurrency(despesa.valor)}
              </p>
              <p>
                <strong>Solicitante:</strong>{" "}
                {despesa.usuario?.nome || "Não informado"}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="valorReembolso">Valor do Reembolso*</label>
              <input
                type="text"
                id="valorReembolso"
                value={valorReembolso}
                onChange={(e) => setValorReembolso(e.target.value)}
                className="form-control"
                required
              />
              <div className="form-text">
                Valor formatado: {formatCurrency(valorReembolso || 0)}
              </div>
            </div>

            <div className="form-buttons">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowReembolsoModal(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleReembolsar}>
                Confirmar Reembolso
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 1000px;
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
        .despesa-container {
          background-color: white;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .despesa-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }
        .despesa-titulo {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .despesa-titulo h2 {
          margin: 0;
        }
        .despesa-valor {
          text-align: right;
        }
        .valor-label {
          display: block;
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 5px;
        }
        .valor {
          font-size: 1.5rem;
          font-weight: 700;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
        }
        .full-width {
          grid-column: 1 / span 2;
        }
        .label {
          font-weight: 500;
          margin-bottom: 5px;
          color: #666;
        }
        .value {
          font-size: 1.1rem;
        }
        .alert-text {
          color: #721c24;
        }
        .comprovante-container {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        .comprovante-image {
          margin-top: 15px;
          text-align: center;
        }
        .image-wrapper {
          margin-top: 10px;
          max-width: 100%;
          overflow: hidden;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .image-wrapper img {
          max-width: 100%;
          height: auto;
          display: block;
        }
        .historico-container {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        .reembolsos-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .reembolsos-table th,
        .reembolsos-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        .reembolsos-table th {
          background-color: #f8f9fa;
          font-weight: 500;
        }
        .valor-cell {
          text-align: right;
          font-weight: 500;
        }
        .categoria-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
        }
        .categoria-transporte {
          background-color: #e3f2fd;
          color: #0d47a1;
        }
        .categoria-hospedagem {
          background-color: #e8f5e9;
          color: #1b5e20;
        }
        .categoria-alimentacao {
          background-color: #fff3e0;
          color: #e65100;
        }
        .categoria-outros {
          background-color: #f3e5f5;
          color: #6a1b9a;
        }
        .status-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.8rem;
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
        .btn-secondary {
          background-color: #6c757d;
          color: white;
          border: none;
        }
        .btn-secondary:hover {
          background-color: #5a6268;
        }
        .btn-outline {
          background-color: transparent;
          border: 1px solid #6c757d;
          color: #6c757d;
        }
        .btn-outline:hover {
          background-color: #f8f9fa;
        }
        .btn-small {
          padding: 6px 12px;
          font-size: 0.8rem;
        }
        .btn-success {
          background-color: #28a745;
          color: white;
          border: none;
        }
        .btn-success:hover {
          background-color: #218838;
        }
        .btn-danger {
          background-color: #dc3545;
          color: white;
          border: none;
        }
        .btn-danger:hover {
          background-color: #c82333;
        }
        .btn-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background-color: white;
          padding: 24px;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .reembolso-info {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 4px;
        }
        .reembolso-info p {
          margin: 8px 0;
        }
        .form-text {
          color: #6c757d;
          font-size: 0.85rem;
          margin-top: 5px;
        }
        .form-control {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .form-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
}
