import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
  rawBody?: Buffer;
}

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Access token is missing" });
  }

  const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_for_dev";

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    
    // Check if user is still active in database
    try {
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) return res.status(403).json({ error: "User does not exist" });
      if (user.isActive === false) return res.status(403).json({ error: "Account suspended" });
      
      req.userId = user.id;
      req.userRole = user.role;
      next();
    } catch(e) {
      return res.status(500).json({ error: "Database error during authentication" });
    }
  });
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export function generateToken(user: { id: number, role: string }) {
  const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_for_dev";
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}
