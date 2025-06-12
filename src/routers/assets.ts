import { Router } from "express";
import { getBoardGames } from "../controllers/assets";

export const router = Router();

router.post("/", getBoardGames);
