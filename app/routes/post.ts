import express from "express";
import expressAsyncHandler from "express-async-handler";
import { catchError, validate, validateIdParam } from "../middleware/validation";;
import { bookmarkPost, createPost, deletePost, editPost, editStatus, getBookmarks, getPost, getPosts, likePost, markNotInterested, purchasePost, sendTip, uploadFiles } from "../controllers/post";
import passport from "passport";
import { getComments } from "../controllers/comment";
import multer from "multer";
import cloudinary from 'cloudinary'

const router = express.Router();

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

const storage = multer.diskStorage({});
const upload = multer({ storage });

router.post(
  '/upload',
  passport.authenticate("jwt", { session: false }),
  upload.array("files", 10),
  expressAsyncHandler(uploadFiles)
);

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  validate("post:create"),
  catchError,
  expressAsyncHandler(createPost)
);

router.get('/',
  passport.authenticate("jwt", { session: false }),
  expressAsyncHandler(getPosts)
);

router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  validateIdParam('id'),
  expressAsyncHandler(deletePost)
)

router.put(
  "/:id/status",
  passport.authenticate("jwt", { session: false }),
  validateIdParam('id'),
  validate("post:status"),
  catchError,
  expressAsyncHandler(editStatus)
)

router.put(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  validate("post:edit"),
  validateIdParam('id'),
  catchError,
  expressAsyncHandler(editPost)
)

router.post(
  "/:id/like",
  passport.authenticate("jwt", { session: false }),
  validateIdParam('id'),
  catchError,
  expressAsyncHandler(likePost)
);

router.get(
  "/:id/comments",
  passport.authenticate("jwt", { session: false }),
  validateIdParam('id'),
  expressAsyncHandler(getComments)
)

router.post(
  "/:id/:type/bookmark",
  passport.authenticate("jwt", { session: false }),
  validateIdParam('id'),
  catchError,
  expressAsyncHandler(bookmarkPost)
)

router.get(
  "/bookmarks",
  passport.authenticate("jwt", { session: false }),
  expressAsyncHandler(getBookmarks)
)

router.post(
  "/:id/purchase",
  passport.authenticate("jwt", { session: false }),
  validateIdParam('id'),
  catchError,
  expressAsyncHandler(purchasePost)
)

router.post(
  "/:id/not-interested",
  passport.authenticate("jwt", { session: false }),
  validateIdParam('id'),
  catchError,
  expressAsyncHandler(markNotInterested)
)

router.post(
  "/send-tip",
  passport.authenticate("jwt", { session: false }),
  validate("post:tip"),
  catchError,
  expressAsyncHandler(sendTip)
)

router.get(
  "/:id/post",
  passport.authenticate("jwt", { session: false }),
  validateIdParam('id'),
  expressAsyncHandler(getPost)
)

export default router;
