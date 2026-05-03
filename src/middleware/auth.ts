// src/middleware/auth.ts
import jwt, { JwtPayload } from 'jsonwebtoken';
import type { Request, Response } from 'express' 

export const authenticate = async (req: Request, res: Response, next: Function) => {
  console.log('Autenticando usuário...');
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Token inválido.' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token inválido.' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    
    req.userId = decoded.id;
    req.role = decoded.role;

    next();

  } catch (err) {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }  
};

export default authenticate;