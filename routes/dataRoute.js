const express = require("express");
const {
    insertData,
    getData,
    getData2,
} = require("../controllers/dataController");
const router = express.Router();

router.route("/events").post(insertData);
router.route("/metrics").get(getData);
router.route("/metrics2").get(getData2);

module.exports = router;
