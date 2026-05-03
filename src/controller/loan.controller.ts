import { prisma }  from '../../lib/prisma'
import zod from 'zod';
import { Request, Response } from 'express' 

const createLoanSchema = zod.object({
    userId: zod.number().positive().optional(),
    bookId: zod.number().positive()
});

const updateLoanSchema = zod.object({
    userId: zod.number().positive().optional(),
    bookId: zod.number().positive().optional(),
    endDate: zod.date().optional(),
    returnedAt: zod.date().optional()
});


export async function createLoan(req: Request, res: Response) {
    try {
        const data = createLoanSchema.parse(req.body);

        if (data.userId !== undefined) {
            if (req.role !== 'ADMIN') {
                return res.status(403).json({ message: 'Apenas administradores podem criar empréstimos para outros usuários' })
            }

            const user = await prisma.user.findUnique({ where: { id: data.userId } })

            if (!user) {
                return res.status(400).json({ message: 'Usuário não encontrado' })
            }

            data.userId = user.id
        } 

        data.userId = req.userId as number;

        //Verificar empréstimos do usuário
        const activeLoans = await prisma.loan.findMany({where: { userId: data.userId}})
        if (activeLoans.length >= 3) {
            return res.status(400).json({ message: 'Limite de empréstimos atingido' })
        }

        //Verifica se o livro ja tem emprestimo
        const bookLoan = await prisma.loan.findFirst({ where: { bookId: data.bookId } })

        if (bookLoan) {
            if (!bookLoan.isActive) {
                const returnDate = new Date(bookLoan.endDate).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });

                return res.status(400).json({ message: 'Esse livro já foi emprestado para outro usuário, será devolvido no dia ' + returnDate })
            }
        }

        //Verificar disponibilidade do livro
        const book = await prisma.book.findUnique({ where: { id: data.bookId } })
        if (!book) {
            return res.status(400).json({ message: 'Livro não encontrado' })
        }

        //Criar empréstimo
        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

        const loan = await prisma.loan.create({
            data: {
                userId: data.userId,
                bookId: data.bookId,
                endDate: endDate
            }
        })
    
        res.status(201).json(loan);
    } catch (error) {
        if (error instanceof zod.ZodError) {
            return res.status(400).json({ message: "Dados inválidos", errors: error.flatten() })
        }
        res.status(500).json({ message: 'Algo deu errado', error })
    } 
}

export async function getLoanId(req: Request, res: Response) {
    try {
        if (req.role !== 'ADMIN') {
            const loan = await prisma.loan.findUnique({ where: { id: Number(req.params.id) } })

            if (!loan) {
                return res.status(404).json({ message: 'Empréstimo ou reserva não encontrados' })
            }

            if (loan.userId !== req.userId) {
                return res.status(403).json({ message: 'Apenas administradores podem acessar empréstimos de outros usuários' })
            }

            return res.status(200).json(loan);
        }

        const loan = await prisma.loan.findUnique(
            { where: { id: Number(req.params.id) } }
        );

        if (!loan) {
            return res.status(404).json({ message: 'Empréstimo ou reserva não encontrados' })
        }

        res.status(200).json(loan);
    } catch (error) {
        res.status(500).json({ message: 'Algo deu errado' })
    }
}

export async function getLoans(req: Request, res: Response) {
    try {
        const loans = await prisma.loan.findMany();

        if (loans.length === 0) {
            return res.status(404).json({ message: 'Nenhum empréstimo ou reserva encontrados' })
        }

        res.status(200).json(loans);
    } catch (error) {
        res.status(500).json({ message: 'Algo deu errado' })
    }
}

export async function deleteLoan(req: Request, res: Response) {
    try {
        const loan = await prisma.loan.findUnique({ where: { id: Number(req.params.id) } })
        if (!loan) {
            return res.status(404).json({ message: 'Empréstimo ou reserva não encontrados' })
        }

        if (loan.isActive == false) {
            return res.status(400).json({ message: 'O empréstimo já foi devolvido e não pode ser deletado' })
        }

        await prisma.loan.delete(
            { where: { id: Number(req.params.id) } }
        );
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Algo deu errado' })
    }
}

export async function updateLoan(req: Request, res: Response) {
    try {
        const data = updateLoanSchema.parse(req.body);
        const loan = await prisma.loan.findUnique({ where: { id: Number(req.params.id) } })
        if (!loan) {
            return res.status(404).json({ message: 'Empréstimo ou reserva não encontrados' })
        }

        if (data.userId !== undefined) {
            const user = await prisma.user.findUnique({ where: { id: data.userId } })

            if (!user) {
                return res.status(400).json({ message: 'Usuário não encontrado' })
            }  
        }

        if (data.bookId !== undefined) {
            const book = await prisma.book.findUnique({ where: { id: data.bookId } })
            if (!book) {
                return res.status(400).json({ message: 'Livro não encontrado' })
            }
        }

        if (loan.isActive == false) {
            return res.status(400).json({ message: 'O empréstimo já foi devolvido e não pode ser alterado' })
        }

        const loanUpdated = await prisma.loan.update({ where: { id: Number(req.params.id) }, data: {
            userId: data.userId || loan.userId,
            bookId: data.bookId || loan.bookId,
            endDate: data.endDate || loan.endDate,
            returnedAt: data.returnedAt || loan.returnedAt,
            isActive: loan.isActive
        }})

        res.status(200).json(loanUpdated);
    } catch (error) {
        if (error instanceof zod.ZodError) {
            return res.status(400).json({ message: "Dados inválidos", errors: error.flatten() })
        }
        res.status(500).json({ message: 'Algo deu errado' })
    }
}

export async function returnLoan(req: Request, res: Response) {
    try {
        const loan = await prisma.loan.findUnique({ where: { id: Number(req.params.id) } })
        if (!loan) {
            return res.status(404).json({ message: 'Empréstimo ou reserva não encontrados' })
        }

        if (!loan.isActive) {
            return res.status(400).json({ message: 'Esse empréstimo já foi devolvido' })
        }

        if (loan.userId !== req.userId && req.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Apenas administradores podem devolver empréstimos de outros usuários' })
        }

        const loanUpdated = await prisma.loan.update({ where: { id: Number(req.params.id) }, data: {
            returnedAt: new Date(),
            isActive: false
        }})

        res.status(200).json(loanUpdated);
    } catch (error) {
        res.status(500).json({ message: 'Algo deu errado' })
    }
}