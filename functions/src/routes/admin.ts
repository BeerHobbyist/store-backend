import * as express from "express";
import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { getProductsByIds } from "../utils/productsUtils";
import * as multer from "multer";
import * as jwt from "jsonwebtoken";
import "dotenv/config";

export const adminRouter = express.Router();
const upload = multer({ dest: "uploads/"});

const validateUser = async (
  username: string,
  password: string
): Promise<boolean> => {
  const admins = (await admin.firestore().collection("Admins").get()).docs;
  const user = admins.find((admin: any) => {
    return (
      admin.data().username === username && admin.data().password === password
    );
  });
  if (user) {
    return true;
  }
  return false;
};

adminRouter.get("/auth/orders", async (req: Request, res: Response) => {
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

adminRouter.put(
  "/auth/products",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).send("No file uploaded");
      }
      const bucket = admin.storage().bucket();
      const file = bucket.file(req.file!.originalname);
      const fileStream = file.createWriteStream({
        metadata: {
          contentType: req.file!.mimetype,
        },
      });

      fileStream.on("error", (error) => {
        res.status(500).send("Error uploading file: " + error);
      });

      fileStream.on("finish", async () => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURI(
          file.name
        )}?alt=media`;
        console.log(imageUrl);
        res.status(201).send("Product added successfully");
      });

      fileStream.end(req.file!.buffer);
    } catch (error) {
      res.status(500).send("Error adding product: " + error);
    }
  }
);

adminRouter.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (await validateUser(username, password)) {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY must be set");
    }
    const token = jwt.sign({ username }, process.env.PRIVATE_KEY, {
      expiresIn: "30d",
    });
    res.cookie("authToken", token, { httpOnly: true });
    res.send("Logged in successfully");
  } else {
    res.status(401).send("Invalid credentials");
  }
});
