import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/types/user";

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
          .select("id, name, email, password, role, status, first_access")
          .eq("email", credentials.email)
          .single();

        if (error) {
          console.error("[auth] Erro ao buscar usuário:", error.message);
          return null;
        }

        if (!user || !user.status) return null;

        const match = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );
        if (!match) return null;

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          first_access: user.first_access,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.first_access = user.first_access; 
      }

      if (trigger === "update" && session?.first_access !== undefined) {
        token.first_access = session.first_access;
      }

      return token;

    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.first_access = token.first_access as boolean;
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

  trustHost: true,
});
