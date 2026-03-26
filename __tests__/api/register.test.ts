import { POST } from "@/app/api/register/route"
import bcrypt from "bcryptjs"
import { NextRequest } from "next/server"

const mockSelectFn = jest.fn()
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

jest.mock('bcryptjs', () => ({
    hash: jest.fn()
}))

jest.mock('@/lib/supabase', () => ({
    supabaseAdmin: {
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    single: mockSelectFn
                }))
            })),
            insert: jest.fn(() => ({
                select: jest.fn().mockReturnThis(),
                single: mockInsertFn
            }))
        }))
    }
}))

function createMockRequest(body: unknown) {
    return {
        json: jest.fn().mockResolvedValue(body)
    } as unknown as NextRequest
}

describe('Post /api/register', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('Deve retornar 400 se name, email ou password estiverem faltando', async () => {
        const req = createMockRequest({name: 'João', email: 'test@example.com'})
        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error).toBe('name, email e password são obrigatórios.')
    })

    it('Deve retornar 400 se a senha tiver menos de 6 caracteres', async () => {
        const req = createMockRequest({
            name: 'João Silva',
            email: 'test@example.com',
            password: '12345'
        })
        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error).toBe('A senha deve ter no mínimo 6 caracteres.')
    })

    it('Deve retornar 409 se o email já está em uso', async () => {
        mockSelectFn.mockResolvedValueOnce({
            data: {id: 1},
            error: null
        });
        const req = createMockRequest({
            name: 'João Silva',
            email: 'existing@example.com',
            password: 'password123'
        })
        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(409)
        expect(json.error).toBe('Email já está em uso.')
    })

    it('Deve retornar 201 e criar um novo usuário com sucesso', async () => {
        mockSelectFn.mockResolvedValueOnce({
            data: null,
            error: { message: 'Not found' }
        });
        (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed_password_123');
        mockInsertFn.mockResolvedValueOnce({
            data: {
                id: 1,
                name: 'João Silva',
                email: 'test@example.com',
                role: 'USER',
                created_at: '2024-03-24T10:00:00Z'
            },
            error: null
        });
        const req = createMockRequest({
            name: 'João Silva',
            email: 'test@example.com',
            password: 'password123'
        })
        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(201)
        expect(json).toEqual({
            id: 1,
            name: 'João Silva',
            email: 'test@example.com',
            role: 'USER',
            created_at: '2024-03-24T10:00:00Z'
        })
    })
})