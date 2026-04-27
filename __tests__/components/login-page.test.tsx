import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Login from "@/app/login/page";

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
  useSession: jest.fn(() => ({ data: null, stats: "unathenticated" })),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "",
}));

describe("Login Page", () => {
  it("renders a heading", () => {
    render(<Login />);

    const heading = screen.getAllByRole("heading", { level: 1 });

    expect(heading.length).toBeGreaterThan(0);
    expect(heading[0]).toBeInTheDocument();
  });
});
