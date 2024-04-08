import * as express from 'express';
import * as cors from 'cors';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { validateProductFormat } from './utils-functions';
import { findProductById } from './utils-functions';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Express
const app = express();
app.use(express.json());

// Apply CORS middleware.
const corsOptions = { origin: 'localhost:5173' }; // Update with your frontend URL
app.use(cors(corsOptions));

// Define the '/products' route
app.get('/products', async (req: Request, res: Response) => {
    try {
        const productsSnapshot = await admin.firestore().collection("Products").get();
        const products = productsSnapshot.docs.map(doc => {
            const product = {
                id: doc.id,
                ...doc.data()
            };
            if (!validateProductFormat(product)) {
                res.status(400).send("Invalid product format");
                return;
            } else {
                return product;
            }
        });

        res.json(products);
    } catch (error) {
        res.status(500).send("Error fetching products: " + error);
    }
});

app.post('/add-product', async (req: Request, res: Response) => {
    console.log(req.body);
    try {
        const product = req.body;

        if (!validateProductFormat(product)) {
            res.status(400).send("Invalid product format");
            return;
        }

        const newProduct = await admin.firestore().collection("Products").add(product);

        res.json({ id: newProduct.id });
    } catch (error) {
        res.status(500).send("Error adding product: " + error);
    }
});

app.post('/add-order', async (req: Request, res: Response) => {
    console.log(req.body);
    try {
        const order = req.body;
        const newOrder = await admin.firestore().collection("Orders").add(order);
        res.json({ id: newOrder.id });
    } catch (error) {
        res.status(500).send("Error adding order: " + error);
    }
});

app.get('/orders', async (req: Request, res: Response) => {
    try {
        const ordersSnapshot = await admin.firestore().collection("Orders").get();
        const ordersPromises = ordersSnapshot.docs.map(async (doc: any) => {
            const productsOrdered = doc.data().productsOrdered;
            // Use Promise.all to wait for all findProductById promises to resolve
            const products = await Promise.all(
                productsOrdered.map((product: any) => findProductById(product.id))
            );
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


// Export the Express app as a Firebase Cloud Function
export const api = onRequest(app);
