import { Request, Response } from "express";
import Category from "../schema/Category";
import { createResponse } from "../helper/response";
import createHttpError from "http-errors";

export const createCategory = async (req: Request, res: Response) => {
    const { name } = req.body;

    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
        throw createHttpError({ message: "Category with same name already exists." });
    }

    const category = new Category({ name });
    await category.save();

    res.send(createResponse({ message: "Category created successfully.", category }));
};

export const updateCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;

    const existingCategory = await Category.findById(id);

    if (!existingCategory) {
        throw createHttpError(404, "Category not found.");
    }

    const categoryWithSameName = await Category.findOne({ name });

    if (categoryWithSameName && categoryWithSameName._id.toString() !== id) {
        throw createHttpError(400, "Category with the same name already exists.");
    }

    existingCategory.name = name;
    await existingCategory.save();

    res.send(createResponse({ message: "Category updated successfully.", category: existingCategory }));
};

export const deleteCategory = async (req: Request, res: Response) => {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
        throw createHttpError(404, "Category not found.");
    }

    await Category.findByIdAndDelete(id);

    res.send(createResponse({ message: "Category deleted successfully." }));
};