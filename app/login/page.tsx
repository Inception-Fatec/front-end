"use client";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      redirect: false,
      email: email.toLocaleLowerCase(),
      password,
    });

    if (result?.error) {
      setError("Credenciais inválidas. Tente novamente");
    } else if (result?.ok) {
      router.push("./dashboard");
    }
  };

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

      <div className="bg-background flex justify-center items-center w-full lg:w-1/3">
        <div className="bg-transparent flex flex-col items-center w-full max-w-md px-12">
          <div className="flex flex-col justify-center items-center mb-8 ">
            <h1 className="text-3xl font-inter font-bold tracking-tight">
              Bem-vindo de volta
            </h1>
            <p className="text-sm font-sans font-light text-secondary-text leading-relaxed text-center">
              Faça login para acessar o sistema
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
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-foreground">
                  Senha
                </label>
                {/* Atualizado de <a href="#"> para Link real */}
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:opacity-80 transition-opacity"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-4 pointer-events-none">
                  <LockKeyhole className="h-5 w-5 text-secondary-text" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
            <button
              type="submit"
              className="bg-primary flex flex-row justify-center items-center gap-2 w-full h-12 font-bold rounded-[0.475rem] hover:cursor-pointer"
            >
              Entrar
              <ArrowRight />
            </button>
          </form>
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