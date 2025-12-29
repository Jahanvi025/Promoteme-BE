import { check } from 'express-validator';

export const createSubscription = [
    check('creatorId')
        .exists()
        .withMessage('Creator ID is required')
        .isMongoId()
        .withMessage('Creator ID must be a valid MongoDB ObjectId'),
    check('type')
        .exists()
        .withMessage('Subscription type is required')
        .isIn(['MONTHLY', 'YEARLY'])
        .withMessage('Subscription type must be either "MONTHLY" or "YEARLY"'),
    check('paymentMethod')
        .exists()
        .withMessage('Payment method is required')
        .isString()
        .withMessage('Payment method must be a string')
];
