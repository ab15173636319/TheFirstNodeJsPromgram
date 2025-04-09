/**
 *
 * @api {post} /user/login 登录
 * @api {post} /user/register 注册
 * @api {post} /user/getUserInfo 获取用户信息
 * @api {post} /user/queryPwd 查询账户密码
 * @api {post} /user/logout 退出登录
 * 退出登录逻辑：
 * 登录使用到了redis保存生成的token，
 * 获取用户信息使用了中间件判断用户是否已登录
 * 退出登录使用redis将token存储到黑名单中
 */

const express = require("express");
const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const session = require("express-session");
const bcrypt = require("bcrypt");
const redis = require("redis");
const router = express.Router();
const secritKey = "secritKey"; //token加密密钥
const expiresIn = "7d"; //token有效期
const saltDegree = 10; //密码加密程度

// 链接数据库
const connection = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "123456",
  database: "data",
});

// 创建redis客户端
const client = redis.createClient(8001, () => {});
client.on("error", (err) => {
  console.log("Error " + err);
});
client.on("connect", () => {});
client.connect();

// 设置redis
async function redisOption(key, value, control) {
  try {
    switch (control) {
      case "set":
        // 生成
        await client.set(key, value);
        break;
      case "remove":
        // 删除
        await client.del(key);
        break;

      default:
        // 查询
        return await client.get(key);
        break;
    }
  } catch (error) {
    console.log(error);
  }
}

// 中间件：判断用户是否已登录
// 白名单
const whiteList = ["/login", "/register", "/deleteUser"];
async function isLoggedIn(req, res, next) {
  if (whiteList.includes(req.path)) {
    return next();
  }

  // 判断该token是否在黑名单中
  const token = await redisOption("token", null, "get");

  const isDiscardToken = await redisOption(`blacklist${token}`, null, "get");

  if (!token || token === "false" || isDiscardToken == token) {
    return res.json({
      code: 401,
      success: false,
      msg: "用户已退出登录，请重新登录",
    });
  }
  next();
}

router.use(isLoggedIn);

// 登录
router.post("/login", (req, res) => {
  var username = req.body.username;
  var password = req.body.password;

  var sql = "select * from user_table where username = ? and password = ?";
  connection.query(sql, [username, password], (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      // 查询该账户是否已经注销，字段status=0

      if (result[0].status == 0) {
        res.json({
          code: 401,
          msg: "登录失败，该账号已经注销。",
          success: false,
        });
        return;
      }

      // 生成token
      const token = jwt.sign({ userInfo: result[0] }, secritKey, {
        expiresIn: expiresIn,
      });
      redisOption("token", token, "set");
      res.json({
        code: 200,
        msg: "登录成功，此次登录有效期7天",
        success: true,
        data: {
          token: token,
        },
      });
    } else {
      res.json({
        code: 401,
        msg: "账号或密码错误",
        success: false,
      });
    }
  });
});

// 判断该用户名是否已经存在
async function isUserExsit(username) {
  return new Promise((resolve, reject) => {
    var sql = "select * from user_table where username =?";
    connection.query(sql, [username], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.length > 0);
      }
    });
  });
}

// 注册
router.post("/register", async (req, res) => {
  const pwdVariable = /^(?=(?:.*[a-zA-Z]){2})[a-zA-Z0-9]{6,}$/;
  const unVariable = /^[a-zA-Z0-9]+$/;

  const user = {
    username: req.query.username,
    password: req.query.password,
    nickname: req.query.nickname,
    img: req.query.img,
    info: req.query.info,
    status: 1,
  };

  if (!unVariable.test(user.username)) {
    return res.json({
      code: 401,
      success: false,
      msg: "用户名只能包含字母和数字",
    });
  }

  if (!pwdVariable.test(user.password)) {
    return res.json({
      code: 401,
      success: false,
      msg: "密码至少包含两个字母，且长度不小于6",
    });
  }

  if (!user.username || !user.password || !user.nickname) {
    return res.json({
      code: 401,
      success: false,
      msg: "请填写完整信息",
    });
  }

  const isExsit = await isUserExsit(user.username);
  console.log(isExsit);

  if (isExsit) {
    return res.json({
      code: 401,
      success: false,
      msg: "用户名已存在",
    });
  }

  var sql = "INSERT INTO user_table SET?";
  connection.query(sql, user, (err, result) => {
    if (err) throw err;
    if (result.affectedRows > 0) {
      res.json({
        code: 200,
        success: true,
        msg: "注册成功",
      });
    } else {
      res.json({
        code: 401,
        success: false,
        msg: "注册失败",
      });
    }
  });
});

// 获取用户信息
router.post("/getUserInfo", async (req, res) => {
  delete req.userInfo.userInfo.password;
  delete req.userInfo.userInfo.status;
  if (req.userInfo.userInfo.status == 0) {
    res.json({
      code: 401,
      msg: "登录失败，该账号已经注销。",
      success: false,
    });
    return;
  } else if (!req.userInfo) {
    res.json({
      code: 401,
      msg: "未查询到用户",
      success: false,
    });
    // 执行退出登录
    const discardToken = await redisOption("token", null, "get");
    redisOption(`blacklist${discardToken}`, discardToken, "set");
  }
  res.json({
    code: 200,
    success: true,
    msg: "获取用户信息成功",
    data: req.userInfo.userInfo,
  });
});

