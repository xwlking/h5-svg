var Ajax = {
	/**
	 * ajax返回结果验证<br>
	 * 返回false：验证失败，打印错误消息，如果用户已退出则回到登录页面<br>
	 * 返回true：继续执行后面的动作
	 * 
	 * @param result
	 * @returns {Boolean}
	 */
	resultValidate : function(result) {
		if (!result.status) {
			if (result.location) {
				parent.location.href = result.location;
				return false;
			} else if (result.message) {
				window.parent.myDialog(result.message);
				return false;
			} else {
				return false;
			}
		}
		return true;
	}
}