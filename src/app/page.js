"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { useEffect, useState } from "react";
import { getUsers } from "./api/getUsers";

export default function Home() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function fetchUsers() {
      const response = await getUsers();
      if (response.success) {
        setUsers(response.data);
        console.log("Users state updated:", response.data); // Log para verificar o estado atualizado
      } else {
        console.error(response.message);
      }
    }
    fetchUsers();
  }, []);

  return (
    <div>
      <h1>Lista de Usuários no banco de dados</h1>
      <ul>
        {users.map((user, index) => (
          <li key={`${user.usuario_id}-${index}`}>
            {user.nome || "Nome não disponível"}
          </li>
        ))}
      </ul>
    </div>
  );
}
