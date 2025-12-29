import express from "express";
import expressAsyncHandler from "express-async-handler";
import { catchError, validate } from "../middleware/validation";
import passport from "passport";
import { depositAmount, getTransactions, getWalletBalance, transferFunds } from "../controllers/wallet";

const router = express.Router();

router.post(
    "/deposit",
    passport.authenticate("jwt", { session: false }),
    validate("Wallet:deposit"),
    catchError,
    expressAsyncHandler(depositAmount)
)

router.get(
    "/balance",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(getWalletBalance)
)

router.post(
    "/pay",
    passport.authenticate("jwt", { session: false }),
    validate("Wallet:transfer"),
    catchError,
    expressAsyncHandler(transferFunds)
)

router.get(
    "/transactions",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(getTransactions)
)

export default router;
