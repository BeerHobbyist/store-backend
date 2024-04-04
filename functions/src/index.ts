import { onRequest } from "firebase-functions/v2/https";
import * as cors from "cors";
import * as admin from "firebase-admin";

admin.initializeApp();

const corsHandler = cors({ origin: 'http://localhost:5173' });  // Update with your frontend URL

export const getProducts = onRequest((request, response) => {
    corsHandler(request, response, async () => {
        try {
            const productsSnapshot = await admin.firestore().collection('Products').get();
            const products = productsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            response.json(products);
        } catch (error) {
            response.status(500).send("Error fetching products: " + error);
        }
    });
});
