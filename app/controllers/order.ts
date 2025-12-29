import { Request, Response } from 'express';
import { createResponse } from '../helper/response';
import createHttpError from "http-errors";
import OrderHistory, { IOrderHistory } from '../schema/OrderHistory';
import Product, { IProduct } from '../schema/Product';

export const orderHistory = async (req: Request, res: Response) => {
    const userId = req.user?._id || "";
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const fromDate = req.query.fromDate as string;
    const toDate = req.query.toDate as string;
    const status = req.query.status as string;
    const role = req.user?.lastActiveRole;

    const query = role === "CREATOR" ? { owner_id: userId } : { ordered_by: userId };

    if (fromDate && toDate) {
        const fromDateObj = new Date(fromDate);
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999);
        Object.assign(query, { createdAt: { $gte: fromDateObj, $lte: toDateObj } });
    }

    if (status) {
        Object.assign(query, { status });
    }

    const totalOrders = await OrderHistory.countDocuments(query);

    const orderHistory = await OrderHistory.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
            path: 'product_id',
            model: 'product',
            select: 'name price images description type'
        })
        .populate({
            path: 'ordered_by',
            select: 'displayName profile_picture email'
        })
        .populate({
            path: 'address_id',
        })
        .exec();

    res.send(createResponse({
        page: page,
        limit: limit,
        count: totalOrders,
        orderHistory: orderHistory,
    }));
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    const orderId = req.params.id;
    const { status } = req.body;
    const userId = req.user?._id;

    const Order = await OrderHistory.findById(orderId);
    if (!Order) {
        throw createHttpError(400, { message: 'Order not found' });
    }

    const product = await Product.findById(Order.product_id);
    if (!product) {
        throw createHttpError(400, { message: 'Product not found' });
    }

    if (product.user_id.toString() !== userId?.toString()) {
        throw createHttpError(401, { message: 'Unauthorized to update this order' });
    }

    Order.status = status;
    await Order.save();

    res.send(createResponse({ order: Order }, 'Order status updated successfully'));
};

export const placeOrder = async (req: Request, res: Response) => {
    const { product_id, ...rest } = req.body;
    const ordered_by = req.user?._id;

    const product = await Product.findById(product_id) as IProduct | null;
    if (!product) {
        throw createHttpError({ message: 'Product not found' });
    }
    const orderData: IOrderHistory = {
        product_id: product._id,
        owner_id: product.user_id,
        ordered_by,
        ...rest
    };

    const order = new OrderHistory(orderData);
    await order.save();
    res.send(createResponse({ message: 'Order placed successfully', order }));
};