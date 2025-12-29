import { Request, Response } from 'express';
import { createResponse } from '../helper/response';
import createHttpError from "http-errors";
import Product from '../schema/Product';

interface ProductQuery {
    user_id?: string;
    createdAt?: {
        $gte?: Date;
        $lte?: Date;
    };
    type?: string;
    status?: string;
    name?: {
        $regex?: RegExp;
    };
}

const validateProduct = async (req: Request, productId: any) => {
    const userId = req.user?._id;
    const product = await Product.findById(productId);

    if (!product) {
        throw createHttpError(400, { message: "Product not found" });
    }
    if (product?.user_id.toString() != userId) {
        return false;
    }
    return true;
}

export const addProduct = async (req: Request, res: Response) => {
    const user_id = req.user?._id;
    const { type, ...rest } = req.body;
    const product = await Product.create({
        user_id,
        type,
        ...rest
    });
    res.send(createResponse({ product }, "Product created successfully"))
};

export const getProducts = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const fromDate = req.query.fromDate as string;
    const toDate = req.query.toDate as string;
    const postType = req.query.type as string;
    const status = req.query.status as string;
    const searchString = req.query.searchString as string;

    const skip = (page - 1) * limit;

    const query: ProductQuery = { user_id: userId };
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
    if (postType) {
        query.type = postType;
    }
    if (status) {
        query.status = status;
    }

    if (searchString) {
        query.name = { $regex: new RegExp(searchString, 'i') };
    }

    const productsQuery = Product.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });
    const totalProductsQuery = Product.countDocuments(query).exec();

    const [products, totalProducts] = await Promise.all([productsQuery.exec(), totalProductsQuery]);

    const totalPages = Math.ceil(totalProducts / limit);

    res.send(createResponse({
        products,
        page,
        totalPages,
        totalProducts
    }));
}



export const editProduct = async (req: Request, res: Response) => {
    const productId = req.params.id;
    const { name, ...rest } = req.body;
    const update = {
        ...(name && { name }),
        ...rest
    };

    const hasPermission = await validateProduct(req, productId);

    if (!hasPermission) {
        throw createHttpError(400, { message: "You dont have permission to edit this product" });
    }
    const product = await Product.findByIdAndUpdate(productId, update, { new: true });
    if (!product) {
        throw createHttpError(404, { message: 'Product not found' });
    }
    res.send(createResponse({ message: 'Product updated successfully', product }));
}

export const deleteProduct = async (req: Request, res: Response) => {
    const productId = req.params.id;
    const userId = req.user?._id;

    const hasPermission = await validateProduct(req, productId);

    if (!hasPermission) {
        throw createHttpError(400, { message: "You dont have permission to delete this product" });
    }

    const result = await Product.findByIdAndDelete({ _id: productId });

    if (!result) {
        throw createHttpError(404, { message: "Error while deleting Product!" });
    }

    res.send(createResponse({}, "Product deleted successfully"));
}

export const getProduct = async (req: Request, res: Response) => {
    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product) {
        throw createHttpError(400, { message: "Product not found for the given productId" });
    }

    res.send(createResponse({ product }))
}
