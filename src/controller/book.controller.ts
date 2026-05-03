import { prisma }  from '../../lib/prisma'
import zod from 'zod';
import { Request, Response } from 'express' 
import { tr } from 'zod/locales';

const createBookSchema = zod.object({
    title: zod.string().min(1),
    author: zod.string().min(1),
    description: zod.string().min(1),
    price: zod.number().positive(),
    categoryId: zod.number().positive()
});

const updateBookSchema = zod.object({
    title: zod.string().min(1).optional(),
    author: zod.string().min(1).optional(),
    description: zod.string().min(1).optional(),
    price: zod.number().positive().optional(),
    categoryId: zod.number().positive().optional()
});

const createCategorySchema = zod.object({
    name: zod.string().min(3)
});

export async function createCategory(req: Request, res: Response) {
    try {
        const data = createCategorySchema.parse(req.body);
        const category = await prisma.category.create({ data })
        res.status(201).json(category);
    } catch (error) {
        if (error instanceof zod.ZodError) {
            return res.status(400).json({ message: "Dados inválidos", errors: error.flatten() })
        }
        res.status(500).json({ message: 'Algo deu errado' })
    } 
}

export async function createBook(req: Request, res: Response) {
    try {
        const data = createBookSchema.parse(req.body);

        const category = await prisma.category.findUnique({ where: { id: data.categoryId } })
        if (!category) {
            return res.status(400).json({ message: 'Categoria não encontrada' })
        }   

        const book = await prisma.book.create({ data })
        res.status(201).json(book);
    } catch (error) {
        if (error instanceof zod.ZodError) {
            return res.status(400).json({ message: "Dados inválidos", errors: error.flatten() })
        }
        res.status(500).json({ message: 'Algo deu errado' })
    } 
}

export async function updateBook(req: Request, res: Response) {
    try {
        const data = updateBookSchema.parse(req.body);
        const book = await prisma.book.findUnique({ where: { id: Number(req.params.id) } })
        if (!book) {
            return res.status(404).json({ message: 'Livro não encontrado' })
        }

        if (data.categoryId !== undefined) {
            const category = await prisma.category.findUnique({ where: { id: data.categoryId } })

            if (!category) {
                return res.status(400).json({ message: 'Categoria não encontrada' })
            }
        }

        const bookUpdated = await prisma.book.update({ where: { id: Number(req.params.id) }, data: {
            title: data.title || book.title,
            author: data.author || book.author,
            description: data.description || book.description,
            price: data.price || book.price,
            categoryId: data.categoryId || book.categoryId
        }})

        res.status(200).json(bookUpdated);
    } catch (error) {
        if (error instanceof zod.ZodError) {
            return res.status(400).json({ message: "Dados inválidos", errors: error.flatten() })
        }
        res.status(500).json({ message: 'Algo deu errado' })
    }
}

export async function deleteBook(req: Request, res: Response) {
    try {
        const loan = await prisma.loan.findFirst({ where: { bookId: Number(req.params.id), isActive: true } })
        if (loan) {
            return res.status(400).json({ message: 'Não é possível deletar um livro que está emprestado ou reservado' })
        }

        const book = await prisma.book.findUnique({ where: { id: Number(req.params.id) } })
        if (!book) {
            return res.status(404).json({ message: 'Livro não encontrado' })
        }

        await prisma.book.delete(
            { where: { id: Number(req.params.id) } }
        );
        res.status(204).json({ message: 'Livro deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Algo deu errado' })
    }
}

export async function getBookId(req: Request, res: Response) {
    try {
        const book = await prisma.book.findUnique(
            { where: { id: Number(req.params.id) } }
        );

        if (!book) {
            return res.status(404).json({ message: 'Livro não encontrado' })
        }

        if (req.role == "ADMIN") {
            return res.status(200).json(book);
        }

        const { id, title, author, description, price } = book;
        const bookResponse = { "id": id, "title": title, "author": author, "description": description, "price": price }
        return res.status(200).json(bookResponse);
    } catch (error) {
        res.status(500).json({ message: 'Algo deu errado' })
    }
}

export async function getBooks(req: Request, res: Response) {
    try {
        const books = await prisma.book.findMany();

        if (books.length === 0) {
            return res.status(404).json({ message: 'Nenhum Livro encontrado' })
        }

        res.status(200).json(books);
    } catch (error) {
        res.status(500).json({ message: 'Algo deu errado' })
    }
}