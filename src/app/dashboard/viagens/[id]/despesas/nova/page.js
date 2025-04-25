"use client";

// Manter as importações existentes e adicionar useParams
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "../../../../supabaseClient";
import { getCurrentUser } from "../../../../auth";

export default function NovaDespesaPage() {
  const [viagem, setViagem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  // Form state para nova despesa
  const [formData, setFormData] = useState({
    descricao: "",
    valor: "",
    data: new Date().toISOString().split("T")[0],
    categoria: "transporte", // Valor padrão
    comprovante: null,
    observacoes: "",
    comprovanteName: "",
  });

  // Preview de comprovante
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    const userData = getCurrentUser();
    if (!userData) {
      router.push("/login");
      return;
    }

    setUser(userData);
    fetchViagem();
  }, [router, id]);

  const fetchViagem = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient("viagem");

      const { data, error } = await supabase
        .from("tbviagem")
        .select(
          `
          *,
          tbusuarios (nome, email)
        `
        )
        .eq("viagem_id", id)
        .single();

      if (error) throw error;

      // Verificar se a viagem pertence ao usuário ou se ele é um gerente
      if (data.usuario_id !== user.usuario_id && user.tipo_usuario !== 2) {
        setError(
          "Você não tem permissão para adicionar despesas a esta viagem."
        );
        return;
      }

      // Verificar se a viagem está em status que permite adição de despesas
      if (data.status !== "aprovada" && data.status !== "pendente") {
        setError(
          `Esta viagem está ${data.status}, não é possível adicionar despesas.`
        );
        return;
      }

      setViagem(data);
    } catch (err) {
      console.error("Erro ao carregar detalhes da viagem:", err);
      setError("Não foi possível carregar os detalhes da viagem.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    if (type === "file") {
      const file = e.target.files[0];
      if (!file) return;

      // Validar tipo de arquivo (apenas imagens e PDFs)
      if (!file.type.includes("image/") && file.type !== "application/pdf") {
        alert("Apenas imagens e PDFs são permitidos como comprovantes.");
        return;
      }

      // Validar tamanho do arquivo (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("O arquivo é muito grande. O tamanho máximo é 5MB.");
        return;
      }

      setFormData({
        ...formData,
        comprovante: file,
        comprovanteName: file.name,
      });

      // Criar preview para imagens
      if (file.type.includes("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    } else if (name === "valor") {
      // Remover caracteres não numéricos para garantir que o valor é válido
      const numericValue = value.replace(/[^\d.]/g, "");
      setFormData({
        ...formData,
        [name]: numericValue,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      // Usar getSupabaseClient em vez de supabase diretamente
      const supabase = getSupabaseClient("financeiro");

      // Criar registro de despesa
      const { data, error } = await supabase
        .from("tbdespesas")
        .insert({
          viagem_id: id,
          usuario_id: user.usuario_id,
          descricao: formData.descricao,
          valor: Number(formData.valor),
          data: formData.data,
          categoria: formData.categoria,
          observacoes: formData.observacoes || null,
          status: "pendente",
          data_criacao: new Date().toISOString(),
        })
        .select();

      if (error) throw error;

      // Upload de comprovante
      if (formData.comprovante) {
        const fileName = `despesa-${data[0].despesa_id}-${Date.now()}`;
        const { error: uploadError } = await supabase.storage
          .from("comprovantes")
          .upload(fileName, formData.comprovante);

        if (uploadError) throw uploadError;

        // Atualizar despesa com referência ao comprovante
        await supabase
          .from("tbdespesas")
          .update({ comprovante_url: fileName })
          .eq("despesa_id", data[0].despesa_id);
      }

      alert("Despesa adicionada com sucesso!");
      router.push(`/dashboard/viagens/${id}`);
    } catch (err) {
      console.error("Erro ao adicionar despesa:", err);
      alert(
        "Não foi possível adicionar a despesa. Por favor, tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "R$ 0,00";

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="container">
        <p>Carregando dados da viagem...</p>
      </div>
    );
  }

  if (error || !viagem) {
    return (
      <div className="container">
        <p className="error-message">{error || "Viagem não encontrada"}</p>
        <Link href={`/dashboard/viagens/${id}`} className="btn btn-primary">
          Voltar para Viagem
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header-container">
        <h1>Nova Despesa</h1>
        <div className="actions">
          <Link href={`/dashboard/viagens/${id}`} className="btn btn-outline">
            Cancelar
          </Link>
        </div>
      </div>

      <div className="breadcrumb">
        <Link href="/dashboard/viagens">Viagens</Link>
        {" > "}
        <Link href={`/dashboard/viagens/${id}`}>{viagem.destino}</Link>
        {" > "}
        <span>Nova Despesa</span>
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
            <span className="info-label">Motivo:</span>
            <span className="info-value">{viagem.motivo}</span>
          </div>
        </div>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-header">
            <h3>Detalhes da Despesa</h3>
          </div>

          <div className="form-group">
            <label htmlFor="descricao">Descrição*</label>
            <input
              type="text"
              id="descricao"
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              className="form-control"
              required
              maxLength={100}
              placeholder="Ex: Hotel Atlântico, Passagem Aérea, etc."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="valor">Valor (R$)*</label>
              <input
                type="text"
                id="valor"
                name="valor"
                value={formData.valor}
                onChange={handleChange}
                className="form-control"
                required
                placeholder="0.00"
              />
              {formData.valor && (
                <small className="form-text">
                  {formatCurrency(formData.valor)}
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="data">Data*</label>
              <input
                type="date"
                id="data"
                name="data"
                value={formData.data}
                onChange={handleChange}
                className="form-control"
                required
                min={viagem.data_inicio}
                max={viagem.data_fim}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="categoria">Categoria*</label>
            <select
              id="categoria"
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              className="form-control"
              required>
              <option value="transporte">Transporte</option>
              <option value="hospedagem">Hospedagem</option>
              <option value="alimentacao">Alimentação</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="comprovante">Comprovante</label>
            <div className="file-input-container">
              <input
                type="file"
                id="comprovante"
                name="comprovante"
                onChange={handleChange}
                className="file-input"
                accept="image/*,application/pdf"
              />
              <button
                type="button"
                className="file-button"
                onClick={() => document.getElementById("comprovante").click()}>
                Escolher Arquivo
              </button>
              <span className="file-name">
                {formData.comprovanteName || "Nenhum arquivo selecionado"}
              </span>
            </div>
            <small className="form-text">
              Formatos aceitos: JPG, PNG, GIF, PDF. Tamanho máximo: 5MB.
            </small>

            {previewUrl && (
              <div className="image-preview">
                <img src={previewUrl} alt="Preview do comprovante" />
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="observacoes">Observações (opcional)</label>
            <textarea
              id="observacoes"
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              className="form-control"
              rows={4}
              maxLength={500}
              placeholder="Informações adicionais sobre a despesa..."
            />
          </div>

          <div className="form-buttons">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => router.push(`/dashboard/viagens/${id}`)}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar Despesa"}
            </button>
          </div>
        </form>
      </div>

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
        .info-label {
          font-weight: 500;
          width: 80px;
          margin-right: 10px;
        }
        .form-container {
          background-color: white;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .form-header {
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        .form-header h3 {
          margin: 0;
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
        .form-control {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        .form-control:focus {
          outline: none;
          border-color: #80bdff;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        .file-input-container {
          display: flex;
          align-items: center;
        }
        .file-input {
          position: absolute;
          left: -9999px;
        }
        .file-button {
          padding: 10px 16px;
          background-color: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 4px 0 0 4px;
          cursor: pointer;
        }
        .file-name {
          flex-grow: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-left: none;
          border-radius: 0 4px 4px 0;
          background-color: white;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .image-preview {
          margin-top: 15px;
          max-width: 300px;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        }
        .image-preview img {
          width: 100%;
          height: auto;
          display: block;
        }
        .form-text {
          color: #6c757d;
          font-size: 0.85rem;
          margin-top: 5px;
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
          margin-top: 30px;
        }
        .btn {
          padding: 10px 16px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .btn-primary {
          background-color: #007bff;
          color: white;
          border: none;
        }
        .btn-primary:hover:not(:disabled) {
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
        .error-message {
          background-color: #f8d7da;
          color: #721c24;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
}
