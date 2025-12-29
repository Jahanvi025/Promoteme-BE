import express from "express";
import expressAsyncHandler from "express-async-handler";
import { catchError, validate, validateIdParam } from "../middleware/validation";
import passport from "passport";
import { orderHistory, placeOrder, updateOrderStatus } from "../controllers/order";

const router = express.Router();

router.get(
    "/",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(orderHistory)
)

router.put(
    "/:id/status",
    passport.authenticate("jwt", { session: false }),
    validateIdParam("id"),
    validate("order:update"),
    expressAsyncHandler(updateOrderStatus)
)

router.post(
    "/",
    passport.authenticate("jwt", { session: false }),
    validate("order"),
    catchError,
    expressAsyncHandler(placeOrder)
)

export default router;