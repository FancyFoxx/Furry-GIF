/**
 * Handles requests made to the / root endpoint
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

import express from "express";
const router = express.Router();

/* GET home page. */
router.get("/", async function(req, res, next) {
	res.render("index", { title: "Express" });
});

export default router;
