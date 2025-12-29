import { check } from 'express-validator';
import { ProductStatus, ProductType } from '../../schema/Product';
import { Types } from 'mongoose';

export const createProduct = [
    check('type')
        .exists()
        .withMessage('Product type is required')
        .isIn(Object.values(ProductType))
        .withMessage('Invalid product type'),
    check('images')
        .exists()
        .withMessage('Images are required')
        .isArray({ min: 1 })
        .withMessage('Images must be an array with at least one image'),
    check('name')
        .exists()
        .withMessage('Name is required'),
    check('price')
        .exists()
        .withMessage('Price is required')
        .isNumeric()
        .withMessage('Price must be a numeric value'),
    check('stock')
        .exists()
        .withMessage('Stock is required')
        .isInt({ min: 0 })
        .withMessage('Stock must be a non-negative integer'),
    check('description')
        .optional()
        .notEmpty()
        .withMessage('Description is required'),
];

export const editProduct = [
    check('name')
        .optional()
        .notEmpty()
        .withMessage('Name cannot be empty'),

    check('price')
        .optional()
        .isNumeric()
        .withMessage('Price must be a numeric value'),

    check('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Stock must be a non-negative integer'),

    check('images')
        .optional()
        .isArray({ min: 1 })
        .withMessage('Images must be an array with at least one image'),

    check('type')
        .optional()
        .isIn(Object.values(ProductType))
        .withMessage('Invalid product type'),

    check('status')
        .optional()
        .isIn(Object.values(ProductStatus))
        .withMessage('Invalid product status'),

    check('description')
        .optional()
        .notEmpty()
        .withMessage('Description cannot be empty')
];