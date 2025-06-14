import jwt from "jsonwebtoken";
import ms from "ms";

export const generateToken = (
  data: string | Buffer | object,
  expiresIn: number | ms.StringValue | undefined = "1h"
) => jwt.sign(data, process.env.JWT_KEY as string, { expiresIn });

// 驗證 Token
export const verifyToken = (token: string): jwt.JwtPayload | string =>
  jwt.verify(token, process.env.JWT_KEY as string);
