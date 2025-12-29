import express from "express";
import expressAsyncHandler from "express-async-handler";
import { catchError, validate, validateIdParam } from "../middleware/validation";
import { deleteConversation, getConversations, getMessages, searchUser, sendMessage, unseenCount } from "../controllers/conversation";
import passport from "passport";

const router = express.Router();

router.post(
    "/",
    passport.authenticate("jwt", { session: false }),
    validate("message:send"),
    catchError,
    expressAsyncHandler(sendMessage)
);

router.get(
    "/",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(getConversations)
)

router.get(
    "/:id/messages",
    passport.authenticate("jwt", { session: false }),
    validateIdParam('id'),
    expressAsyncHandler(getMessages)
)

router.delete(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    validateIdParam('id'),
    expressAsyncHandler(deleteConversation)
)

router.get(
    "/search",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(searchUser)
)

router.get(
    "/unseen-count",
    passport.authenticate("jwt", { session: false }),
    expressAsyncHandler(unseenCount)
)

export default router;
