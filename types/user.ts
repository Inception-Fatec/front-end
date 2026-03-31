export type UserRole = "ADMIN" | "OPERATOR" | "USER";

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  first_access: boolean;
  created_at: string;
  status: boolean;
};

export type UserWithPassword = User & {
  password: string;
};

export type UserAlert = {
  id_user: number;
  id_alert_log: number;
  seen: boolean;
};