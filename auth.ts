import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/supabase";

type UserRole = "ADMIN" | "OPERATOR" | "USER";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { data: user, error } = await supabaseAdmin
          .from("users")
          .select("id, name, email, password, role, status")
          .eq("email", credentials.email)
          .single();

        if (error || !user) return null;

        // Usuário inativo não pode logar
        if (!user.status) return null;

        // ⚠️ Comparação de senha em texto puro — substituir por bcrypt futuramente
        if (credentials.password !== user.password) return null;

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 horas
  },

  pages: {
    signIn: "/login",
  },
});
