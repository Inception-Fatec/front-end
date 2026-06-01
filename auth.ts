import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import sql from "@/lib/db-postgres";
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

        const rows = await sql`
          SELECT id, name, email, password, role, status, first_access
          FROM users
          WHERE email = ${credentials.email as string}
          LIMIT 1
        `;

        const user = rows[0];
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
    maxAge: 60 * 60 * 8,
  },

  pages: {
    signIn: "/login",
  },

  trustHost: true,
});
