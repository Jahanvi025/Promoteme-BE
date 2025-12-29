import { check } from "express-validator";
import { OrderStatus } from "../../schema/OrderHistory";

export const updateOrderStatus = [
    check('status')
        .exists({ checkFalsy: true })
        .withMessage('Status is required')
        .isIn(Object.values(OrderStatus))
        .withMessage('Invalid order status'),
];

export const placeOrder = [
    check('product_id')
        .exists({ checkFalsy: true })
        .withMessage('Product ID is required')
        .isArray({ min: 1 })
        .withMessage('Product IDs should be an array with at least one ID'),

    check('quantity')
        .exists({ checkFalsy: true })
        .withMessage('Quantity is required')
        .isInt({ gt: 0 })
        .withMessage('Quantity must be a positive integer'),

    check('address_id')
        .exists({ checkFalsy: true })
        .withMessage('Address ID is required')
        .isMongoId()
        .withMessage('Invalid Address ID'),
];