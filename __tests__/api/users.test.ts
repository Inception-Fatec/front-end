import {GET as getUsers, POST as postUser} from "@/app/api/users/route"
import {GET as getUserById, PUT as putUser} from "@/app/api/users/[id]/route"
import { auth } from "@/auth"
import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"

const mockSelectFn = jest.fn()
const mockInsertFn = jest.fn()
const mockUpdateFn = jest.fn()

interface QueryChain {
    in: jest.Mock;
    or: jest.Mock;
    eq: jest.Mock;
    range: jest.Mock;
    then: (resolve: (value: unknown) => void, reject: (reason?: unknown) => void) => void;
}

function createQueryMock(): QueryChain {
    const chain: QueryChain = {
        in: jest.fn(() => chain),
        or: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        range: jest.fn(() => chain),
        then: function(resolve: (value: unknown) => void, reject: (reason?: unknown) => void) {
            Promise.resolve(mockSelectFn()).then(resolve, reject);
        }
    };
    return chain;
}

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

jest.mock('bcryptjs', () => ({
    hash: jest.fn()
}))

jest.mock('@/lib/supabase', () => ({
    supabaseAdmin: {
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    single: mockSelectFn
                })),
                order: jest.fn(() => createQueryMock())
            })),
            insert: jest.fn(() => ({
                select: jest.fn(() => ({
                    single: mockInsertFn
                }))
            })),
            update: jest.fn(() => ({
                eq: jest.fn(() => ({
                    select: jest.fn(() => ({
                        single: mockUpdateFn
                    }))
                }))
            }))
        }))
    }
}))

function createMockRequest(body?: unknown, url = "http://localhost/api/users") {
    return {
        url,
        json: jest.fn().mockResolvedValue(body)
    } as unknown as NextRequest
}

describe('GET /api/users', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockSelectFn.mockReset()
        mockInsertFn.mockReset()
        mockUpdateFn.mockReset()
    })

    it('Deve retornar 401 se não autenticado', async () => {
        (auth as jest.Mock).mockResolvedValueOnce(null);

        const req = createMockRequest()  
        const res = await getUsers(req)
        const json = await res.json()

        expect(res.status).toBe(401)
        expect(json.error).toBe('Não autenticado.')
    })

    it('Deve retornar 403 se o usuário não é ADMIN', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {role: 'USER'}
        });
        const req = createMockRequest()  
        const res = await getUsers(req)
        const json = await res.json()
        
        expect(res.status).toBe(403)
        expect(json.error).toBe('Acesso negado.')
    })

    it('Deve retornar a lista de usuários com sucesso', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {role: 'ADMIN'}
        });
        const mockUsers = [
            { id: 1, name: 'John Doe', email: 'john@example.com', role: 'ADMIN', status: true, created_at: '2024-01-01' },
            { id: 2, name: 'Jane Doe', email: 'jane@example.com', role: 'USER', status: true, created_at: '2024-01-02' }
        ];   
        mockSelectFn.mockResolvedValueOnce({
            data: mockUsers,
            count: 2,
            error: null
        })
        const req = createMockRequest()  
        const res = await getUsers(req)
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.data).toEqual(mockUsers)
        expect(json.total).toBe(2)
    })
})

describe('POST /api/users', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockSelectFn.mockReset()
        mockInsertFn.mockReset()
        mockUpdateFn.mockReset()
    })

    it('Deve retornar 401 se não autenticado', async () => {
        (auth as jest.Mock).mockResolvedValueOnce(null);
        
        const req = createMockRequest({ name: 'John', email: 'john@example.com', password: 'password123', role: 'USER' })
        const res = await postUser(req)
        const json = await res.json()

        expect(res.status).toBe(401)
        expect(json.error).toBe('Não autenticado.')
    })

    it('Deve retornar 403 se o usuário não é ADMIN', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {role: 'USER'}
        });
        const req = createMockRequest({ name: 'John', email: 'john@example.com', password: 'password123', role: 'USER' })
        const res = await postUser(req)
        const json = await res.json()
        
        expect(res.status).toBe(403)
        expect(json.error).toBe('Acesso negado.')
    })

    it('Deve retornar 400 se campos obrigatórios estão faltando', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {role: 'ADMIN'}
        });
        const req = createMockRequest({ name: 'John', email: 'john@example.com' })
        const res = await postUser(req)
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error).toBe('name, email, password e role são obrigatórios.')
    })

    it('Deve retornar 403 se o role é invalido', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {role: 'ADMIN'}
        });
        const req = createMockRequest({ name: 'John', email: 'john@example.com', password: 'password123', role: 'INVALID_ROLE' })
        const res = await postUser(req)
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.error).toContain('Você não tem permissão para criar um usuário com role INVALID_ROLE.')
    })

    it('Deve retornar 400 se a senha tem menos de 6 caracteres', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {role: 'ADMIN'}
        });
        const req = createMockRequest({ name: 'John', email: 'john@example.com', password: '12345', role: 'USER' })
        const res = await postUser(req)
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error).toBe('A senha deve ter no mínimo 6 caracteres.')
    })

    it('Deve retornar 409 se o email já está em uso', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {role: 'ADMIN'}
        });
        mockSelectFn.mockResolvedValueOnce({
            data: {id: 1},
            error: null
        });
        const req = createMockRequest({ name: 'John', email: 'existing@example.com', password: 'password123', role: 'USER' })
        const res = await postUser(req)
        const json = await res.json()

        expect(res.status).toBe(409)
        expect(json.error).toBe('Email já está em uso.')
    })

    it('Deve retornar 201 e criar um novo usuário com sucesso', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {role: 'ADMIN'}
        });
        mockSelectFn.mockResolvedValueOnce({
            data: null,
            error: {message: 'Not Found'}
        });
        (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed_password');
        
        mockInsertFn.mockResolvedValueOnce({
            data: {
                id: 1,
                name: 'John Doe',
                email: 'john@example.com',
                role: 'USER',
                created_at: '2024-03-25T10:00:00Z'
            },
            error: null
        });
        const req = createMockRequest({ name: 'John Doe', email: 'john@example.com', password: 'password123', role: 'USER' })
        const res = await postUser(req)
        const json = await res.json()

        expect(res.status).toBe(201)
        expect(json).toEqual({
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            role: 'USER',
            created_at: '2024-03-25T10:00:00Z'
        })
    })
})

