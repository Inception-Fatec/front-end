import type {
    PaginatedParameters
} from "@/types/parameter";

const PAGE_SIZE = 8;

interface GetParametersParams {
    page?: number;
    limit?: number | "all";
    search?: string;
}

export async function getParameters({
    page = 1,
    limit = PAGE_SIZE,
    search = "",
}: GetParametersParams = {}): Promise<PaginatedParameters> {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
    });

    const res = await fetch(`/api/parameters?${params}`, { cache: "no-store" });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erro ao buscar parâmetros.");
    }

    return res.json();
}