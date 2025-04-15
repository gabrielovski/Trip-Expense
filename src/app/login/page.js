import { Suspense } from "react";
import LoginForm from "./loginForm";

export default function LoginPage() {
  return (
    <div className="auth-container">
      <Suspense fallback={<div>Carregando formulário...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
