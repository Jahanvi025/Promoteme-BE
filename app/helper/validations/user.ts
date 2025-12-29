import { check } from "express-validator";
import User, { LastActiveRole, Provider } from "../../schema/User";
import createHttpError from "http-errors";
import mongoose from "mongoose";

export const userLogin = [
  check("email")
    .exists({ values: "falsy" })
    .notEmpty()
    .bail()
    .withMessage("Email is required")
    .isEmail()
    .bail()
    .withMessage("Enter valid email"),
  check("password")
    .exists({ values: "falsy" })
    .notEmpty()
    .bail()
    .withMessage("Password is required"),
];

export const userUpdate = [
  check('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean'),

  check('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address'),

  check('mobile')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit mobile number'),

  // check('category_id')
  //   .optional()
  //   .custom((value) => {
  //     if (!mongoose.Types.ObjectId.isValid(value)) {
  //       throw new Error('Category Id should be valid MongoDB ID');
  //     }
  //     return true;
  //   }),
];

export const password = check("password")
  .exists()
  .bail()
  .withMessage("Password is required")
  .notEmpty()
  .bail()
  .withMessage("Password is required")
  .isStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  .bail()
  .withMessage("Enter strong password");

export const createUser = [
  check("email")
    .exists()
    .notEmpty()
    .bail()
    .withMessage("Email is required")
    .isEmail()
    .bail()
    .withMessage("Enter valid email")
    .custom(async (value: string, { req }) => {
      const user = await User.findOne({ email: value });
      if (user) {
        throw createHttpError(400, ({ message: "Email already registered" }));
      }
      return true;
    }),
  password,
  check("mobile_number")
    .exists()
    .notEmpty()
    .withMessage("Mobile number is required")
];

export const createUserWithLink = [
  check("email")
    .exists()
    .notEmpty()
    .bail()
    .withMessage("Email is required")
    .isEmail()
    .bail()
    .withMessage("Enter valid email")
    .custom(async (value: string, { req }) => {
      const user = await User.findOne({ email: value });
      if (user) {
        throw new Error("Email already registered");
      }
      return true;
    }),

  check("role")
    .exists()
    .bail()
    .withMessage("Role is required")
    .notEmpty()
    .bail()
    .withMessage("Role is required")
    .isIn(Object.values(LastActiveRole)),
];

export const userSocialLogin = [
  check("email")
    .optional({ values: "falsy" })
    .isEmail()
    .bail()
    .withMessage("Enter valid email"),

  check("providerId")
    .custom(async (value: string, { req }) => {
      if (!value && !req?.body?.email) {
        throw createHttpError(400, { message: "Email or provider id is required for social login" });
      }
      return true;
    }),

  check("provider")
    .exists()
    .bail()
    .withMessage("Provider is required")
    .notEmpty()
    .bail()
    .withMessage("Provider is required")
    .isIn(Object.values(Provider)),
];

export const addressValidator = [
  check("firstName")
    .exists({ values: "falsy" })
    .notEmpty()
    .bail()
    .withMessage("First Name is required")
    .isString()
    .withMessage("First Name must be a string"),
  check("lastName")
    .exists({ values: "falsy" })
    .notEmpty()
    .bail()
    .withMessage("Last Name is required")
    .isString()
    .withMessage("Last Name must be a string"),
  check("state")
    .exists({ values: "falsy" })
    .notEmpty()
    .bail()
    .withMessage("State is required")
    .isString()
    .withMessage("State must be a string"),
  check("address")
    .exists({ values: "falsy" })
    .notEmpty()
    .bail()
    .withMessage("Address is required")
    .isString()
    .withMessage("Address must be a string"),
  check("zipCode")
    .exists({ values: "falsy" })
    .notEmpty()
    .bail()
    .withMessage("Zipcode is required")
    .isInt()
    .withMessage("Zipcode must be an integer"),
  check("contactNumber")
    .exists({ values: "falsy" })
    .notEmpty()
    .bail()
    .withMessage("Contact Number is required")
    .isInt()
    .withMessage("Contact Number must be an integer")
    .isLength({ min: 10, max: 10 })
    .withMessage("Contact Number must be 10 digits long"),
];

export const updateAddressValidator = [
  check("firstName")
    .optional()
    .notEmpty()
    .withMessage("First Name cannot be empty")
    .isString()
    .withMessage("First Name must be a string"),
  check("lastName")
    .optional()
    .notEmpty()
    .withMessage("Last Name cannot be empty")
    .isString()
    .withMessage("Last Name must be a string"),
  check("state")
    .optional()
    .notEmpty()
    .withMessage("State cannot be empty")
    .isString()
    .withMessage("State must be a string"),
  check("address")
    .optional()
    .notEmpty()
    .withMessage("Address cannot be empty")
    .isString()
    .withMessage("Address must be a string"),
  check("zipCode")
    .optional()
    .notEmpty()
    .withMessage("Zipcode cannot be empty")
    .isInt()
    .withMessage("Zipcode must be an integer"),
  check("contactNumber")
    .optional()
    .notEmpty()
    .withMessage("Contact Number cannot be empty")
    .isInt()
    .withMessage("Contact Number must be an integer")
    .isLength({ min: 10, max: 10 })
    .withMessage("Contact Number must be 10 digits long"),
];

export const reportUserValidator = [
  check('userId')
    .exists({ checkFalsy: true })
    .withMessage('User ID is required')
    .bail()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid User ID format'),

  check('reason')
    .exists({ checkFalsy: true })
    .withMessage('Reason is required')
    .bail()
    .isString()
    .withMessage('Reason must be a string')
    .notEmpty()
    .withMessage('Reason cannot be empty'),
];