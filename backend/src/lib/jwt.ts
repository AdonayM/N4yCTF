import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET is missing or too short. Set a 32+ char secret in your environment."
  );
}

export type JwtPayload = {
  sub: string; // user id
  username: string;
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET as string) as JwtPayload;
}

export const AUTH_COOKIE = "n4y_token";
export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "none" as const,
  secure: true,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};