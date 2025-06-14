import { Router } from "express";
import {
  getAssetById,
  getAssets,
  getAssetsSearch,
  patchAssetById,
} from "../controllers/assets";

export const router = Router();

router
  .get("/", getAssets)
  .get("/search", getAssetsSearch)
  .get("/:id", getAssetById)
  .patch("/:id", patchAssetById);
