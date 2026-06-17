import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "@/app/login/page";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("Página de Login", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  it("deve renderizar a página corretamente", () => {
    render(<Login />);
    expect(screen.getByText("Bem-vindo de volta")).toBeInTheDocument();
  });

  it("deve permitir digitar email e senha e alternar a visualização da senha", () => {
    render(<Login />);

    const emailInput = screen.getByPlaceholderText("seu@email.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");

    fireEvent.change(emailInput, { target: { value: "teste@fatec.com" } });
    fireEvent.change(passwordInput, { target: { value: "senha123" } });

    expect(emailInput).toHaveValue("teste@fatec.com");
    expect(passwordInput).toHaveValue("senha123");

    const toggleButton = passwordInput.nextElementSibling as HTMLElement;
    fireEvent.click(toggleButton); // Mostra
    expect(passwordInput).toHaveAttribute("type", "text");
    fireEvent.click(toggleButton); // Esconde
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("deve exibir erro se as credenciais forem inválidas", async () => {
    (signIn as jest.Mock).mockResolvedValueOnce({ error: "Erro", ok: false });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), {
      target: { value: "errado@fatec.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Credenciais inválidas. Tente novamente"),
      ).toBeInTheDocument();
    });
  });

  it("deve redirecionar para o dashboard ao logar com sucesso", async () => {
    (signIn as jest.Mock).mockResolvedValueOnce({ error: null, ok: true });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), {
      target: { value: "teste@fatec.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "senha123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("./dashboard");
    });
  });
});
