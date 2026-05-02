export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface PasswordResetServiceResult {
  success: boolean;
  error?: string;
}
