import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-luster">
          <p className="text-muted text-sm">Ładowanie…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
