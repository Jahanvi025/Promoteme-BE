import { check } from "express-validator";

export const sendOtp = [
  check("email")
    .exists({ values: "falsy" })
    .notEmpty()
    .bail()
    .withMessage("Email is required")
    .isEmail()
    .bail()
    .withMessage("Enter valid email"),
];

export const verifyOtp = [
  check('email')
    .exists({ checkFalsy: true })
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Enter a valid email'),
  check('otp')
    .exists({ checkFalsy: true })
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 characters long and numeric')
    .isNumeric()
    .withMessage('OTP must be numeric')
];

export const ResetPassword = [
  check('newPassword')
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
    .withMessage("Enter strong password"),
  check('passwordResetToken')
    .notEmpty()
    .withMessage("Password reset token is required")
];

export const UpdatePassword = [
  check('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  check('newPassword')
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
    .withMessage("Enter strong password")
];