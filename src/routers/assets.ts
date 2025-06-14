import { Router } from "express";
import {
  getAssetById,
  getAssets,
  getAssetsSearch,
} from "../controllers/assets";

export const router = Router();

router
  .get("/", getAssets)
  .get("/search", getAssetsSearch)
  .get("/:id", getAssetById);
// .patch("/:id", authorizationMiddleware, patchAssetById);
//express.json() 會解析 req.body，而這樣會影響 LINE SDK 驗證
