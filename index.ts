import express, { type Express, type Request, type Response } from "express";
import bodyParser from "body-parser";
import morgan from "morgan";
import http from "http";

import errorHandler from "./app/middleware/errorHandler";
import { initDB } from "./app/services/initDB";
import usersRoutes from "./app/routes/users";
import postsRoutes from "./app/routes/post";
import adminRoutes from "./app/routes/admin";
import productRoutes from "./app/routes/product";
import ConversationRoutes from "./app/routes/conversation";
import CommentRoutes from "./app/routes/comment";
import PaymentRoutes from "./app/routes/payment";
import OrderRoutes from "./app/routes/order";
import SubscriptionRoutes from "./app/routes/subscription";
import WalletRoutes from "./app/routes/wallet";
import CategoryRoutes from "./app/routes/category";
import { initPassport } from "./app/services/passport-jwt";
import { loadConfig } from "./app/helper/config";
import { roleAuth } from "./app/middleware/roleAuth";
import { LastActiveRole } from "./app/schema/User";
import { IUser } from "./app/schema/User";
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { mergeSwaggerFiles } from "./mergeSwagger";
import socketHandler from "./app/services/socketHandler";
import webhookHandler from "./app/services/webHookHandler";

loadConfig();

declare global {
  namespace Express {
    interface User extends Omit<IUser, "password"> { }
    interface Request {
      user?: User;
    }
  }
}

const port = Number(process.env.PORT) ?? 5000;

const app: Express = express();
const router = express.Router();


app.use(cors());

app.use('/api/webhook', webhookHandler);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(morgan("dev"));

const initApp = async (): Promise<void> => {
  await initDB();

  initPassport();

  app.use("/api", router);

  const mergedSwagger = mergeSwaggerFiles();

  router.use('/docs', swaggerUi.serve, swaggerUi.setup(mergedSwagger));

  app.get("/", (req: Request, res: Response) => {
    res.send({ status: "ok" });
  });

  router.use("/users", usersRoutes);
  router.use("/admin", adminRoutes);
  router.use("/posts", postsRoutes);
  router.use("/conversations", ConversationRoutes);
  router.use("/products", productRoutes);
  router.use("/comments", CommentRoutes);
  router.use("/orders", OrderRoutes);
  router.use("/payments", PaymentRoutes);
  router.use("/subscription", SubscriptionRoutes);
  router.use("/wallet", WalletRoutes);
  router.use("/categories", CategoryRoutes);
  // error handler
  app.use(errorHandler);
  const server = http
    .createServer(app)
    .listen(port, () => console.log("Server is running on port", port));

  socketHandler(server);
};

void initApp();
