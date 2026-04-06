export type UserRole = "ADMIN" | "OPERATOR" | "USER";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  first_access: boolean;
  created_at: string;
  status: boolean;
}

export interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  name?: string;
  role?: UserRole;
  status?: boolean;
}
