import { check } from "express-validator";

export const createCategoryValidation = [
    check("name")
        .exists({ checkFalsy: true })
        .withMessage("category name is required")
        .isString()
        .withMessage("category name should be a valid string"),
]
