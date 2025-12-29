import express from "express";
import passport from "passport";
import { catchError, validate, validateIdParam } from "../middleware/validation";
import expressAsyncHandler from "express-async-handler";
import { createCategory, deleteCategory, updateCategory } from "../controllers/category";
import { adminAuth } from "../middleware/adminAuth";
import Category from "../schema/Category";
import { createResponse } from "../helper/response";

const router = express.Router();

router.post(
    "/",
    adminAuth,
    validate("category:create"),
    catchError,
    expressAsyncHandler(createCategory)
)

router.get("/",
    adminAuth,
    expressAsyncHandler(async (req, res) => {
        const categories = await Category.find({});
        res.send(createResponse({ categories }));
    })
)

router.put(
    "/:id",
    adminAuth,
    validate("category:update"),
    catchError,
    expressAsyncHandler(updateCategory)
)

router.delete(
    "/:id",
    adminAuth,
    validateIdParam('id'),
    catchError,
    expressAsyncHandler(deleteCategory)
)

export default router;
