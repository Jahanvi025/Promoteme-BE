import express from "express";
import expressAsyncHandler from "express-async-handler";
import { catchError, validate, validateIdParam } from "../middleware/validation";
import { addProduct, deleteProduct, editProduct, getProduct, getProducts } from "../controllers/product";
import passport from "passport";

const router = express.Router();

router.post(
    "/",
    passport.authenticate("jwt", { session: false }),
    validate("product:add"),
    catchError,
    expressAsyncHandler(addProduct)
)

router.get(
    "/",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(getProducts)
)

router.put(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    validateIdParam('id'),
    validate("product:edit"),
    catchError,
    expressAsyncHandler(editProduct)
)

router.delete(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    validateIdParam('id'),
    expressAsyncHandler(deleteProduct)
)

router.get(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    validateIdParam('id'),
    expressAsyncHandler(getProduct)
)

export default router;

