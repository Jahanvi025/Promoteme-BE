import express from "express";
import expressAsyncHandler from "express-async-handler";
import { catchError, validate, validateIdParam } from "../middleware/validation";
import { comment, deleteComment, getReplies, likeComment, replyToComment } from "../controllers/comment";
import passport from "passport";

const router = express.Router();

router.post(
    "/:postId",
    passport.authenticate("jwt", { session: false }),
    validateIdParam('postId'),
    validate("post:comment"),
    catchError,
    expressAsyncHandler(comment)
);

router.post(
    "/:id/reply",
    passport.authenticate("jwt", { session: false }),
    validateIdParam('id'),
    validate("comment:reply"),
    catchError,
    expressAsyncHandler(replyToComment)
);

router.post(
    "/:id/like",
    passport.authenticate("jwt", { session: false }),
    validateIdParam('id'),
    catchError,
    expressAsyncHandler(likeComment)
);

router.delete(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    validateIdParam('id'),
    expressAsyncHandler(deleteComment)
)

router.get(
    "/:commentId/replies",
    passport.authenticate("jwt", { session: false }),
    validateIdParam('commentId'),
    expressAsyncHandler(getReplies)
)

export default router;
