const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
const router = express.Router();
const cors = require("cors");
const userApi = require("./router/user");
const artcateApi = require("./router/artcate");
const secritKey = "secritKey";
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const whiteList = ["/user/login", "/user/register"];
const authenticateToken = (req, res, next) => {
  // 检查请求是否为get请求，请求路径是否为白名单
  console.log(req.method);
  
  if (req.method === "GET" || whiteList.includes(req.path)) {
    return next();
  }

  const authorization = req.headers["authorization"];
  // 检查请求头是否存在
  if (!authorization) {
    return res.json({ code: 401, success: false, message: "未提供令牌" });
  }
  // 获取请求头里的token字符串
  const token = req.headers["authorization"].replace("Bearer ", "");

  // 令牌是否存在
  if (!token) {
    return res.json({ code: 401, success: false, message: "未提供令牌" });
  }

  // 验证令牌
  jwt.verify(token, secritKey, (err, decode) => {
    if (err) {
      return res.json({ code: 401, success: false, message: "令牌无效" });
    }
    req.userInfo = decode;
    next();
  });
};

app.use(authenticateToken);

// 根路由
app.get("/", (req, res) => {
  res.send("Hello World！");
});

app.use("/user", userApi);

app.use("/artcle", artcateApi);

app.listen(8000, () => {
  console.log("This server is running at http://127.0.0.1:8000");
});
