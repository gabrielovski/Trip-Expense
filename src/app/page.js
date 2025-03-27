"use client";

import { useEffect, useState } from "react";
import { getUsers } from "./api/getUsers";

export default function Home() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const response = await getUsers();
      if (response.success) {
        setUsers(response.data);
      } else {
        setError(response.message);
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);

  if (loading) {
    return <div>Carregando usuários...</div>;
  }

  if (error) {
    return <div>Erro ao carregar usuários: {error}</div>;
  }

  return (
    <div>
      <h1 className="welcome-text">
        Hello World! Bem-vindo(a) ao Trip-Expense
      </h1>
      <h1>Lista de Usuários no banco de dados</h1>
      <ul>
        {users.map((user, index) => (
          <li key={`${user.usuario_id}-${index}`}>
            {user.nome || "Nome não disponível"}
          </li>
        ))}
      </ul>
      <footer>
        ⚠️ Lista inserida somente para mostrar a integração com o Banco de
        Dados! (Temporária) ⚠️
      </footer>
    </div>
  );
}
