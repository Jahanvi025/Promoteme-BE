import { check } from "express-validator";

export const sendMessage = [
  // Validate receiver ID
  check("to")
    .exists({ checkFalsy: true })
    .withMessage("Receiver ID is required")
    .isMongoId()
    .withMessage("Invalid Receiver ID"),

  // Validate message text
  check("message")
    .exists({ checkFalsy: true })
    .withMessage("Message text is required")
    .isString()
    .withMessage("Message text must be a string"),
]

export const getConversations = [
  check("user_id")
    .exists({ checkFalsy: true })
    .withMessage("Sender ID is required")
    .isMongoId()
    .withMessage("Invalid Sender ID"),
]