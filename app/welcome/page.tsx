"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";

export default function WelcomePage() {
  // ADICIONADO: update para atualizar a sessão e router para navegação
  const { data: session, update } = useSession();
  const router = useRouter();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. Validação de tamanho no lado do cliente
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    // 2. Validação de correspondência
    if (password !== confirmPassword) {
      setError("As senhas não coincidem. Verifique e tente novamente.");
      return;
    }

    setIsLoading(true);

    try {
      // 3. Chamada à nossa nova rota de API
      const response = await fetch("/api/users/first-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Houve um erro ao atualizar a senha.");
      }

      // 4. O PULO DO GATO: Atualiza o token JWT no cliente
      // Isto vai disparar o callback 'jwt' com o trigger === "update" no auth.ts
      await update({ first_access: false });

      // 5. Encaminha o utilizador diretamente para o Dashboard seguro
      router.push("/dashboard");
      router.refresh();
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Erro de conexão com o servidor.");
      }
      setIsLoading(false)
    }
  };

  const firstName = session?.user?.name?.split(" ")[0] || "Usuário";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0e16] p-4 font-sans text-[#e1e2ed]">
      <div 
        className="w-full max-w-md bg-[#161B22] border border-[#30363D] rounded-xl p-8 shadow-2xl transition-all duration-500 ease-out"
        id="main-card"
      >
        {/* Cabeçalho */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-[#1d1f27] p-3 rounded-full border border-[#434655] mb-4">
            <ShieldCheck className="w-8 h-8 text-[#b4c5ff]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
            Bem-vindo(a), {firstName}!
          </h1>
          <p className="text-sm text-[#9da6b9]">
            Para garantir a sua privacidade e segurança, por favor defina uma nova senha para este primeiro acesso.
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nova Senha */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#c1c7d0]">Nova Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-[#9da6b9]" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#434655] rounded-lg py-2.5 pl-10 pr-12 text-[#e1e2ed] placeholder-[#9da6b9] focus:outline-none focus:ring-2 focus:ring-[#2463eb]/50 focus:border-[#2463eb] transition-all"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9da6b9] hover:text-[#e1e2ed] transition-colors"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#c1c7d0]">Confirmar Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-[#9da6b9]" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#434655] rounded-lg py-2.5 pl-10 pr-12 text-[#e1e2ed] placeholder-[#9da6b9] focus:outline-none focus:ring-2 focus:ring-[#2463eb]/50 focus:border-[#2463eb] transition-all"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div className="p-3 bg-[#3a1a1a] border border-[#ffdad6]/20 rounded-lg text-[#ffdad6] text-sm text-center">
              {error}
            </div>
          )}

          {/* Botão de Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-[#2463eb] hover:bg-[#0053da] disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-lg py-3 font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#2463eb]/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Atualizando credenciais...
              </>
            ) : (
              "Salvar Nova Senha"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}