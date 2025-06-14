import { Request, Response, NextFunction } from "express";

// 驗證 JWT Token
export const authorizationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "未授權的存取" });
    return;
  }

  try {
    if (token !== process.env.PRIVATE_KEY) {
      res.status(401).json({ error: `未授權的存取 ${token}` });
      return;
    }
    next();
  } catch {
    res.status(403).json({ error: "無效的 Token" });
    return;
  }
};
