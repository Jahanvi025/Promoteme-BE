import { type Response, type Request, type NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import {
  userLogin,
  userUpdate,
  createUser,
  createUserWithLink,
  password,
  userSocialLogin,
  addressValidator,
  updateAddressValidator,
  reportUserValidator,
} from "../helper/validations/user";
import { createComment, createPost, createReply, editPostValidation, postStatus, sendTipValidation } from "../helper/validations/post";
import { sendOtp, ResetPassword, verifyOtp, UpdatePassword } from "../helper/validations/password";
import { getConversations, sendMessage } from "../helper/validations/message";
import mongoose from "mongoose";
import { createProduct, editProduct } from "../helper/validations/product";
import { resetPassword } from "../controllers/user";
import { placeOrder, updateOrderStatus } from "../helper/validations/order";
import { addStripeAccount, cancelPayout, createPaymentValidator, createPayout } from "../helper/validations/stripe";
import { createSubscription } from "../helper/validations/subscription";
import { createCategoryValidation } from "../helper/validations/category";

export const validate = (validationName: string): any[] => {
  switch (validationName) {
    case "users:login": {
      return userLogin;
    }
    case "users:update": {
      return userUpdate;
    }
    case "users:create": {
      return createUser;
    }
    case "users:create-with-link": {
      return createUserWithLink;
    }
    case "set-new-password":
      return [password];
    case "users:social-login": {
      return userSocialLogin;
    }
    case "user:report":
      return reportUserValidator;
    case "post:create":
      return createPost;
    case "post:comment":
      return createComment
    case "post:edit":
      return editPostValidation
    case "post:tip":
      return sendTipValidation
    case "comment:reply":
      return createReply
    case "password:sendOtp":
      return sendOtp
    case "password:verifyOtp":
      return verifyOtp
    case "password:reset":
      return ResetPassword
    case "password:update":
      return UpdatePassword
    case "message:send":
      return sendMessage
    case "message:getConversations":
      return getConversations
    case "post:status":
      return postStatus
    case "product:add":
      return createProduct
    case "product:edit":
      return editProduct
    case "order:update":
      return updateOrderStatus
    case "stripe:createPayout":
      return createPayout
    case "stripe:cancelPayout":
      return cancelPayout
    case "stripe:addAccount":
      return addStripeAccount
    case "address":
      return addressValidator
    case "address:update":
      return updateAddressValidator
    case "order":
      return placeOrder
    case "subscription:create":
      return createSubscription
    case "Stripe:createPayment":
      return createPaymentValidator
    case "category:create":
      return createCategoryValidation;
    case "category:edit":
    default:
      return [];
  }
};

export const catchError = expressAsyncHandler(
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    const isError = errors.isEmpty();
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!isError) {
      const data = { errors: errors.array() };
      throw createHttpError(400, {
        message: "Validation error!",
        data,
      });
    } else {
      next();
    }
  }
);

export const validateIdParam = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, `Invalid ${paramName}`);
    }
    next();
  };
};
