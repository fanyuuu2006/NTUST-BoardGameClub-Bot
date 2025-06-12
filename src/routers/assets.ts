import { Router } from "express";
import { getAssets, getAssetsSearch } from "../controllers/assets";

export const router = Router();

router.get("/", getAssets);
router.get("/search", getAssetsSearch);
