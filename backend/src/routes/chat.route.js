import express from "express"
import { protectRoute } from "../middlewares/auth.middleware.js"
import { getStreamToken, syncChannels } from "../controllers/chat.controller.js"

const router = express.Router()

router.get("/token", protectRoute, getStreamToken)
router.post("/sync", protectRoute, syncChannels)

export default router
