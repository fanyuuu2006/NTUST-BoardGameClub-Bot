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
