import * as express from 'express';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { getProductsByIds } from '../utils/productsUtils';

const ordersRouter = express.Router();

ordersRouter.get('/', async (req: Request, res: Response) => {
    try {
        const ordersSnapshot = await admin.firestore().collection("Orders").get();
        const ordersPromises = ordersSnapshot.docs.map(async (doc: any) => {
            const productsOrdered = doc.data().productsOrdered;
            // Use Promise.all to wait for all getProductsByIds promises to resolve
            const products = await Promise.all(
                productsOrdered.map(async (product: any) => {
                    const productData = await getProductsByIds([product.id]);
                    return {
                        count: product.count,
                        product: productData[0],
                    };
                })
            );
            console.log(products);
            products.forEach((product: any) => {
                delete product.product.categoryPriority;
                delete product.product.productPriority;
            });
            
            // Return the complete order object with resolved products
            return {
                ...doc.data(), // spread the rest of the order data
                id: doc.id,
                productsOrdered: products, // this now contains actual product data
            };

        });
        // Use Promise.all to wait for all order promises to resolve
        const orders = await Promise.all(ordersPromises);
        res.json(orders);
    } catch (error) {
        res.status(500).send("Error fetching orders: " + error);
    }
});

ordersRouter.put('/', async (req: Request, res: Response) => {
    try {
        const order = req.body;
        order.orderTime = new Date();
        const newOrder = await admin.firestore().collection("Orders").add(order);
        res.json({ id: newOrder.id });
    } catch (error) {
        console.log(error);
        res.status(500).send("Error adding order: " + error);
    }
});