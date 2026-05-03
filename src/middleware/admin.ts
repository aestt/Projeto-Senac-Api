import { Request, Response } from 'express';

export function adminAuthenticate(req: Request, res: Response, next: Function) {
    if (req.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Acesso negado!' });
    }
    
    next();
}