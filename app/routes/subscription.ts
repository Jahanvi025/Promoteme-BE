import express from "express";
import passport from "passport";
import { catchError, validate, validateIdParam } from "../middleware/validation";
import expressAsyncHandler from "express-async-handler";
import { cancelSubscription, getSubscriptions, subscribeToCreator } from "../controllers/subscription";


const router = express.Router();

router.post(
    "/create",
    passport.authenticate("jwt", { session: false }),
    validate("subscription:create"),
    catchError,
    expressAsyncHandler(subscribeToCreator)
)

router.get(
    "/",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(getSubscriptions)
)

router.delete(
    "/:id/cancel",
    passport.authenticate("jwt", { session: false }),
    validateIdParam('id'),
    catchError,
    expressAsyncHandler(cancelSubscription)
)

export default router;
