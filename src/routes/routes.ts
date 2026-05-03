import express from 'express';
import { authenticate } from '../middleware/auth';
import { login } from '../controller/login.controller';
import { createUser, deleteUser, getUserId, getUsers, updateUser } from '../controller/user.controller';
import { adminAuthenticate } from '../middleware/admin';
import { createBook, createCategory, deleteBook, getBookId, getBooks, updateBook } from '../controller/book.controller';
import { createLoan, deleteLoan, getLoanId, getLoans, returnLoan, updateLoan } from '../controller/loan.controller';
const router = express.Router();

router.get("/users", authenticate, adminAuthenticate, getUsers);
router.get("/user/:id", authenticate, adminAuthenticate, getUserId);
router.post("/user", authenticate, adminAuthenticate ,createUser);
router.delete("/user/:id", authenticate, adminAuthenticate, deleteUser);
router.put("/user/:id", authenticate, adminAuthenticate, updateUser)

router.post("/category", authenticate, adminAuthenticate, createCategory)

router.get("/books", authenticate, getBooks)
router.get("/book/:id", authenticate, getBookId)
router.delete("/book/:id", authenticate, adminAuthenticate,deleteBook)
router.post("/book", authenticate, adminAuthenticate, createBook)
router.put("/book/:id", authenticate, adminAuthenticate, updateBook)

router.post("/loan", authenticate, createLoan)
router.get("/loans", authenticate, adminAuthenticate, getLoans)
router.get("/loan/:id", authenticate, getLoanId)
router.delete("/loan/:id", authenticate, adminAuthenticate, deleteLoan)
router.put("/loan/:id", authenticate, adminAuthenticate, updateLoan)

router.post("/return-loan/:id", authenticate, returnLoan)

router.post("/login", login)

export default router;