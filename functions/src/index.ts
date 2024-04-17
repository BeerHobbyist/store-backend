import * as express from 'express';
import * as cors from 'cors';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { onRequest } from 'firebase-functions/v2/https';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Express
const app = express();
app.use(express.json());

// Apply CORS middleware.
const corsOptions = { origin: true }; // Update with your frontend URL
app.use(cors(corsOptions));

interface Category {
    name: string;
    priority: number;
}

interface CategoryData extends Category {
    productPriority: number;
}

interface Product {
    id: string;
    name: string;
    packageType: string;
    price: number;
    imageUrl: string;
    category: string;
    categoryPriority: number;
    productPriority: number;
}

interface CategoryGroup {
    priority: number;
    products: Product[];
}

// Utility function to fetch products by IDs
async function getProductsByIds(productIds: string[]): Promise<Product[]> {
    const productsPromises = productIds.map(async (productId): Promise<Product[]> => {
        const productDoc = await admin.firestore().collection("Products").doc(productId).get();
        if (!productDoc.exists) {
            throw new Error(`No product found with ID: ${productId}`);
        }
        const productData = productDoc.data()!;
        const categories = productData.category as Category[];
        const categoriesData = await Promise.all(
            categories.map(async (category): Promise<CategoryData> => {
                const categoryDoc = await admin.firestore().collection("Categories").doc(category.name).get();
                const categoryData = categoryDoc.data()!;
                return { ...categoryData, name: categoryDoc.id, productPriority: category.priority } as CategoryData;
            })
        );
        return processProductData(productDoc.id, productData, categoriesData);
    });
    return (await Promise.all(productsPromises)).flat();
}

// Function to process product data
function processProductData(productId: string, productData: any, categoriesData: CategoryData[]): Product[] {
    return categoriesData.map(category => ({
        id: productId,
        name: productData.name,
        packageType: productData.packageType,
        price: productData.price,
        imageUrl: productData.imageUrl,
        category: category.name,
        categoryPriority: category.priority,
        productPriority: category.productPriority
    }));
}

// Express route to fetch all products
app.get('/products', async (req: Request, res: Response) => {
    try {
        const productsSnapshot = await admin.firestore().collection("Products").get();
        const allProductIds = productsSnapshot.docs.map(doc => doc.id);
        const products = await getProductsByIds(allProductIds);
        const sortedProducts = sortAndStructureProducts(products);
        res.json(sortedProducts);
    } catch (error) {
        res.status(500).send("Error fetching products: " + error);
    }
});

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


app.post('/add-product', async (req: Request, res: Response) => {
    console.log(req.body);
    try {
        const product = req.body;

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


// Export the Express app as a Firebase Cloud Function
export const api = onRequest(app);
