import { Request, Response } from 'express';
import Stripe from 'stripe';
import createHttpError from 'http-errors';
import { createResponse } from '../helper/response';
import User from '../schema/User';
import mongoose, { Types } from 'mongoose';
import Payment from '../schema/Payment';
import cardValidator from "card-validator";
import PaymentCard from '../schema/PaymentCard';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

interface PaymentQuery {
    user_id: Types.ObjectId;
    createdAt?: { $gte?: Date; $lte?: Date };
    status?: string;
    description?: { $regex: RegExp };
}

export const createPaymentIntent = async (req: Request, res: Response) => {
    const { amount, currency, paymentType, ownerId, redirectEndPoint, quantity, postId, subscriptionType } = req.body;
    const userId = req.user?._id;

    const applicationFeePercentage = 0.1;
    const applicationFeeAmount = Math.floor(amount * applicationFeePercentage);

    if (!userId) {
        throw createHttpError({ message: 'User not found.' });
    }

    const creator = await User.findById(ownerId)

    if (!creator?.stripeAccount_id) {
        throw createHttpError({ message: 'Connected account not found.' });
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency,
                    product_data: {
                        name: paymentType,
                    },
                    unit_amount: amount * 100,
                },
                quantity: quantity,
            },
        ],
        mode: 'payment',
        // success_url: `https://marketplace.valuegivr.com/${redirectEndPoint}?success=true`,
        success_url: `https://marketplace.valuegivr.com/${redirectEndPoint}?success=true`,
        cancel_url: `https://marketplace.valuegivr.com/${redirectEndPoint}?canceled=false`,
        payment_intent_data: {
            application_fee_amount: applicationFeeAmount,
            transfer_data: {
                destination: creator.stripeAccount_id,
            },
            metadata: {
                description: "This is a Valuegivr payment with Stripe",
                type: paymentType
            },
        },
        metadata:{
            userId,
            amount,
            paymentType,
            creatorId: ownerId,
            quantity,
            postId,
            subscriptionType
        }
    });
    res.send(createResponse({ id: session.id }));
}

export const saveBankDetail = async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const { firstName, lastName, accountNumber, bankRouting, bankName, city, address, bankSwiftCode, country, state, currency } = req.body;

    const user = await User.findById(userId);

    if (!user?.stripeAccount_id) {
        throw createHttpError(400, { message: 'Stripe account not found for the user' });
    }

    const token = await stripe.tokens.create({
        bank_account: {
            country: country,
            currency: currency,
            account_holder_name: firstName + ' ' + lastName,
            account_number: accountNumber,
            routing_number: bankRouting,
        },
    });

    const bankAccount = await stripe.accounts.createExternalAccount(
        user.stripeAccount_id,
        {
            external_account: token.id,
            metadata: {
                bank_name: bankName,
                city: city,
                address: address,
                swift_code: bankSwiftCode,
                state: state,
            },
        }
    );

    res.send(createResponse({
        success: true,
        account: bankAccount
    }));
}

export const createConnectAccount = async (req: Request, res: Response) => {
    const userEmail = req.user?.email;
    if (!userEmail) {
        throw createHttpError(400, 'User email is required');
    }

    const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: userEmail,
        capabilities: {
            card_payments: {
                requested: true,
            },
            transfers: {
                requested: true,
            },
        },
    });

    const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: 'https://marketplace.valuegivr.com/connect-account',
        return_url: `https://marketplace.valuegivr.com/feed?account=${account.id}&status=complete`,
        type: 'account_onboarding',
    });

    res.send(createResponse({
        url: accountLink.url,
    }));
    return;

};

export const addCustomer = async (req: Request, res: Response) => {
    const { email, name, payment_method } = req.body;

    const customer = await stripe.customers.create({
        email: email,
        name: name,
        payment_method: payment_method,
        invoice_settings: {
            default_payment_method: payment_method,
        },
    });
    res.send(createResponse({ customer }));
}

export const createPayout = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    let { amount, currency } = req.body;

    const user = await User.findById(userId);

    if (!user?.stripeAccount_id) {
        throw createHttpError(400, { message: 'Stripe account not found for the user' });
    }

    const balance = await stripe.balance.retrieve({
        stripeAccount: user?.stripeAccount_id,
    });

    if (!balance) {
        throw createHttpError(400, { message: 'Error occurred while fetching balance' });
    }

    console.log('Balance:', balance);

    const availableBalance = balance.available.find((b) => b.currency.toLowerCase() === currency.toLowerCase());

    console.log('Currency requested:', currency);
    console.log('Available balance for the currency:', availableBalance);

    if (!availableBalance || availableBalance.amount < amount) {
        throw createHttpError(400, { message: 'Insufficient funds in the connected account' });
    }

    const payout = await stripe.payouts.create(
        {
            amount: amount,
            currency: currency,
        },
        {
            stripeAccount: user?.stripeAccount_id,
        }
    );

    res.send(createResponse({ payout }));
};