describe('GET /api/users/[id]', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockSelectFn.mockReset()
        mockInsertFn.mockReset()
        mockUpdateFn.mockReset()
    })

    it('Deve retornar 401 se não autenticado', async () => {
        (auth as jest.Mock).mockResolvedValueOnce(null);

        const req = createMockRequest({})
        const res = await getUserById(req, {params: Promise.resolve({id: '1'})})
        const json = await res.json()

        expect(res.status).toBe(401)
        expect(json.error).toBe('Não autenticado.')
    })

    it('Deve retornar 403 se usuário tenta acessar outro usuário (não ADMIN)', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {id:'1', role: 'USER'}
        });
        const req = createMockRequest({})
        const res = await getUserById(req, { params: Promise.resolve({id: '2'}) })
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.error).toBe('Acesso negado.')
    })

    it('Deve retornar 404 se o usuário não existe', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {id: '1', role: 'ADMIN'}
        });
        mockSelectFn.mockResolvedValueOnce({
            data: null,
            error: { message: 'Not found' }
        });
        const req = createMockRequest({})
        const res = await getUserById(req, {params: Promise.resolve({id: '999'})})
        const json = await res.json()

        expect(res.status).toBe(404)
        expect(json.error).toBe('Usuário não encontrado.')
    })

    it('Deve retornar 200 e dados do usuário se é ADMIN', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {id: '1', role: 'ADMIN'}
        });
        mockSelectFn.mockResolvedValueOnce({
            data: {id: 1, name: 'John Doe', email: 'john@example.com', role: 'USER', status: true, created_at: '2024-01-01'},
            error: null
        });
        const req = createMockRequest({})
        const res = await getUserById(req, { params: Promise.resolve({id: '1'}) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json).toEqual({id: 1, name: 'John Doe', email: 'john@example.com', role: 'USER', status: true, created_at: '2024-01-01'})
    })

    it('Deve retornar 200 e dados do próprio usuário', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {id: '1', role: 'USER'}
        });
        mockSelectFn.mockResolvedValueOnce({
            data: {id: 1, name: 'John Doe', email: 'john@example.com', role: 'USER', status: true, created_at: '2024-01-01'},
            error: null
        });
        const req = createMockRequest({})
        const res = await getUserById(req, { params: Promise.resolve({ id: '1' }) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json).toEqual({id: 1, name: 'John Doe', email: 'john@example.com', role: 'USER', status: true, created_at: '2024-01-01'})
    })
})

describe('PUT /api/users/[id]', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockSelectFn.mockReset()
        mockInsertFn.mockReset()
        mockUpdateFn.mockReset()
    })

    it('Deve retornar 401 se não autenticado', async () => {
        (auth as jest.Mock).mockResolvedValueOnce(null);

        const req = createMockRequest({name: 'Updated Name'})
        const res = await putUser(req, { params: Promise.resolve({id: '1'}) })
        const json = await res.json()

        expect(res.status).toBe(401)
        expect(json.error).toBe('Não autenticado.')
    })

    it('Deve retornar 403 se usuário tenta alterar role sem ser ADMIN', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {id: '1', role: 'USER'}
        });
        const req = createMockRequest({role: 'ADMIN'})
        const res = await putUser(req, { params: Promise.resolve({id: '1' })})
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.error).toBe('Apenas ADMIN pode alterar role ou status.')
    })

    it('Deve retornar 400 se o role é inválido', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {id: '1', role: 'ADMIN'}
        });
        const req = createMockRequest({role: 'INVALID_ROLE'})
        const res = await putUser(req, {params: Promise.resolve({ id: '1' })})
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error).toContain('role inválido')
    })

    it('Deve retornar 400 se nenhum campo para atualizar', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {id: '1', role: 'USER'}
        });
        const req = createMockRequest({})
        const res = await putUser(req, { params: Promise.resolve({id: '1' })})
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error).toBe('Nenhum campo para atualizar.')
    })

    it('Deve retornar 200 e atualizar usuário com sucesso', async () => {
        (auth as jest.Mock).mockResolvedValueOnce({
            user: {id: '1', role: 'ADMIN'}
        });

        (bcrypt.hash as jest.Mock).mockResolvedValueOnce('new_hashed_password');

        mockUpdateFn.mockResolvedValueOnce({
            data: {
                id: 1, 
                name: 'Updated Name', 
                email: 'test@example.com', 
                role: 'USER', 
                status: true, 
                created_at: '2024-01-01'
            },
            error: null
        });

        const req = createMockRequest({ name: 'Updated Name', password: 'newpassword123' })
        const res = await putUser(req, { params: Promise.resolve({id: '1'})})

        expect(res.status).toBe(200)
    })
})