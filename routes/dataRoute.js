const express = require("express");
const {
    insertData,
    getData,
} = require("../controllers/dataController");
const router = express.Router();

router.route("/events").post(insertData);
router.route("/metrics").get(getData);

module.exports = router;
