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
const corsOptions = { origin: true }; // Update with your frontend URL
app.use(cors(corsOptions));

app.get('/products', async (req: Request, res: Response) => {
    try {
        const productsSnapshot = await admin.firestore().collection("Products").get();
        const productsPromises = productsSnapshot.docs.map(async doc => {
            const categories = doc.data().category;
            let categoriesData = await Promise.all(
                categories.map(async (category: any) => {
                    const categoryDoc = await admin.firestore().collection("Categories").doc(category.name).get();
                    return { name: categoryDoc.id, ...categoryDoc.data(), productPriority: category.priority };
                })
            );
            let products = [] as any[];
            categoriesData.forEach((category: any) => {
                products.push({
                    id: doc.id,
                    name: doc.data().name,
                    packageType: doc.data().packageType,
                    price: doc.data().price,
                    imageUrl: doc.data().imageUrl,
                    category: category.name,
                    categoryPriority: category.priority,
                    productPriority: category.productPriority
                });
            });
            return products;
        });
        const products = (await Promise.all(productsPromises)).flat();

        const categoryGroups: Record<string, {priority: number, products: any[]}> = {};
        products.forEach(product => {
            const category = product.category;
            if (!categoryGroups[category]) {
                categoryGroups[category] = { priority: product.categoryPriority, products: [] };
            }
            categoryGroups[category].products.push(product);
        });

        // Sort products by category priority
        const categoryGroupsArray = Object.entries(categoryGroups);
        categoryGroupsArray.sort((a, b) => b[1].priority - a[1].priority);
        categoryGroupsArray.forEach(([category, data]) => {
            data.products.sort((a: any, b: any) => b.productPriority - a.productPriority);
        });

        let sortedProducts = [] as any[];
        categoryGroupsArray.forEach(([category, data]) => {
            sortedProducts = sortedProducts.concat(data.products);
        });

        sortedProducts.forEach((product: any) => {
            delete product.categoryPriority;
            delete product.productPriority;
        });

        res.json(sortedProducts);
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
        order.orderTime = new Date();
        const newOrder = await admin.firestore().collection("Orders").add(order);
        res.json({ id: newOrder.id });
    } catch (error) {
        console.log(error);
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
                productsOrdered.map(async (product: any) => {
                    return {
                        count: product.count,
                        product: await findProductById(product.id)
                    }
                })
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
