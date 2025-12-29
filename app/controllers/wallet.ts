import { Request, Response } from 'express';
import Stripe from 'stripe';
import createHttpError from 'http-errors';
import { createResponse } from '../helper/response';
import User from '../schema/User';
import Wallet from '../schema/Wallet';
import Transaction from '../schema/Transaction';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

interface TransactionQuery {
    user_id?: string;
    createdAt?: {
        $gte?: Date;
        $lte?: Date;
    };
    type?: string;
    description?: {
        $regex?: RegExp;
    };
}

export const depositAmount = async (req: Request, res: Response) => {
    const { amount } = req.body;
    const userId = req.user?._id;

    const user = await User.findById(userId);
    if (!user) {
        throw createHttpError({ error: 'User not found' });
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: 'Wallet Deposit',
                },
                unit_amount: amount * 100,
            },
            quantity: 1,
        }],
        mode: 'payment',
        // success_url: 'https://marketplace.valuegivr.com/wallet?success=true',
        success_url: 'http://localhost:5173/wallet?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://marketplace.valuegivr.com/wallet',
        metadata: {
            userId: user._id.toString(),
            amount: amount.toString(),
            paymentType: 'walletDeposit',
        },
    });

    res.send(createResponse({ id: session.id }));
}

export const getWalletBalance = async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
        throw createHttpError(401, 'User not authenticated');
    }

    const wallet = await Wallet.findOne({ user_id: userId });

    res.send(createResponse({ balance: wallet ? wallet.balance : 0 }));
}

export const transferFunds = async (req: Request, res: Response) => {
    const { amount, creatorId, description } = req.body;
    const userId = req.user?._id;

    if (!userId) {
        throw createHttpError(401, 'User not authenticated');
    }

    if (!creatorId) {
        throw createHttpError(400, 'Creator ID is required');
    }
    const creator = await User.findById(creatorId);
    if (!creator) {
        throw createHttpError(404, 'Creator not found');
    }

    if (!creator.stripeAccount_id) {
        throw createHttpError(400, 'Creator does not have a Stripe account ID');
    }

    const wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) {
        throw createHttpError(404, 'Wallet not found');
    }

    if (wallet.balance < amount) {
        throw createHttpError(400, 'Insufficient funds');
    }

    const transfer = await stripe.transfers.create({
        amount: amount * 100,
        currency: 'usd',
        destination: creator.stripeAccount_id,
        description: 'Transfer from main account to connected account',
    });

    wallet.balance -= amount;
    await wallet.save();

    await Transaction.create({
        user_id: userId,
        type: 'PAYMENT',
        amount,
        status: 'COMPLETED',
        wallet_id: wallet._id,
        description: description,
        paidTo: creator._id,
    });

    res.send(createResponse({ message: 'Fund transferred successfully', transferId: transfer.id }));
}

export const getTransactions = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;

    const skip = (page - 1) * limit;

    const query: TransactionQuery = { user_id: userId };

    const fromDate = req.query.fromDate as string;
    const toDate = req.query.toDate as string;
    const transactionType = req.query.type as string;

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
    if (transactionType) {
        query.type = transactionType;
    }

    const transactionsQuery = Transaction.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate({
            path: 'paidTo',
            select: 'displayName profile_picture'
        });;

    const totalTransactionsQuery = Transaction.countDocuments(query);

    const [transactions, totalTransactions] = await Promise.all([
        transactionsQuery.exec(),
        totalTransactionsQuery.exec(),
    ]);

    const totalPages = Math.ceil(totalTransactions / limit);

    res.send(createResponse({
        transactions,
        page,
        totalPages,
        totalTransactions,
    }));
};

