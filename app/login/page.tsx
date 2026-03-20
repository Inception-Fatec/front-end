"use client";

import { ArrowRight, Eye, EyeOff, Leaf, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react"

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const result = await signIn('credentials', {
            redirect: false,
            email,
            password
        });

        if (result?.error) {
            setError('Credenciais inválidas. Tente novamente');
        } else if (result?.ok) {
            router.push('/')
        }
    
    }

    return (
        <main className="flex flex-row h-screen">
            <div className="bg-linear-to-tl from-[#192939] flex justify-center items-center w-2/3"> 
                <div className="bg-transparent flex flex-col items-center w-1/3 gap-5">
                    <div className="flex justify-center items-center shadow-xs w-24 h-24 rounded-full bg-[#10283D] border-2 border-[#112F4A]">
                        <Leaf className="text-[#1F8DFD]" size={65} />
                    </div>
                    <h1 className="text-6xl font-sans font-bold tracking-tight">Inception</h1>
                    <p className="text-lg font-sans font-light text-slate-500 leading-relaxed text-center">
                        Monitoramento metereológico de alta precisão e gestão de dados IoT em tempo real
                    </p>
                </div>
            </div>

            <div className="bg-[#0F1823] flex justify-center items-center w-1/3">
                <div className="bg-transparent flex flex-col items-center w-full max-w-md px-12">
                    <div className="flex flex-col justify-center items-center mb-8 ">
                        <h1 className="text-3xl font-inter font-bold tracking-tight">Bem-vindo de volta</h1>
                        <p className="text-sm font-sans font-light text-slate-500 leading-relaxed text-center">
                            Faça login para acessar o sistema
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className="w-full space-y-6">
                        {error && (
                            <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-white">E-mail</label>
                            <div className="relative flex items-center">
                                <div className="absolute left-4 pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-500" />
                                </div>
                                <input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="bg-[#0F162A] w-full h-12 pl-12 pr-4 rounded-[0.475rem] border-2 border-slate-700"
                                required
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-white">Senha</label>
                                <a href="#" className="text-sm font-medium text-[#1F8EFF]">
                                    Esqueci minha senha
                                </a>
                            </div>
                            <div className="relative flex items-center">
                                <div className="absolute left-4 pointer-events-none">
                                <LockKeyhole className="h-5 w-5 text-slate-500" />
                                </div>
                                <input 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-[#0F162A] w-full h-12 pl-12 pr-12 rounded-[0.475rem] border-2 border-slate-700"
                                required
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 hover:cursor-pointer">
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-slate-500 hover:text-slate-400 transition-colors" />
                                    ): (
                                        <Eye className="h-5 w-5 text-slate-500 hover:text-slate-400 transition-colors" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <button type="submit" className="bg-[#1F8EFF] flex flex-row justify-center items-center gap-2 w-full h-12 font-bold rounded-[0.475rem] hover:cursor-pointer">
                            Entrar<ArrowRight />
                        </button>
                    </form>
                    <div className="mt-10 flex flex-col items-center gap-4">
                        <div className="flex justify-center items-center gap-2 bg-[#161F30] border border-slate-700 px-22 py-3 rounded-full">
                            <ShieldCheck size={14} className="text-orange-500" />
                            <span className="text-[10px] font-black uppercase text-slate-300">
                                Acesso Restrito
                            </span>
                        </div>
                        <p className="text-sm text-slate-500">Apenas usuários autorizados.</p>
                    </div>
                </div>
            </div>
        </main>
    )
}