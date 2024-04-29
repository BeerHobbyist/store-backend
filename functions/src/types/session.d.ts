import "express-session";

declare module "express-session" {
  export interface Session {
    token?: string;  // Add the token field as an optional property
  }
}