import * as express from 'express';
import * as cors from 'cors';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { onRequest } from 'firebase-functions/v2/https';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Express
const app = express();

// Apply CORS middleware.
const corsOptions = { origin: "http://localhost:5173" }; // Update with your frontend URL
app.use(cors(corsOptions));

// Define the '/products' route
app.get('/products', async (req: Request, res: Response) => {
    try {
        const productsSnapshot = await admin.firestore().collection("Products").get();
        const products = productsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(products);
    } catch (error) {
        res.status(500).send("Error fetching products: " + error);
    }
});

// Export the Express app as a Firebase Cloud Function
export const api = onRequest(app);
