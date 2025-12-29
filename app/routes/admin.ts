import express from "express";
import { adminAuth } from "../middleware/adminAuth";
import expressAsyncHandler from "express-async-handler";
import { blockUser, getDashboardData, getReports, usersList } from "../controllers/admin";
import { validateIdParam } from "../middleware/validation";

const router = express.Router();

router.get(
    '/reports',
    adminAuth,
    expressAsyncHandler(getReports)
)

router.post(
    '/:id/block',
    adminAuth,
    validateIdParam("id"),
    expressAsyncHandler(blockUser)
)

router.get(
    "/users",
    adminAuth,
    expressAsyncHandler(usersList)
)

router.get(
    "/dashboard",
    adminAuth,
    expressAsyncHandler(getDashboardData)
)

export default router;
