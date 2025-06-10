import { Router } from "express";
import { lineMiddleWare } from "../middlewares/line";
import { main } from "../controllers/webhook";

export const router = Router();

router.post("/", lineMiddleWare, main);
