"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "./services/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await getCurrentUser();
        if (user) {
          router.push("/dashboard");
        } else {
          router.push("/login");
        }
      } catch (error) {
        router.push("/login");
      }
    }

    checkAuth();
  }, [router]);

  return (
    <div className="page-container">
      <h2>Redirecionando...</h2>
    </div>
  );
}
