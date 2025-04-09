const express = require("express");
const router = express.Router();
const mysql = require("mysql");

// 导入文章模块
const artCateHandler = require("../router_handler/artcate");

router.get("/getArtcle", artCateHandler.getArtCate);

router.get("/getArtcleById", artCateHandler.queryAuthor);

module.exports = router;
