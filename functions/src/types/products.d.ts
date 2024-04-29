interface Product {
    id: string;
    name: string;
    packageType: string;
    price: number;
    imageUrl: string;
    disabled: boolean;
    category: string;
    categoryPriority: number;
    productPriority: number;
}

interface CategoryGroup {
    priority: number;
    products: Product[];
}

interface Category {
    name: string;
    priority: number;
}

interface CategoryData extends Category {
    productPriority: number;
}