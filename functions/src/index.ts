import * as express from 'express';
import * as cors from 'cors';
import * as firebase from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import * as jwt from 'jsonwebtoken';
import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';
import 'dotenv/config';

import * as admin from './routes/admin';
import * as products from './routes/customer';

// Initialize Firebase Admin
firebase.initializeApp();

// Initialize Express
const app = express();
app.use(express.json());
app.use(cookieParser());

// Apply CORS middleware.
const corsOptions = {
    origin: true,  // Update with your specific domain in production
    credentials: true  // This allows cookies to be sent with cross-origin requests
};
app.use(cors(corsOptions));

app.use("/orders", session({ secret: process.env.SECRET ?? 'default key', resave: false, saveUninitialized: false }));

app.use("/admin/auth/*", (req, res, next) => {
    const token = req.cookies['authToken'];

    if (!token) {
        return res.status(401).send("Unauthorized: No token provided");
    }
    if (!process.env.PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY must be set');
    }
    jwt.verify(token, process.env.PRIVATE_KEY, (err: any, user: any) => {
        if (err) {
            return res.status(401).send("Unauthorized: Invalid token");
        }
        next(); // Proceed to next middleware or route handler
        return;
    });
    return;
});

// Define the routes
app.use("/admin", admin.adminRouter);
app.use("/customer", products.customerRouter);

// Export the Express app as a Firebase Cloud Function
export const api = onRequest(app);