// 查询账户密码
router.post("/queryPwd", (req, res) => {
  if (req.userInfo.userInfo.status == 0) {
    res.json({
      code: 401,
      msg: "登录失败，该账号已经注销。",
      success: false,
    });
    return;
  } else if (!req.userInfo) {
    res.json({
      code: 401,
      msg: "未查询到用户",
      success: false,
    });
    // 执行退出登录
    const discardToken = redisOption("token", null, "get");
    redisOption(`blacklist${discardToken}`, discardToken, "set");
  }
  res.json({
    code: 200,
    success: true,
    msg: "查询成功",
    data: {
      password: req.userInfo.userInfo.password,
    },
  });
});

// 注销账号
router.post("/deleteUser", (req, res) => {
  if (
    !req.query.pqssword ||
    req.query.pqssword == req.userInfo.userInfo.pqssword
  ) {
    res.json({
      code: 401,
      success: false,
      msg: "密码错误！",
    });
  }

  if (req.userInfo.userInfo.uid == 1) {
    res.json({
      code: 401,
      success: false,
      msg: "超级管理员无法删除",
    });
  }

  if (req.userInfo.userInfo.status === 0) {
    res.json({
      code: 401,
      success: false,
      msg: "用户已注销",
    });
  }

  if (req.userInfo.userInfo.uid !== req.query.uid) {
    res.json({
      code: 401,
      success: false,
      msg: "无法删除其他用户",
    });
  }

  if (!req.userInfo.userInfo.uid) {
    res.json({
      code: 401,
      success: false,
      msg: "未查询到用户",
    });
  }

  var sql = "UPDATE user_table SET status=0 WHERE uid=?";
  connection.query(sql, [req.userInfo.userInfo.uid], (err, result) => {
    if (err) {
      // 统一处理错误，避免多次发送响应
      return res.status(500).json({
        code: 500,
        success: false,
        msg: "数据库操作出错: " + err.message,
      });
    }
    if (result.affectedRows > 0) {
      res.json({
        code: 200,
        success: true,
        msg: "注销成功",
      });
      const discardToken = redisOption("token", null, "get");
      redisOption(`blacklist${discardToken}`, discardToken, "set");
    } else {
      res.json({
        code: 401,
        success: false,
        msg: "注销失败",
      });
    }
  });
});

// 恢复账号
router.post("/recoveryUser", (req, res) => {
  if (!req.query.password || !req.query.uid) {
    res.send({
      code: 401,
      mes: "请输入密码或uid！",
      success: false,
    });
    return;
  }
  if (req.query.password == req.userInfo.userInfo.password) {
    res.send({
      code: 401,
      mes: "密码错误。",
      success: false,
    });
    return;
  }

  var sql = "UPDATE user_table SET status=1 WHERE uid=?";
  connection.query(sql, [req.userInfo.userInfo.uid], (err, result) => {
    if (err) {
      // 统一处理错误，避免多次发送响应
      return res.status(500).json({
        code: 500,
        success: false,
        msg: "数据库操作出错: " + err.message,
      });
    }
    if (result.affectedRows > 0) {
      res.json({
        code: 200,
        success: true,
        msg: "恢复成功",
      });
    } else {
      res.json({
        code: 401,
        success: false,
        msg: "恢复失败",
      });
    }
  });
});

// 修改账户
router.post("/updateUserInfo", (req, res) => {
  // 先检查是否输入了 uid
  if (!req.query.uid) {
    return res.json({
      code: 401,
      success: false,
      msg: "请输入 uid。",
    });
  }

  // 检查用户信息是否存在
  if (!req.userInfo || !req.userInfo.userInfo || !req.userInfo.userInfo.uid) {
    return res.json({
      code: 401,
      success: false,
      msg: "未查询到用户",
    });
  }

  // 检查是否为超级管理员
  if (req.userInfo.userInfo.uid == 1) {
    return res.json({
      code: 401,
      success: false,
      msg: "超级管理员无法修改",
    });
  }

  // 检查用户是否已注销
  if (req.userInfo.userInfo.status === 0) {
    return res.json({
      code: 401,
      success: false,
      msg: "用户已注销",
    });
  }

  // 检查是否修改其他用户
  if (req.userInfo.userInfo.uid !== parseInt(req.query.uid)) {
    return res.json({
      code: 401,
      success: false,
      msg: "无法修改其他用户",
    });
  }

  var user = {};
  const otherKeys = ["nickname", "password", "img", "info"];
  var count = 0;

  for (let key of otherKeys) {
    if (req.query[key]) {
      user[key] = req.query[key];
      count += 1;
    }
  }
  // 检查是否至少有一个字段被修改
  if (count === 0) {
    return res.json({
      code: 401,
      success: false,
      msg: "至少得有一个被修改",
    });
  }
  var sql = "UPDATE user_table SET? WHERE uid=?";
  connection.query(sql, [user, req.query.uid], (err, result) => {
    if (err) {
      console.error(err);
      return res.json({
        code: 500,
        success: false,
        msg: "服务器内部错误",
      });
    }
    if (result.affectedRows > 0) {
      var sql = "select * from user_table where uid = ?";
      connection.query(sql, req.query.uid, (err, result) => {
        if (err) throw err;
        // 生成token
        const token = jwt.sign({ userInfo: result[0] }, secritKey, {
          expiresIn: expiresIn,
        });
        res.json({
          code: 200,
          success: true,
          msg: "修改成功",
          token: token,
        });
      });
    } else {
      res.json({
        code: 401,
        success: false,
        msg: "修改失败",
      });
    }
  });
});

// 退出登录
router.post("/logout", async (req, res) => {
  const discardToken = await redisOption("token", null, "get");
  redisOption(`blacklist${discardToken}`, discardToken, "set");
  res.json({
    code: 200,
    success: true,
    msg: "退出成功",
  });
});

module.exports = router;
