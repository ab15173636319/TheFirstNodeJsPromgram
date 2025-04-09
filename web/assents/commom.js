/**
 * @param {*} message
 * 提示信息
 * @param {*} type
 * 提示类型（success、error、warning、info）
 */

function showToast(message, type) {
  // 创建提示框元素
  const toast = $("<div>").addClass("toast").addClass(type).text(message);
  $("body").append(toast);

  // 显示提示框
  setTimeout(() => {
    toast.css("top", "50px");
  }, 100);

  // 2 秒后隐藏提示框
  setTimeout(() => {
    toast.css("top", "-100px");
    // 隐藏后移除元素
    setTimeout(() => {
      toast.remove();
    }, 500);
  }, 2000);
}
