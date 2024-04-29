import * as express from 'express';
import * as cors from 'cors';
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import * as jwt from 'jsonwebtoken';
import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';

// Initialize Firebase Admin
admin.initializeApp();

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

app.use("/orders", session({ secret: "bananabread", resave: false, saveUninitialized: false }));

app.use("/orders/auth/*", (req, res, next) => {
    const token = req.cookies['authToken'];

    if (!token) {
        return res.status(401).send("Unauthorized: No token provided");
    }
    
    jwt.verify(token, "bananabread", (err: any, user: any) => {
        if (err) {
            return res.status(401).send("Unauthorized: Invalid token");
        }
        next(); // Proceed to next middleware or route handler
        return;
    });
    return;
});

app.post('/login', (req, res) => {
    // TODO: Implement actual login logic to validate username and password
    const { username, password } = req.body;
    const token = jwt.sign({ username, password }, "bananabread");

    // Set cookie with HTTP-only and Secure flags
    res.cookie('authToken', token, {
        httpOnly: true,
        secure: true, // Secure flag ensures the cookie is only used over HTTPS
        sameSite: 'strict', // Helps mitigate CSRF attacks by restricting cross-origin use of the cookie
        maxAge: 3600000 // Set cookie expiration as needed
    });

    res.send('Login successful and token set in cookie');
});

// Export the Express app as a Firebase Cloud Function
export const api = onRequest(app);
