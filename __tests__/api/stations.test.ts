import { DELETE, POST } from "@/app/api/stations/route"
import { auth } from "@/auth"
import { NextRequest } from "next/server"

const mockCheckFn = jest.fn()
const mockInsertFn = jest.fn()

jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((body, init) => {
            return {
                status: init?.status || 200,
                json: async () => body
            }
        })
    }
}))

jest.mock('@/auth', () => ({
    auth: jest.fn()
}))

jest.mock('@/lib/supabase', () => ({
    supabaseAdmin: {
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    maybeSingle: mockCheckFn
                }))
            })),
            insert: jest.fn(() => ({
                select: jest.fn().mockReturnThis(),
                maybeSingle: mockInsertFn
            })),
            delete: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ data: null, error: null })
            }))
        }))
    }
}))

function createMockRequest(body: unknown) {
    return {
        json: jest.fn().mockResolvedValue(body)
    } as unknown as NextRequest
}

describe('Post /api/stations', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('Deve retornar 401 se não autenticado', async () => {
        (auth as jest.Mock).mockResolvedValueOnce(null);

        const req = createMockRequest({name: 'Station 1', id_datalogger: 'dl001'})
        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(401)
        expect(json.error).toBe('Não autenticado.')
    })

    it('Deve retornar 403 se o usuário não é ADMIN', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {role: 'USER'}
        });
        const req = createMockRequest({name:'Station 1', id_datalogger: 'dl001'})
        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.error).toBe('Acesso negado.')
    })

    it('Deve retornar 400 se name ou id_datalogger estiverem faltando', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {role: 'ADMIN'}
        });
        const req = createMockRequest({name: 'Station 1'})
        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error).toBe('todos os campos são obrigatórios')
    })

    it('Deve retornar 409 se o nome da estação já existe', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {role: 'ADMIN'}
        });
        mockCheckFn.mockResolvedValueOnce({
            data: {id: 1},
            error: null
        });
        const req = createMockRequest({name: 'Existing Station', id_datalogger: 'dl001'})
        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(409)
        expect(json.error).toBe('Nome já em uso.')
    })

    it('Deve retornar 201 e criar uma nova estação com sucesso', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {role: 'ADMIN'}
        }); 
        mockCheckFn
            .mockResolvedValueOnce({data: null, error: null})
            .mockResolvedValueOnce({data: null, error: null}) 
            .mockResolvedValueOnce({
                data: {
                    id: 1,
                    name: 'Weather Station',
                    id_datalogger: 'dl001',
                    created_at: '2024-03-25T10:00:00Z'
                },
                error: null
            });

        mockInsertFn.mockResolvedValueOnce({
            data: { id: 1 },
            error: null
        });

        const req = createMockRequest({name: 'Weather Station', id_datalogger: 'dl001'})
        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(201)
        expect(json).toEqual({
            id: 1,
            name: 'Weather Station',
            id_datalogger: 'dl001',
            created_at: '2024-03-25T10:00:00Z'
        })
    })
})

describe('DELETE /api/stations', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('Deve retornar 401 se não autenticado', async () => {
        (auth as jest.Mock).mockResolvedValueOnce(null);

        const req = createMockRequest({id: 1})
        const res = await DELETE(req)
        const json = await res.json()

        expect(res.status).toBe(401)
        expect(json.error).toBe('Não autenticado.')
    })

    it('Deve retornar 403 se o usuário não é ADMIN', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {role: 'USER'}
        });
        const req = createMockRequest({id: 1})
        const res = await DELETE(req)
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.error).toBe('Acesso negado.')
    })

    it('Deve retornar 400 se id estiver faltando', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {role: 'ADMIN'}
        });
        const req = createMockRequest({})
        const res = await DELETE(req)
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error).toBe('id é obrigatório.')
    })

    it('Deve retornar 200 e deletar uma estação com sucesso', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {role: 'ADMIN'}
        });

        mockCheckFn.mockResolvedValueOnce({
            data: {id: 1},
            error: null
        })
        const req = createMockRequest({id: 1})
        const res = await DELETE(req)

        expect(res.status).toBe(200)
    })
})