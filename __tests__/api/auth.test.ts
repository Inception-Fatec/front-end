// Mocks no topo do arquivo
jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    handlers: {},
    signIn: jest.fn(),
    signOut: jest.fn(),
    auth: jest.fn(),
  })),
}));

jest.mock("next-auth/providers/credentials", () => ({
  __esModule: true,
  default: jest.fn((config) => config),
}));

jest.mock("@/lib/db-postgres", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

import { authConfig } from "@/auth";
import sql from "@/lib/db-postgres";
import bcrypt from "bcryptjs";

const mockSql = sql as unknown as jest.Mock;

// Tipagens exatas criadas para o ESLint não reclamar
type MockToken = { id?: string; role?: string; first_access?: boolean };
type MockUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  first_access?: boolean;
};
type MockSession = { user: MockUser; first_access?: boolean };

describe("Testes de Regras de Token - NextAuth", () => {
  // CORREÇÃO: Adicionado o "as unknown" antes de declarar nossos tipos exatos
  const callbacks = authConfig.callbacks as unknown as {
    jwt: (params: {
      token: MockToken;
      user?: MockUser;
      trigger?: string;
      session?: MockSession;
    }) => Promise<MockToken>;
    session: (params: {
      session: MockSession;
      token: MockToken;
    }) => Promise<MockSession>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve inserir role e first_access no token JWT quando o usuário loga", async () => {
    const token = {};
    const user = { id: "1", role: "ADMIN", first_access: true };

    const tokenGerado = await callbacks.jwt({ token, user });

    expect(tokenGerado.id).toBe("1");
    expect(tokenGerado.role).toBe("ADMIN");
    expect(tokenGerado.first_access).toBe(true);
  });

  it("deve atualizar o first_access no token via trigger de update", async () => {
    const token = { id: "1", first_access: true };
    const session = { user: {}, first_access: false };

    const tokenAtualizado = await callbacks.jwt({
      token,
      trigger: "update",
      session,
    });

    expect(tokenAtualizado.first_access).toBe(false);
  });

  it("deve formatar a sessão corretamente baseada no Token", async () => {
    const token = { id: "1", role: "USER", first_access: false };
    const session = { user: {} };

    const sessaoGerada = await callbacks.session({ session, token });

    expect(sessaoGerada.user.id).toBe("1");
    expect(sessaoGerada.user.role).toBe("USER");
    expect(sessaoGerada.user.first_access).toBe(false);
  });
});

describe("Testes da Função Authorize (Credenciais)", () => {
  // CORREÇÃO: Adicionado o "as unknown" aqui também!
  const authorize = (
    authConfig.providers[0] as unknown as {
      authorize: (
        credentials: Record<string, unknown> | null,
      ) => Promise<MockUser | null>;
    }
  ).authorize;

  beforeEach(() => {
    mockSql.mockReset();
    jest.clearAllMocks();
  });

  it("deve retornar null se faltar email ou senha", async () => {
    expect(await authorize({ email: "teste@fatec.com" })).toBeNull();
    expect(await authorize(null)).toBeNull();
  });

  it("deve retornar null se o usuário não for encontrado ou estiver inativo", async () => {
    mockSql.mockResolvedValueOnce([]);
    expect(
      await authorize({ email: "teste@fatec.com", password: "123" }),
    ).toBeNull();

    mockSql.mockResolvedValueOnce([{ status: false }]);
    expect(
      await authorize({ email: "teste@fatec.com", password: "123" }),
    ).toBeNull();
  });

  it("deve retornar null se a senha estiver incorreta", async () => {
    mockSql.mockResolvedValueOnce([
      { id: 1, email: "t@t.com", status: true, password: "hash" },
    ]);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
    expect(
      await authorize({ email: "t@t.com", password: "errada" }),
    ).toBeNull();
  });

  it("deve retornar os dados do usuário se estiver tudo correto", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 1,
        name: "Teste",
        email: "t@t.com",
        role: "USER",
        status: true,
        first_access: false,
        password: "hash",
      },
    ]);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    const result = await authorize({ email: "t@t.com", password: "certa" });
    expect(result).toEqual({
      id: "1",
      name: "Teste",
      email: "t@t.com",
      role: "USER",
      first_access: false,
    });
  });
});