export const getEarnings = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { starting_after, limit = 10 } = req.query;

    const parsedLimit = Math.min(parseInt(limit as string, 10), 100);

    const user = await User.findById(userId);
    if (!user?.stripeAccount_id) {
        throw createHttpError(400, { message: 'Stripe account not found for the user' });
    }

    const balanceTransactions = await stripe.balanceTransactions.list({
        limit: parsedLimit,
        starting_after: starting_after as string,
    }, {
        stripeAccount: user?.stripeAccount_id,
    });

    res.send(createResponse(balanceTransactions));
}

export const getPayoutHistory = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { starting_after, limit = 10 } = req.query;

    const parsedLimit = Math.min(parseInt(limit as string, 10), 100);

    const user = await User.findById(userId);

    if (!user?.stripeAccount_id) {
        throw createHttpError(400, { message: 'Stripe account not found for the user' });
    }
    const payouts = await stripe.payouts.list({
        limit: parsedLimit,
        starting_after: starting_after as string,
    }, {
        stripeAccount: user?.stripeAccount_id,
    });
    res.send(createResponse({ payouts }));
}

export const cancelPayout = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { payoutId } = req.body;

    const user = await User.findById(userId);

    if (!user?.stripeAccount_id) {
        throw createHttpError(400, { message: 'Stripe account not found for the user' });
    }

    const canceledPayout = await stripe.payouts.cancel(
        payoutId,
        {
            stripeAccount: user?.stripeAccount_id,
        }
    );
    res.send(createResponse({ canceledPayout }));
}

export const addStripeAccount = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { stripeAccountId } = req.body;

    const updatedUser = await User.findOneAndUpdate(
        { _id: userId },
        { $set: { stripeAccount_id: stripeAccountId } },
        { new: true }
    );

    if (!updatedUser) {
        throw createHttpError(404, "User not found or already has a Stripe account");
    }

    res.send(createResponse({ message: "Stripe account added successfully!" }));
}

export const getPaymentHistory = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const fromDate = req.query.fromDate as string;
    const toDate = req.query.toDate as string;
    const status = req.query.status as string;
    const searchString = req.query.searchString as string;

    const skip = (page - 1) * limit;

    const query: PaymentQuery = { user_id: new mongoose.Types.ObjectId(userId) };

    if (fromDate && toDate) {
        const fromDateObj = new Date(fromDate);
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: fromDateObj, $lte: toDateObj };
    } else if (toDate) {
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999);
        query.createdAt = { $lte: toDateObj };
    } else if (fromDate) {
        const fromDateObj = new Date(fromDate);
        query.createdAt = { $gte: fromDateObj };
    }

    if (status) {
        query.status = status;
    }

    if (searchString) {
        query.description = { $regex: new RegExp(searchString, 'i') };
    }

    const paymentsQuery = Payment.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
    const totalPaymentsQuery = Payment.countDocuments(query).exec();

    const [payments, totalPayments] = await Promise.all([
        paymentsQuery.exec(),
        totalPaymentsQuery
    ]);

    const totalPages = Math.ceil(totalPayments / limit);

    res.send(createResponse({
        payments,
        page,
        totalPages,
        totalPayments
    }));
};

export const addCard = async (req: Request, res: Response) => {
    const { name, number, expiryDate, CVV, isDefault } = req.body;
    const userId = req.user?._id;
    const { card } = cardValidator.number(number);
    const cardType = card?.type || 'Unknown';

    const existingCard = await PaymentCard.findOne({ user_id: userId, number });
    if (existingCard) {
        throw createHttpError({ message: "Card with this number already exists." });
    }

    const paymentCard = new PaymentCard({
        user_id: userId,
        name,
        number,
        expiryDate,
        CVV,
        type: cardType,
        isDefault: isDefault
    });

    const savedCard = await paymentCard.save();
    res.send(createResponse({ message: "card saved successfully", card: savedCard }));
};

export const getCards = async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const cards = await PaymentCard.find({ user_id: userId });

    if (!cards) {
        throw createHttpError({ message: 'No payment cards found' });
    }

    res.send(createResponse({ cards }));
};

export const deleteCard = async (req: Request, res: Response) => {
    const cardId = req.params.id;

    if (!cardId) {
        throw createHttpError({ message: "Card ID is required" });
    }

    const result = await PaymentCard.findByIdAndDelete(cardId);

    if (!result) {
        throw createHttpError({ message: "Card not found" });
    }

    res.send(createResponse({ message: "Card deleted successfully" }));
}

export const getBalance = async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
        throw createHttpError(400, 'User ID is missing.');
    }

    const creator = await User.findById(userId);

    if (!creator?.stripeAccount_id) {
        throw createHttpError(404, 'Connected account not found.');
    }

    const connectedAccountId = creator.stripeAccount_id;

    const balance = await stripe.balance.retrieve({}, {
        stripeAccount: connectedAccountId,
    });
    if (!balance || !balance.available) {
        throw createHttpError(404, 'No balance available for this account.');
    }

    res.send({
        success: true,
        balance: balance.available,
    });
};

