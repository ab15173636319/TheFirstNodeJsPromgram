function getAllArticles() {
  $.ajax({
    url: "http://127.0.0.1:8000/artcle/getArtcle",
    type: "get",
    dataType: "json",
    success: function (data) {
      console.log(data.data);
      const articles = data.data.artcle;
      const page = data.data.page;
      const total = page.total; // 总数
      const pageNumber = page.pageNumber; // 当前页码
      const pageSize = page.pageSize; // 每页条数
      data.data.artcle.forEach((article) => {
        console.log(article);
        if (article.imgs && article.imgs.length > 0) {
          var html = `
          
        <div class="post">
            <div class="post-title">${article.title}</div>
              <div class="post-content">${article.content}</div>
              <div class="post-images">
              <img class="post-image" src="https://dummyimage.com/100x100/000/fff" alt="Post Image">
              <img class="post-image" src="https://dummyimage.com/100x100/000/fff" alt="Post Image">
            </div>
            
            <div class="article">
                <div class="author">作者：${article.author_nickname}</div>
                <div class="info">
                    <div class="prize">点赞数：${article.prize}</div>
                    <div class="time">时间：${article.lastUpdate}</div>
                </div>
            </div>
        </div>
  `;
        } else {
          var html = `   
        <div class="post">
            <div class="post-title">${article.title}</div>
            <div class="post-content">${article.content}</div>
            
            <div class="article">
                <div class="author">作者：${article.author_nickname}</div>
                <div class="info">
                    <div class="prize">点赞数：${article.prize}</div>
                    <div class="time">时间：${formatDate(
                      article.lastUpdate
                    )}</div>
                </div>
            </div>
        </div>
  `;
        }

        $("#post").append(html);
      });
    },
    error: function (error) {
      console.log("请求失败", error);
    },
  });
}

function getUserInfo() {
  $.ajax({
    url: "http://127.0.0.1:8000/user/getUserInfo",
    method: "post",
    headers: {
      authorization: "Bearer " + localStorage.getItem("token"),
    },
    success: (res) => {
      if (res.code == 401) {
        showToast(res.data.msg, "error");
        return;
      }
      $("#nav-right-info").css("display", "flex");

      var html = `
        <div class="nav-user-name">${res.data.nickname}</div>
                <div class="nav-user-avatar"><img src="${res.data.img}" alt=""></div>
                <div class="nav-user-dropdown">
                    <div class="nav-user-dropdown-item"><a href="#">个人中心</a></div>
                    <div class="nav-user-dropdown-item"><a href="#">设置</a></div>
                    <div class="nav-user-dropdown-item"><a href="#">退出登录</a></div>
                </div>
      `;
      $("#nav-right-info").append(html);
      $("#nav-right-bth").css("display", "none");
    },
    error: (err) => {},
  });
}

getUserInfo();
getAllArticles();

function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
}
