const express = require("express");
const router = express.Router();

/* GET home page. */
router.get("/", (req, res, next) => {
  res.render("index", { title: "Express" });
});

router.get("/test", (req, res, next) => {
  setTimeout(function(){
    console.log("asdfsdf");
    res.send("ok");
  }, 99999999);
});

module.exports = router;
