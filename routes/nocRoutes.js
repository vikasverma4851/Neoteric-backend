const express = require("express");
const router = express.Router();
const { grantNOC,getNOCHistory } = require("../controllers/nocController");
const { protect ,authorizeRoles } = require("../middlewares/authMiddleware");

router.post("/grant", protect, grantNOC);
router.get("/history", protect, getNOCHistory);

module.exports = router;
