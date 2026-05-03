import zod from 'zod';
import { Request, Response } from 'express'
import { prisma } from '../../lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const loginSchema = zod.object({
    email: zod.string().email(),
    password: zod.string().min(1)
})

export async function login(req: Request, res: Response) {
    try {
        const requestValidation = loginSchema.safeParse(req.body)

        if (!requestValidation.success) {
            return res.status(400).json({ errors: requestValidation.error.flatten() })
        }

        const { email, password } = requestValidation.data

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas' })
        }
        
        const isPasswordCorrect = await bcrypt.compare(password, user.password)

        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Credenciais inválidas' })
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '8h' })
        req.userId = user.id;
        req.role = user.role;
        res.status(200).json({ token })

    } catch (error) {
        res.status(500).json({ message: 'Algo deu errado' })

    }
}