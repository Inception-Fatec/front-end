import { DefaultSession, DefaultJWT } from "next-auth";
import type { UserRole } from "./user";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      first_access: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    first_access: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
    first_access: boolean;
  }
}
