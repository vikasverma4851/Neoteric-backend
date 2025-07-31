const express = require("express");
const router = express.Router();
const { grantNOC,getNOCHistory ,getBookingsForNOC,proceedToNoDue,clearOtherDetails} = require("../controllers/nocController");
const { protect ,authorizeRoles } = require("../middlewares/authMiddleware");

router.get("/bookings", getBookingsForNOC);
router.post("/proceed",protect, proceedToNoDue);
router.post("/grant",protect, grantNOC);
router.get("/history", getNOCHistory);
router.put("/clear-other-details", protect, clearOtherDetails);

module.exports = router;
