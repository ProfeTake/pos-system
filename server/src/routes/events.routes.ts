import { Router } from "express";
import { eventsHandler } from "../controllers/events.controller";

const router = Router();

router.get("/", eventsHandler);

export default router;
