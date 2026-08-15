import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#000C4A]">
          <p className="text-sm text-luster/80">Ładowanie…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
