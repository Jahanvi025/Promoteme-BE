import jwt from "jsonwebtoken";
import { type NextFunction, type Request, type Response } from "express";
import expressAsyncHandler from "express-async-handler";
import createHttpError from "http-errors";
import process from "process";

export const proxyAuth = (
): any =>
  expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        let token: any = req.headers["proxy-access-token"];

        token = token?.replace('Bearer ', '')

        if (!token) {
          throw createHttpError(401, {
            message: `Invalid access token`,
          });
        }

        const decodedUser: any = jwt.verify(token!, process.env.JWT_SECRET!);
        if (!["gateway", "user"].includes(decodedUser?.issued_by) || decodedUser?.issued_for != "marketplace") {
          throw createHttpError(401, { message: "User not authenticated" });
        }
        next();
      } catch (error: any) {
        throw createHttpError(401, { message: "Invalid access token" });
      }
    }
  );