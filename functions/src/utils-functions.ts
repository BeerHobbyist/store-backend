import * as admin from 'firebase-admin';

type Product = {
    id: string;
    name: string;
    packageType: string;
    price: number;
    imageUrl: string;
    category: string;

}

export function validateProductFormat(item: any) : item is Product {
    return (
        item &&
        'name' in item && typeof item.name === 'string' &&
        'packageType' in item && typeof item.packageType === 'string' &&
        'price' in item && typeof item.price === 'number' &&
        'imageUrl' in item && typeof item.imageUrl === 'string' &&
        'category' in item && typeof item.category === 'string'
    );
}

export const findProductById = async (id: string) => {
    const productDoc = await admin.firestore().collection("Products").doc(id).get();
    return productDoc.data();
};