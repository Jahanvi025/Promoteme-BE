import { hashPassword } from "./../services/user";
import createHttpError from "http-errors";
import express from "express";
import passport from "passport";
import { type IUser } from "../schema/User";
import expressAsyncHandler from "express-async-handler";
import { createResponse } from "../helper/response";
import { catchError, validate, validateIdParam } from "../middleware/validation";
import { createUserTokens, decodeToken } from "../services/passport-jwt";
import * as userService from "../services/user";
import { proxyAuth } from "../middleware/proxyAuth";
import { addAddress, blockUser, getBlockList, getSearchedUsers, getSuggestions, getTrendingUsers, getUser, getUserAddresses, reportUser, resetPassword, sendOtp, switchProfile, unblockUser, updateAddress, updatePassword, verifyOtp } from "../controllers/user";
import Category from "../schema/Category";

const router = express.Router();

router.put(
  '/reset-password',
  validate("password:reset"),
  catchError,
  expressAsyncHandler(resetPassword)
);

router.put(
  "/updatePassword",
  passport.authenticate("jwt", { session: false }),
  validate("password:update"),
  catchError,
  expressAsyncHandler(updatePassword)
)

router.post(
  "/login",
  passport.authenticate("login", { session: false }),
  validate("users:login"),
  catchError,
  expressAsyncHandler(async (req, res, next) => {
    res.send(
      createResponse({ ...createUserTokens(req.user!), user: req.user })
    );
  })
);

router.put(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  validateIdParam('id'),
  validate("users:update"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const user = req.params.id;
    const loggedInUserId = req.user?._id;

    if (user !== loggedInUserId) {
      throw createHttpError(404, "Unauthorized: You can only update your own information");
    }
    const result = await userService.updateUser(user, req.body);
    res.send(createResponse(result, "User updated successfully!"));
  })
);

router.post(
  "/register",
  validate("users:create"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const { displayName, email, password, lastActiveRole, mobile_number, username, isCreator, isFan } = req.body as IUser;
    const user = await userService.createUser({ displayName, email, password, lastActiveRole, mobile_number, username, isCreator, isFan });
    res.send(createResponse(user, "User created successfully!"));
  })
);

router.post(
  "/register-with-link",
  validate("users:create-with-link"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const { email, lastActiveRole } = req.body as IUser;
    const user = await userService.createUserWithResetPasswordLink({
      email,
      lastActiveRole,
    });
    res.send(createResponse(user, "Reset password link sent successfully!"));
  })
);

router.post(
  "/set-new-password/:token",
  validate("users:set-new-password"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const { password } = req.body as IUser;
    const decode = decodeToken(req.params.token);
    if (!decode || !decode._id) {
      throw createHttpError(400, { message: "Invalid token" });
    }
    const existUser = await userService.getUserById(decode._id);

    if (!existUser) {
      throw createHttpError(400, {
        message: "User not found",
      });
    }

    if (existUser?.password) {
      throw createHttpError(400, {
        message: "Password already updated for this user",
      });
    }
    const user = await userService.updateUser(decode._id, {
      active: true,
      password: await hashPassword(password),
    });
    res.send(createResponse(user, "Password updated successfully!"));
  })
);

router.post(
  "/info",
  proxyAuth(),
  validate("users:login"),
  catchError,
  expressAsyncHandler(async (req, res, next) => {
    const result = await userService.getUserInfo(req.body.email, req.body.password);
    res.send(result);
  })
);

router.post(
  "/social-login",
  proxyAuth(),
  validate("users:social-login"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const { email, lastActiveRole, providerId, provider, firstName, lastName, displayName, profile_picture } = req.body as IUser;
    const user = await userService.userSocialLogin({
      email,
      lastActiveRole,
      providerId,
      provider,
      firstName,
      lastName,
      displayName,
      profile_picture
    });
    res.send(user);
  })
);

router.get('/',
  passport.authenticate("jwt", { session: false }),
  expressAsyncHandler(getUser)
);

router.post(
  '/passwordreset-otp',
  validate("password:sendOtp"),
  catchError,
  expressAsyncHandler(sendOtp)
);

router.post(
  '/verify-otp',
  validate("password:verifyOtp"),
  catchError,
  expressAsyncHandler(verifyOtp)
);

router.post(
  "/block",
  passport.authenticate("jwt", { session: false }),
  validate("block"),
  catchError,
  expressAsyncHandler(blockUser)
)

router.delete(
  "/unblock/:userId",
  passport.authenticate("jwt", { session: false }),
  validateIdParam("userId"),
  catchError,
  expressAsyncHandler(unblockUser)
)

router.get(
  "/blocklist",
  passport.authenticate("jwt", { session: false }),
  expressAsyncHandler(getBlockList)
)

router.get(
  "/getUsers",
  passport.authenticate("jwt", { session: false }),
  expressAsyncHandler(getSearchedUsers)
)

router.post(
  "/address",
  passport.authenticate("jwt", { session: false }),
  validate("address"),
  catchError,
  expressAsyncHandler(addAddress)
)

router.put(
  "/address/:id",
  passport.authenticate("jwt", { session: false }),
  validate("address:update"),
  catchError,
  expressAsyncHandler(updateAddress)
)

router.get(
  "/address",
  passport.authenticate("jwt", { session: false }),
  expressAsyncHandler(getUserAddresses)
)

router.get(
  "/trending",
  passport.authenticate("jwt", { session: false }),
  expressAsyncHandler(getTrendingUsers)
)

router.get(
  "/suggestions",
  passport.authenticate("jwt", { session: false }),
  expressAsyncHandler(getSuggestions)
)

router.post(
  "/report",
  passport.authenticate("jwt", { session: false }),
  validate('user:report'),
  catchError,
  expressAsyncHandler(reportUser)
)

router.post(
  "/switchProfile",
  passport.authenticate("jwt", { session: false }),
  catchError,
  expressAsyncHandler(switchProfile)
)

router.get(
  "/category",
  passport.authenticate("jwt", { session: false }),
  expressAsyncHandler(async (req, res) => {
    const categories = await Category.find({});
    res.send(createResponse({ categories }));
  })
)

export default router;
