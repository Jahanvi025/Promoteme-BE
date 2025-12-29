import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import Wallet from '../schema/Wallet';
import Transaction from '../schema/Transaction';
import Post from '../schema/Post';
import Payment from '../schema/Payment';
import mongoose, { Types } from 'mongoose';
import Subscription from '../schema/Subscription';
import User from '../schema/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_95457b6218a70481ba37341f383ed0c50cee5ae3f354112129a5527ce0e2d596";

const webhookHandler = express.Router();

webhookHandler.post('/', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
   try {


     const sig = req.headers['stripe-signature'] || "";

     console.log("WEBHOOOK CALLED")
     let event;

     try {
       event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

       console.log('Received Stripe webhook:', event?.type);
       console.log(event)
     } catch (err: any) {
       console.error(`⚠️ Webhook signature verification failed: ${err?.message}`);
       return res.status(400).send(`Webhook Error: ${err.message}`);
     }

     if (event.type === 'checkout.session.completed') {
       const session = event.data.object as Stripe.Checkout.Session;
       if (!session.metadata || !session.metadata.userId) {
         console.error('Missing metadata in session:', session);
         return res.status(400).json({ error: 'Missing metadata' });
       }
       const userId = session.metadata?.userId;
       const amount = parseInt(session.metadata?.amount || '0');
       const paymentType = session.metadata?.paymentType;
       const postId = session.metadata?.postId;
       const subscriptionType = session.metadata?.subscriptionType

       console.log('Webhook called for',paymentType)
       if (!userId || !amount || !paymentType) {
         console.error('Missing metadata in session:', session);
         return res.status(400).send('Missing metadata');
       }
       try {
         if (paymentType === 'walletDeposit') {
           let wallet = await Wallet.findOne({ user_id: userId });
           if (!wallet) {
             wallet = await Wallet.create({ user_id: userId, balance: amount });
           } else {
             wallet.balance += amount;
             await wallet.save();
           }
           await Transaction.create({
             user_id: userId,
             type: 'DEPOSIT',
             amount,
             status: 'COMPLETED',
             wallet_id: wallet._id,
             paidTo: userId
           });
         } else if (paymentType === 'postPurchase') {
           const post = await Post.findById(postId);
           if (!post) {
             throw new Error('Post not found');
           }

           const hasPurchased = post.purchasedBy.some(
             (user) => user.toString() === userId?.toString()
           );

           if (!hasPurchased) {
             post.purchasedBy.push(new mongoose.Types.ObjectId(userId));
             await post.save();
           }

           const paymentData = {
             user_id: new mongoose.Types.ObjectId(userId),
             status: 'DONE',
             paidTo: post.user_id,
             type: 'Post Purchase',
             paymentMethod: 'Stripe',
             amount: amount,
           };

           const payment = new Payment(paymentData);
           await payment.save();
         } else if (paymentType === 'Subscription') {
           const { creatorId } = session.metadata || {};

           const [currentUser, creator] = await Promise.all([
             User.findById(userId).select('isFan'),
             User.findById(creatorId)
           ]);

           if (!currentUser || !creator) {
             throw new Error("User or creator not found");
           }

           if (!currentUser.isFan) {
             throw new Error("Only fans can subscribe");
           }

           if (!creator.isCreator) {
             throw new Error("You can subscribe to a creator only");
           }

           const startDate = new Date();
           const expiryDate = new Date(startDate);

           if (subscriptionType === 'MONTHLY') {
             expiryDate.setMonth(startDate.getMonth() + 1);
           } else if (subscriptionType === 'YEARLY') {
             expiryDate.setFullYear(startDate.getFullYear() + 1);
           } else {
             throw new Error("Invalid subscription type");
           }

           const existingSubscription = await Subscription.findOne({
             user_id: userId,
             subscribedTo: creatorId
           }).exec();

           if (existingSubscription?.status === 'EXPIRED') {
             await Subscription.findByIdAndUpdate(existingSubscription._id, {
               status: 'ACTIVE',
               startDate,
               expiryDate
             }).exec();
           } else if (existingSubscription?.status === 'ACTIVE') {
             throw new Error("Already subscribed to this creator");
           } else {
             const newSubscription = new Subscription({
               user_id: userId,
               subscribedTo: creatorId,
               type: subscriptionType,
               startDate,
               expiryDate,
               paymentMethod: 'Stripe',
               status: 'ACTIVE'
             });

             await newSubscription.save();
           }

           const paymentData = {
             user_id: new mongoose.Types.ObjectId(userId),
             status: 'DONE',
             paidTo: new mongoose.Types.ObjectId(creatorId),
             type: `${subscriptionType} Subscription`,
             paymentMethod: "Stripe",
             amount: subscriptionType === "YEARLY" ? creator.yearly_Price : creator?.monthly_Price,
           };

           const payment = new Payment(paymentData);
           await payment.save();

           console.log('Subscription Completed');
         }
         res.status(200).send({ received: true });
       } catch (error) {
         console.error('Error handling checkout session completion:', error);
         return res.status(500).send('Internal Server Error');
       }
     } else {
       res.status(200).send({ received: true });
     }
   }catch (err){
      console.error('Error processing webhook:', err);
      res.status(500).send('Internal Server Error');
   }

});

export default webhookHandler;
