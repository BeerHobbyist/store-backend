import * as admin from 'firebase-admin';

export async function getProductsByIds(productIds: string[]): Promise<Product[]> {
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

function processProductData(productId: string, productData: any, categoriesData: CategoryData[]): Product[] {
    return categoriesData.map(category => ({
        id: productId,
        name: productData.name,
        packageType: productData.packageType,
        price: productData.price,
        imageUrl: productData.imageUrl,
        disabled: productData.disabled,
        category: category.name,
        categoryPriority: category.priority,
        productPriority: category.productPriority
    }));
}