import * as express from 'express';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { getProductsByIds } from '../utils/productsUtils';

export const customerRouter = express.Router();

// Function to sort and structure products
function sortAndStructureProducts(products: Product[]): Product[] {
    const categoryGroups: Record<string, CategoryGroup> = {};
    products.forEach(product => {
        const category = product.category;
        if (!categoryGroups[category]) {
            categoryGroups[category] = { priority: product.categoryPriority, products: [] };
        }
        categoryGroups[category].products.push(product);
    });

    const categoryGroupsArray = Object.entries(categoryGroups);
    categoryGroupsArray.sort((a, b) => b[1].priority - a[1].priority);
    categoryGroupsArray.forEach(([category, data]) => {
        data.products.sort((a, b) => b.productPriority - a.productPriority);
    });

    let sortedProducts: Product[] = [];
    categoryGroupsArray.forEach(([category, data]) => {
        sortedProducts = sortedProducts.concat(data.products);
    });

    sortedProducts.forEach((product: any) => {
        delete product.categoryPriority;
        delete product.productPriority;
    });

    return sortedProducts;
}

// Express route to fetch all products
customerRouter.get('/products', async (req: Request, res: Response) => {
    try {
        const productsSnapshot = await admin.firestore().collection("Products").get();
        const allProductIds = productsSnapshot.docs.map((doc: any) => doc.id);
        const products = await getProductsByIds(allProductIds);
        const sortedProducts = sortAndStructureProducts(products);
        res.json(sortedProducts);
    } catch (error) {
        res.status(500).send("Error fetching products: " + error);
    }
});

customerRouter.put('/orders', async (req: Request, res: Response) => {
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

