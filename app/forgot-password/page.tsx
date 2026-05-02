"use client";
import { ArrowLeft, ArrowRight, Leaf, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type PageState = "form" | "success";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<PageState>("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao processar solicitação.");
        return;
      }

      setState("success");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-row h-screen">
      {/* Painel esquerdo — igual ao login */}
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

      {/* Painel direito */}
      <div className="bg-background flex justify-center items-center w-full lg:w-1/3">
        <div className="bg-transparent flex flex-col items-center w-full max-w-md px-12">
          {state === "form" ? (
            <>
              <div className="flex flex-col justify-center items-center mb-8">
                <h1 className="text-3xl font-inter font-bold tracking-tight">
                  Esqueci minha senha
                </h1>
                <p className="text-sm font-sans font-light text-secondary-text leading-relaxed text-center mt-2">
                  Informe seu email e enviaremos as instruções para redefinir
                  sua senha.
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
                    E-mail
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 pointer-events-none">
                      <Mail className="h-5 w-5 text-secondary-text" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="bg-card-background w-full h-12 pl-12 pr-4 rounded-[0.475rem] border-2 border-border"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary flex flex-row justify-center items-center gap-2 w-full h-12 font-bold rounded-[0.475rem] hover:cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                >
                  {loading ? "Enviando..." : "Enviar instruções"}
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
          ) : (
            <>
              <div className="flex flex-col justify-center items-center mb-8 text-center">
                <div className="flex justify-center items-center w-16 h-16 rounded-full bg-primary-dim border-2 border-primary-border mb-6">
                  <Mail className="text-primary" size={32} />
                </div>
                <h1 className="text-3xl font-inter font-bold tracking-tight">
                  Email enviado
                </h1>
                <p className="text-sm font-sans font-light text-secondary-text leading-relaxed mt-2">
                  Se o email{" "}
                  <strong className="text-foreground">{email}</strong> estiver
                  cadastrado, você receberá as instruções em breve.
                </p>
                <p className="text-sm font-sans font-light text-secondary-text leading-relaxed mt-2">
                  O link expira em{" "}
                  <strong className="text-foreground">15 minutos</strong>.
                  Verifique também a caixa de spam.
                </p>
              </div>

              <Link
                href="/login"
                className="flex items-center gap-2 text-sm text-secondary-text hover:text-foreground transition-colors"
              >
                <ArrowLeft size={16} />
                Voltar ao login
              </Link>
            </>
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
      </div>
    </main>
  );
}
