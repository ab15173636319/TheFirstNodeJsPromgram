const e = require("express");
const express = require("express");
const router = express.Router();
const mysql = require("mysql");

// 数据库表名：article
// 字段:aid、title, content, time, author, cate_id, status，prize

// 链接数据库

const db = mysql.createConnection({
  host: "127.0.0.1",
  database: "data",
  user: "root",
  password: "123456",
});

// 连接数据库
db.connect((err) => {
  if (err) {
    console.log("数据库连接失败", err);
    return;
  }
  console.log("数据库连接成功");
});

// 查询文章
exports.getArtCate = (req, res) => {
  const desc = req.query.desc || "prize"; // 排序字段，默认按 prize 升序排序

  // 构建排序语句
  const orderBy = `ORDER BY ${desc}`;

  const sql = `SELECT * FROM article WHERE title LIKE ? OR content LIKE ? OR author LIKE ? ${orderBy} LIMIT ?,?`;

  // 获取请求参数
  const search = req.query.search_content || ""; // 搜索关键字
  // 使用通配符 % 来模糊匹配
  const searchKey = `%${search}%`; // 搜索关键字

  const pageNumber = parseInt(req.query.pageNumber) || 1; // 当前页码
  const pageSize = parseInt(req.query.pageSize) || 20; // 每页条数

  const offset = (pageNumber - 1) * pageSize; // 偏移量

  db.query(
    sql,
    [searchKey, searchKey, searchKey, offset, pageSize],
    (err, results) => {
      if (err) {
        console.log("查询失败", err);
        return res.status(500).json({ message: "查询失败" });
      }
      // 查询总数
      const sqlCount =
        "SELECT COUNT(*) as total FROM article WHERE title LIKE ? OR content LIKE ? OR author LIKE ?";
      db.query(
        sqlCount,
        [searchKey, searchKey, searchKey],
        (err, countResults) => {
          if (err) {
            console.log("查询总数失败", err);
            return res.status(500).json({ message: "查询总数失败" });
          }
          const total = countResults[0].total; // 总数
          res.status(200).json({
            code: 200,
            message: "查询成功",
            data: {
              artcle: results,
              page: {
                total: total,
                pageNumber: pageNumber,
                pageSize: pageSize,
                pageCount: Math.ceil(total / pageSize),
              },
            },
          });
        }
      );
    }
  );
};
