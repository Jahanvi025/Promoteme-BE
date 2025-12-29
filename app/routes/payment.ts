import express from "express";
import expressAsyncHandler from "express-async-handler";
import { catchError, validate, validateIdParam } from "../middleware/validation";
import { addCard, addCustomer, addStripeAccount, cancelPayout, createConnectAccount, createPaymentIntent, createPayout, deleteCard, getBalance, getCards, getEarnings, getPaymentHistory, getPayoutHistory, saveBankDetail } from "../controllers/payment";
import passport from "passport";

const router = express.Router();

router.post(
    "/create-payment",
    passport.authenticate("jwt", { session: false }),
    validate("Stripe:createPayment"),
    catchError,
    expressAsyncHandler(createPaymentIntent)
)

router.post(
    "/bank-account",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(saveBankDetail)
)

router.post(
    "/connect-account",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(createConnectAccount)
);

router.post(
    "/add-customer",
    expressAsyncHandler(addCustomer)
);

router.post(
    "/create-payout",
    passport.authenticate("jwt", { session: false }),
    validate("stripe:createPayout"),
    catchError,
    expressAsyncHandler(createPayout)
)

router.get(
    "/earning",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(getEarnings)
)

router.get(
    "/payout-history",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(getPayoutHistory)
)

router.get(
    "/earning-summary",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(getPayoutHistory)
)

router.post(
    "/cancel-payout",
    passport.authenticate("jwt", { session: false }),
    validate("stripe:cancelPayout"),
    catchError,
    expressAsyncHandler(cancelPayout)
)

router.post(
    "/add-account",
    passport.authenticate("jwt", { session: false }),
    validate("stripe:addAccount"),
    catchError,
    expressAsyncHandler(addStripeAccount)
)

router.get(
    "/history",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(getPaymentHistory)
)

router.post(
    "/add-card",
    passport.authenticate("jwt", { session: false }),
    validate("stripe:addCard"),
    catchError,
    expressAsyncHandler(addCard)
)

router.get(
    "/cards",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(getCards)
)

router.delete(
    "/:id/card",
    passport.authenticate("jwt", { session: false }),
    validateIdParam('id'),
    catchError,
    expressAsyncHandler(deleteCard)
)

router.get(
    "/balance",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(getBalance)
)

export default router;