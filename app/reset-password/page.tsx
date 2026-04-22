"use client";
import {ArrowLeft,ArrowRight,CheckCircle,Eye,EyeOff,Leaf,LockKeyhole,ShieldCheck,XCircle} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

type PageState = "form" | "success" | "invalid";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [state, setState] = useState<PageState>(token ? "form" : "invalid");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400) {
          setState("invalid");
          return;
        }
        setError(data.error ?? "Erro ao redefinir senha.");
        return;
      }

      setState("success");
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-transparent flex flex-col items-center w-full max-w-md px-12">
      {state === "form" && (
        <>
          <div className="flex flex-col justify-center items-center mb-8">
            <h1 className="text-3xl font-inter font-bold tracking-tight">
              Nova senha
            </h1>
            <p className="text-sm font-sans font-light text-secondary-text leading-relaxed text-center mt-2">
              Escolha uma senha forte para proteger sua conta.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-6">
            {error && (
              <div className="p-3 text-sm text-alert bg-alert/10 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground">
                Nova senha
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-4 pointer-events-none">
                  <LockKeyhole className="h-5 w-5 text-secondary-text" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="bg-card-background w-full h-12 pl-12 pr-12 rounded-[0.475rem] border-2 border-border"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 hover:cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-secondary-text hover:text-foreground transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-secondary-text hover:text-foreground transition-colors" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Confirmar nova senha
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-4 pointer-events-none">
                  <LockKeyhole className="h-5 w-5 text-secondary-text" />
                </div>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="bg-card-background w-full h-12 pl-12 pr-12 rounded-[0.475rem] border-2 border-border"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 hover:cursor-pointer"
                >
                  {showConfirm ? (
                    <EyeOff className="h-5 w-5 text-secondary-text hover:text-foreground transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-secondary-text hover:text-foreground transition-colors" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-primary flex flex-row justify-center items-center gap-2 w-full h-12 font-bold rounded-[0.475rem] hover:cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? "Salvando..." : "Redefinir senha"}
              {!loading && <ArrowRight />}
            </button>
          </form>

          <Link
            href="/login"
            className="flex items-center gap-2 mt-8 text-sm text-secondary-text hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar ao login
          </Link>
        </>
      )}

      {state === "success" && (
        <div className="flex flex-col justify-center items-center text-center">
          <div className="flex justify-center items-center w-16 h-16 rounded-full bg-primary-dim border-2 border-primary-border mb-6">
            <CheckCircle className="text-primary" size={32} />
          </div>
          <h1 className="text-3xl font-inter font-bold tracking-tight">
            Senha redefinida
          </h1>
          <p className="text-sm font-sans font-light text-secondary-text leading-relaxed mt-2">
            Sua senha foi alterada com sucesso. Redirecionando para o
            login...
          </p>
          <Link
            href="/login"
            className="flex items-center gap-2 mt-8 text-sm text-secondary-text hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Ir para o login agora
          </Link>
        </div>
      )}

      {state === "invalid" && (
        <div className="flex flex-col justify-center items-center text-center">
          <div className="flex justify-center items-center w-16 h-16 rounded-full bg-alert/10 border-2 border-alert/30 mb-6">
            <XCircle className="text-alert" size={32} />
          </div>
          <h1 className="text-3xl font-inter font-bold tracking-tight">
            Link inválido
          </h1>
          <p className="text-sm font-sans font-light text-secondary-text leading-relaxed mt-2">
            Este link é inválido ou já expirou. Links de redefinição de senha
            são válidos por apenas 15 minutos.
          </p>
          <Link
            href="/forgot-password"
            className="flex items-center gap-2 mt-8 text-sm text-primary hover:opacity-80 transition-opacity"
          >
            Solicitar novo link
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 mt-4 text-sm text-secondary-text hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar ao login
          </Link>
        </div>
      )}

      <div className="mt-10 flex flex-col items-center gap-4">
        <div className="flex justify-center items-center gap-2 bg-card-background border border-border px-8 md:px-22 py-3 rounded-full">
          <ShieldCheck size={14} className="text-orange-500" />
          <span className="text-[10px] font-black uppercase text-card-foreground whitespace-nowrap">
            Acesso Restrito
          </span>
        </div>
        <p className="text-sm text-secondary-text">
          Apenas usuários autorizados.
        </p>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <main className="flex flex-row h-screen">
      <div className="bg-linear-to-tl from-[#192939] hidden lg:flex justify-center items-center w-2/3">
        <div className="bg-transparent flex flex-col items-center w-1/3 gap-5">
          <div className="flex justify-center items-center shadow-xs w-24 h-24 rounded-full bg-primary-dim border-2 border-primary-border">
            <Leaf className="text-primary" size={65} />
          </div>
          <h1 className="text-6xl font-sans font-bold tracking-tight">
            Inception
          </h1>
          <p className="text-lg font-sans font-light text-secondary-text leading-relaxed text-center">
            Monitoramento metereológico de alta precisão e gestão de dados IoT
            em tempo real
          </p>
        </div>
      </div>

      <div className="bg-background flex justify-center items-center w-full lg:w-1/3">        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}