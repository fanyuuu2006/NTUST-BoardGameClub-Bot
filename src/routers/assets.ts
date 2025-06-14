import { Router } from "express";
import {
  getAssetById,
  getAssets,
  getAssetsSearch,
  patchAssetById,
} from "../controllers/assets";
import { authorizationMiddleware } from "../middlewares/authorzation";

export const router = Router();

router
  .get("/", getAssets)
  .get("/search", getAssetsSearch)
  .get("/:id", getAssetById)
  .patch("/:id", authorizationMiddleware, patchAssetById);
