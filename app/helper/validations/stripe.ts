import { check } from 'express-validator';

export const createPayout = [
    check('amount')
        .exists()
        .withMessage('Amount is required'),
    check('currency')
        .exists()
        .withMessage('Currency is required')
        .isString()
        .withMessage('Currency must be a string'),
];

export const cancelPayout = [
    check('payoutId')
        .exists()
        .withMessage('Payout ID is required')
        .isString()
        .withMessage('Payout ID must be a string'),
];

export const addStripeAccount = [
    check('stripeAccountId')
        .exists()
        .withMessage('Stripe Account ID is required')
        .isString()
        .withMessage('Stripe Account ID must be a string'),
];

export const createPaymentValidator = [
    check('amount')
        .exists()
        .withMessage('Amount is required')
        .isNumeric()
        .withMessage('Amount must be a number')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),

    check('currency')
        .exists()
        .withMessage('Currency is required')
        .isString()
        .withMessage('Currency must be a string')
        .isLength({ min: 3, max: 3 })
        .withMessage('Currency must be a 3-letter code (e.g., "usd")'),

    check('paymentType')
        .exists()
        .withMessage('Payment Type is required')
        .isString()
        .withMessage('Payment Type must be a string'),

    check('ownerId')
        .exists()
        .withMessage('Owner ID is required')
        .isString()
        .withMessage('Owner ID must be a string'),

    check('redirectEndPoint')
        .exists()
        .withMessage('Redirect Endpoint is required')
];