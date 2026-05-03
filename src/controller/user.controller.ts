import { prisma }  from '../../lib/prisma'
import zod from 'zod';
import { Request, Response } from 'express' 
import { get } from 'node:http';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';

const createUserSchema = zod.object({
    name: zod.string().min(3),
    email: zod.string().email(),
    password: zod.string().min(8),
    role: zod.enum(['USER', 'ADMIN']).optional()
});

const updateUserSchema = zod.object({
    name: zod.string().min(3).optional(),
    email: zod.string().email().optional(),
    password: zod.string().min(8).optional(),
    role: zod.enum(['USER', 'ADMIN']).optional()
});

export async function createUser(req: Request, res: Response) {
    try {

        const data = createUserSchema.safeParse(req.body);

        if (!data.success) {
            return res.status(400).json({ message: "Dados inválidos", errors: data.error.flatten() })
        }

        const randomSalt = randomInt(10, 16)
        const passwordHash = await bcrypt.hash(req.body.password, randomSalt);

        req.body.password = passwordHash;

        const user = await prisma.user.create({
            data: {
                name: req.body.name,
                email: req.body.email,
                password: passwordHash,
                role: req.body.role ?? "USER"
            }
        });
        res.status(201).json(user);
    } catch (error) {
        if (error instanceof zod.ZodError) {
            return res.status(400).json({ message: "Dados inválidos", errors: error.flatten() })
        }

        res.status(500).json({ message: 'Algo deu errado' })
    } 
} 

export async function getUserId(req: Request, res: Response) {
    try {
        const user = await prisma.user.findUnique(
            { where: { id: Number(req.params.id) } }
        );

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' })
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Algo deu errado' })
    }
}

export async function getUsers(req: Request, res: Response) {
    try {
        const users = await prisma.user.findMany();

        if (users.length === 0) {
            return res.status(404).json({ message: 'Nenhum usuário encontrado' })
        }

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Algo deu errado' })
    }
}

export async function deleteUser(req: Request, res: Response) {
    try {
        const loan = await prisma.loan.findFirst({ where: { userId: Number(req.params.id), isActive: true } })  
        if (loan) {
            return res.status(400).json({ message: 'Não é possível deletar um usuário que possui empréstimos ou reservas ativas' })
        }

        const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } })
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' })
        }

        await prisma.user.delete(
            { where: { id: Number(req.params.id) } }
        );
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Algo deu errado' })
    }
}

export async function updateUser(req: Request, res: Response) {
    try {
        const data = updateUserSchema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } })
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' })
        }

        if (req.body.password) {
            const randomSalt = randomInt(10, 16)
            const passwordHash = await bcrypt.hash(req.body.password, randomSalt);
            data.password = passwordHash;
        }

        const userUpdated = await prisma.user.update({ where: { id: Number(req.params.id) }, data: {
            name: data.name || user.name,
            email: data.email || user.email,
            password: data.password || user.password,
            role: data.role || user.role
        }})

        res.status(200).json(userUpdated);
    } catch (error) {
        if (error instanceof zod.ZodError) {
            return res.status(400).json({ message: "Dados inválidos", errors: error.flatten() })
        }
        res.status(500).json({ message: 'Algo deu errado' })
    }
}