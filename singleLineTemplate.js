//$.fn.test = (function() {
//	console.log(this);
//});

// 控件状态对象
var consts = {
	/**
	 * Component
	 */
	NEW : "new",// 新增加组件，没有与设备关联，模板保存使用
	ADD : "add",// 新增加组件，与设备关联，模板保存使用
	DELETE : "delete",// 表示组件被删除，模板保存使用
	MODIFY : "modify",// 表示组件被修改，模板保存使用
	USELESS : "useless",// 新增加组件，根据该状态判断如果在控件块中释放鼠标，则删除
	EXISTING : "existing",// 表示已存在的组件，保存模板时不做修改
	/**
	 * Line
	 */
	LEVEL : "level",// 水平线
	VERTICAL : "vertical"// 垂直线
}

var template = {
	svgEle : null,// SVG根节点
	currentSelected : null,// 当前选中的控件
	/**
	 * 初始化SVG模板
	 */
	load : function() {
		var embed = document.getElementById("embedNode"); // 获取embed元素
		var svgDoc = embed.getSVGDocument(); // 获取SVGDocument对象
		template.svgEle = $(svgDoc.documentElement); // 获取SVG节点并转换为jQuery对象

		// SVG模板禁用右键菜单事件
		template.svgEle.children().contextmenu(function() {
			return false;
		});

		// 右键删除菜单单击事件
		template.svgEle.find("#deleteMenu").click(function() {
			var currentSelected = template.currentSelected;
			template.deleteComponent(currentSelected);
		});

		// 组件拖拽事件
		template.svgEle.children("g[class='component']").mousedown(template.drag);
		template.svgEle.contents().find("g[class='component_entity']").mousedown(template.drag);

		// 控件导航注册事件
		var componentNav = template.svgEle.children("[id^='controls']");
		componentNav.click(template.componentNavClick);
		componentNav.hover(template.componentNavOver, template.componentNavOut);
		componentNav.show()

		// 属性文本框键盘、blur事件
		$("#c_x,#c_y,#c_length,#c_componentNumber").keydown(template.attrTextKeydown).blur(
				template.attrTextKeydown);

		// SVG容器单击事件
		template.svgEle.children("#SVGContainer").mousedown(template.containerClick);

		// 旋转按钮单击事件
		$("#bt_turn").click(template.containerTurn);

		// 设置按钮单击事件
		$("#bt_setup").click(template.setupTemplate);

		// 保存按钮单击事件
		$("#bt_save").click(template.saveTemplate);

		// 控件关联select注册选择事件
		$("#c_componentList").change(template.selectChange);

		// 单位radio注册单击事件
		$("input[name='unitRadio']").click(template.radioClick);

		// 未保存模板退出页面、关闭浏览器时提示
		$(window).bind("beforeunload", template.browserBeforeunload);

		// 禁止选择文本
		if (typeof (svgDoc.onselectstart) != "undefined") {
			// IE下禁止文本被选取
			svgDoc.onselectstart = new Function("return false");
		} else {
			// FireFox下禁止文本被选取的变通办法
			svgDoc.onmousedown = new Function("return false");
			svgDoc.onmouseup = new Function("return true");
		}

		// 注册键盘事件，用于键盘移动控件位置，这里给“保存”按钮注册该事件是针对上面的“禁止选择文本的事件”的写法
		$("#bt_save").keydown(template.componentKeydown);
		
		console.log(123)
	},

	/**
	 * ************** 拖拽：主要效果都基于该函数 **************
	 * 
	 * @param e
	 * @returns {Boolean}
	 */
	drag : function(e) {
		var currentSelected = $(this);
		template.currentSelected = currentSelected;

		// 鼠标左键：0，右键:2
		if (e.button == 2) {
			template.contextmenu(e);
			return;
		} else if (e.button) {
			// 非0：非左键单击则停止
			return;
		}

		// 处理左侧控件栏添加新控件
		var _class = currentSelected.attr("class");
		if (_class == "component") {
			// 如果"currentSelected"是左侧控件
			currentSelected = currentSelected.find("[class='component_model']").clone();
			currentSelected.attr("class", "component_entity");
			currentSelected.attr("state", consts.USELESS);// 更改元素状态
			currentSelected.attr("id", new Date().getTime());// 用时间戳作为组件唯一ID
			currentSelected.clone().attr("id", "temp").css({// 零时元素
				"cursor" : "move"
			}).appendTo(template.svgEle);
			// 将新元素添加到同类容器中，以便处理元素层级关系
			var _parent = currentSelected.attr("parent");
			currentSelected.appendTo(template.svgEle.children("g[class='" + _parent + "']"));
			currentSelected.mousedown(template.drag);

			var backgroundEle = currentSelected.find("rect[attr='background']");
			var backgroundEle_fill = backgroundEle.css("fill");
			if (backgroundEle && (backgroundEle_fill == "rgb(245, 245, 245)" || backgroundEle_fill == "#f5f5f5")) {
				backgroundEle.css({
					"fill" : "#b6d1e2"
				});
				template.svgEle.find("#temp rect[attr='background']").css({
					"fill" : "#b6d1e2"
				});
			}
		}

		if (currentSelected.attr("state") == consts.EXISTING) {
			// 如果当前控件状态是已有控件，单击时标识为已被修改
			currentSelected.attr("state", consts.MODIFY);
		}

		var _attr = currentSelected.attr("attr");
		var dataUnit = currentSelected.contents().find("[type='unit']");
		if (_attr == "line") {
			// 处理"线"控件，将长度显示到文本框
			// wOrh:width Or height
			var wOrh = currentSelected.attr("line") == consts.LEVEL ? "width" : "height";
			var length = currentSelected.find("rect[attr='background']").attr(wOrh);
			$("#c_length").attr("disabled", false).val(length).attr("defaultVal", length);
			$("#bt_turn").attr("disabled", false);
		} else {
			$("#bt_turn").attr("disabled", true);
			$("#c_length").attr("disabled", true).val("");
		}

		$("#c_x,#c_y").attr("disabled", false);
		template.svgEle.find("#deleteMenu").hide();// 隐藏右键删除菜单

		// 取消前一个控件的选中状态
		template.svgEle.contents().find("rect[attr='dottedLine']").hide();
		// 将当前控件设置为选中状态
		var dottedLineEle = currentSelected.find("rect[attr='dottedLine']");
		dottedLineEle.show();

		// 获取当前鼠标点击时X、Y坐标
		var mX = e.clientX;
		var mY = e.clientY;
		// 获取当前控件X、Y坐标
		var translate = template.getTranslate(currentSelected);
		var _thisX = translate.x;
		var _thisY = translate.y;

		// 计算坐标
		var tX = mX - _thisX;
		var tY = mY - _thisY;

		// 将X、Y坐标显示到文本框，减去92为左侧列表宽度
		// 状态栏X、Y显示：x=控件x+补充x-左侧控件栏宽度，y=控件y+补充y
		if (!template.showXY((1 * _thisX) + (1 * currentSelected.attr("fill_x")) - 92, (1 * _thisY)
				+ (1 * currentSelected.attr("fill_y"))))
			return false;

		currentSelected.unbind();
		template.currentSelected = currentSelected;// 保存当前选中的控件

		// 鼠标移动
		template.svgEle.mousemove(function(e) {
			currentSelected.css({
				"cursor" : "move"
			});
			// 获取当前鼠标移动时X、Y坐标
			var mX = e.clientX;
			var mY = e.clientY;

			// 将X、Y坐标显示到文本框，减去92为左侧列表宽度
			// 状态栏X、Y显示：x=控件x+补充x-左侧控件栏宽度，y=控件y+补充y
			if (!template.showXY(mX + (-tX) + (1 * currentSelected.attr("fill_x")) - 92, mY + (-tY)
					+ (1 * currentSelected.attr("fill_y"))))
				return false;

			currentSelected.attr("transform", "translate(" + (mX + (-tX)) + "," + (mY + (-tY)) + ")");
			template.svgEle.find("#temp")
					.attr("transform", "translate(" + (mX + (-tX)) + "," + (mY + (-tY)) + ")");
		});

		template.showComponentList();// 显示组件关联名称select
		template.svgEle.mouseup(template.componentMouseup);// 鼠标释放事件
	},

	/**
	 * 鼠标释放事件
	 * 
	 * @param e
	 */
	componentMouseup : function(e) {
		var currentSelected = template.currentSelected;
		$("#bt_save").focus();// 配合控件键盘移动事件

		if (!currentSelected)
			return;

		currentSelected.css({
			"filter" : "",
			"opacity" : "",
			"cursor" : ""
		});
		template.svgEle.unbind();
		template.svgEle.find("#temp").remove();

		// 处理新增元素，如果在控件块区域中释放鼠标则删除元素
		if (currentSelected.attr("state") == consts.USELESS) {
			var translate = template.getTranslate(currentSelected);
			var x = (1 * translate.x) + (1 * currentSelected.attr("fill_x")) - 92
			var y = (1 * translate.y) + (1 * currentSelected.attr("fill_y"));
			if (x < 238 && y < 310) {
				// 如果控件坐标x小于控件块238宽度，y小于控件块310高，则删除
				currentSelected.remove();
				$("#c_x,#c_y,#c_length").attr("disabled", true).val("");
				return;
			}
			// 如果在控件块区域外释放鼠标，则将状态改变
			currentSelected.attr("state", consts.NEW);
			$("#c_x,#c_y").attr("disabled", false);
		}

		var dataUnit = currentSelected.contents().find("[type='unit']");
		if (dataUnit.length > 0) {
			// 如果是数据控件
			$("#unit_Radio").show();
			$("#text_componentNumber").hide().val("");
			if (currentSelected.attr("unit") == "hide")
				$("#radio_hide").attr("checked", true);
			else
				$("#radio_show").attr("checked", true);
		} else if (currentSelected.attr("parent") == "container_fadianji") {
			// 如果是发电机
			$("#c_componentNumber").val($.trim(currentSelected.contents().find("tspan").text().replace("G", "")));
			$("#unit_Radio").hide();
			$("#text_componentNumber").show();
		} else {
			$("#unit_Radio").hide();
			$("#text_componentNumber").hide().val("");
		}
		$("#embedNode").removeAttr("originalDocument");// 标识SVG模板文件已被修改，退出页面时提示保存

		currentSelected.mousedown(template.drag);// 释放后为当前控件重新注册单击事件
	},

	/**
	 * 当前选中控件键盘事件
	 * 
	 * @param e
	 * @returns {Boolean}
	 */
	componentKeydown : function(e) {
		var keyCode = e.keyCode;// 获取用户按下的键值
		var currentSelected = template.currentSelected;// 获取当前选中的控件
		if (currentSelected) {
			var translate = template.getTranslate(currentSelected);
			if (keyCode == "38") {
				translate.y--;// 上
			} else if (keyCode == "40") {
				translate.y++;// 下
			} else if (keyCode == "37") {
				translate.x--;// 左
			} else if (keyCode == "39") {
				translate.x++;// 右
			} else if (keyCode == 46) {
				// Delete键
				template.deleteComponent(currentSelected);
				return false
			} else {
				return false;
			}

			// 将X、Y坐标显示到文本框，减去92为左侧列表宽度
			if (!template.showXY((1 * translate.x) + (1 * currentSelected.attr("fill_x")) - 92, (1 * translate.y)
					+ (1 * currentSelected.attr("fill_y"))))
				return false;

			currentSelected.attr("transform", "translate(" + translate.x + "," + translate.y + ")");
			return false;
		}
	},

	/**
	 * 设置模板
	 */
	setupTemplate : function() {
		$("#templateWidth").val(template.svgEle.width());
		$("#templateHeight").val(template.svgEle.height());
		var dialog = $(".dialog-form").dialog({
			modal : true,
			resizable : false,
			show : "blind",
			hide : "blind",
			title : "设置",
			buttons : {
				"确定" : function() {
					var templateWidth = $.trim($("#templateWidth").val());
					var templateHeight = $.trim($("#templateHeight").val());
					if (!templateWidth) {
						window.parent.myDialog("宽度不能为空！")
						$("#templateWidth").focus();
						return;
					} else if (isNaN(templateWidth) || templateWidth <= 0) {
						window.parent.myDialog("请输入正确的数值！");
						$("#templateWidth").focus();
						return;
					} else if (!templateHeight) {
						window.parent.myDialog("高度不能为空！");
						$("#templateHeight").focus();
						return;
					} else if (isNaN(templateHeight) || templateHeight <= 0) {
						window.parent.myDialog("请输入正确的数值！");
						$("#templateHeight").focus();
						return;
					}
					template.setTemplateWH($("#templateWidth").val(), $("#templateHeight").val());
					$(this).dialog("close");
				},
				"关闭" : function() {
					$(this).dialog("close");
				}
			}
		});
	},

	/**
	 * 保存模板
	 * 
	 * @returns
	 */
	saveTemplate : function() {
		template.releaseFocus();// 释放控件焦点
		var newEles = template.svgEle.contents().find("g[state='" + consts.NEW + "']");// 获取新增控件
		var addEles = template.svgEle.contents().find("g[state='" + consts.ADD + "']");// 获取新增控件
		var modifyEles = template.svgEle.contents().find("g[state='" + consts.MODIFY + "']");// 获取修改控件
		var delEles = template.svgEle.contents().find("g[state='" + consts.DELETE + "']");// 获取删除控件
		var re = new RegExp("\n", "g");

		if ($("#embedNode").attr("originalDocument"))
			return window.parent.myDialog("未做任何修改！");

		// 拼装新增元素
		var newEleStr = "";
		$.each(newEles, function(i, e) {
			var eleHtml = e.outerHTML;
			newEleStr = newEleStr.concat(eleHtml).concat("~");
		});
		newEleStr = newEleStr.replace(re, "");
		newEleStr = newEleStr.substring(0, newEleStr.length - 1);

		// 拼装新增元素
		var addEleStr = "";
		$.each(addEles, function(i, e) {
			var eleHtml = e.outerHTML;
			addEleStr = addEleStr.concat(eleHtml).concat("~");
		});
		addEleStr = addEleStr.replace(re, "");
		addEleStr = addEleStr.substring(0, addEleStr.length - 1);

		// 拼装修改组件
		var modifyEleStr = "";
		$.each(modifyEles, function(i, e) {
			var eleHtml = e.outerHTML;
			modifyEleStr = modifyEleStr.concat(eleHtml).concat("~");
		});
		modifyEleStr = modifyEleStr.replace(re, "");
		modifyEleStr = modifyEleStr.substring(0, modifyEleStr.length - 1);

		// 拼装删除组件ID
		var delEleIdStr = "";
		$.each(delEles, function(i, e) {
			var eleId = $(e).attr("id");
			delEleIdStr = delEleIdStr.concat(eleId).concat("~");
		});
		delEleIdStr = delEleIdStr.replace(re, "");
		delEleIdStr = delEleIdStr.substring(0, delEleIdStr.length - 1);

		// 模板高度、宽度
		var realityWidth = template.svgEle.attr("realityWidth");
		var realityHeight = template.svgEle.attr("realityHeight");
		var width = template.svgEle.attr("width");
		var height = template.svgEle.attr("height");

		if (realityWidth == width && realityHeight == height) {
			width = "";
			height = "";
		}

		$.ajax({
			type : "POST",
			url : "./svgtemplate/saveTemplate.html",
			data : {
				"newEleStr" : newEleStr,
				"addEleStr" : addEleStr,
				"modifyEleStr" : modifyEleStr,
				"delEleIdStr" : delEleIdStr,
				"width" : width,
				"height" : height
			},
			dataType : "json",
			success : function(result) {
				if (Ajax.resultValidate(result)) {
					// 服务器返回状态验证通过
					if (result.message)
						window.parent.myDialog(result.message);

					$("#embedNode").attr("originalDocument", true);// 标识SVG模板文件为原始文件，退出页面时无需检测是否修改
				}
			}
		});
	},

	/**
	 * 旋转按钮单击事件
	 */
	containerTurn : function() {
		var currentSelected = template.currentSelected;
		if (currentSelected) {
			var _attr = currentSelected.attr("attr");
			if (_attr == "line") {
				// 将组件宽、高值互换，以达到90度旋转效果
				var rects = currentSelected.find("rect");
				$.each(rects, function() {
					var _width = $(this).attr("width");
					var _height = $(this).attr("height");
					$(this).attr({
						"width" : _height,
						"height" : _width
					});
				});
				if (currentSelected.attr("line") == consts.LEVEL) {
					// 如果是水平线
					currentSelected.attr("line", consts.VERTICAL);
				} else {
					// 如果是垂直线
					currentSelected.attr("line", consts.LEVEL);
				}
			}
		}
	},

	/**
	 * SVG容器单击事件（后面整幅蓝色背景），单击时释放所选控件焦点、文本框清空
	 */
	containerClick : function() {
		template.releaseFocus();// 释放控件焦点

		if (template.svgEle.attr("componentNav") == "show") {
			// 如果组件块是显示的，调整左侧控件栏块效果，效率考虑

			if ($.browser.msie) {
				// 处理IE
				template.svgEle.children("#currentControls").hide();
			} else {
				template.svgEle.children("#currentControls").css({
					"transform" : " matrix(1, 0, 0, 1, 0, -25)"
				});
			}
			template.svgEle.children("[for^='controls']").hide();
			template.svgEle.attr("componentNav", "hide");
		}
	},

	/**
	 * 属性文本框键盘事件
	 * 
	 * @param e
	 * @returns
	 */
	attrTextKeydown : function(e) {
		var _this = $(this) || $(document.activeElement);
		var type = e.type || e;
		var currentSelected = template.currentSelected;
		var keyCode = e.keyCode;// 获取用户按下的键值
		var defaultVal = $(this).attr("defaultVal");// X、Y、length默认值
		var c_x = $("#c_x").val();
		var c_y = $("#c_y").val();
		var c_componentNumber = $("#c_componentNumber").val();
		var c_length = $("#c_length").val();
		var c_x_defVal = $("#c_x").attr("defaultVal");
		var c_y_defVal = $("#c_y").attr("defaultVal");
		var c_componentNumber_defVal = $("#c_componentNumber").attr("defaultVal");
		var c_length_defVal = $("#c_length").attr("defaultVal");
		var fill_x = currentSelected.attr("fill_x");// 补充x
		var fill_y = currentSelected.attr("fill_y");// 补充y

		// 48~57为数字0~9，96~105为小键盘0~9，8为删除键，37为左键，39为右键，0为Tab键，190为小数点，110为小键盘小数点
		if (!((keyCode >= 48 && keyCode <= 57) || (keyCode >= 96 && keyCode <= 105) || keyCode == 8
				|| keyCode == 13 || keyCode == 27 || keyCode == 37 || keyCode == 39 || keyCode == 0
				|| keyCode == 190 || keyCode == 110 || type == "blur")) {
			return false;
		} else if (keyCode == 13 || type == "blur") {
			if (c_x_defVal && c_y_defVal) {
				// 回车键
				if (c_x && c_x <= 0) {
					$("#c_x").val(c_x_defVal);
					return;
				} else if (c_y && c_y <= 0) {
					$("#c_y").val(c_y_defVal);
					return;
				} else if (c_componentNumber && c_componentNumber <= 0) {
					$("#c_componentNumber").val(c_componentNumber_defVal);
					return;
				} else if (c_length && c_length <= 0) {
					$("#c_length").val(c_length_defVal);
					return;
				} else if (isNaN(c_x) || isNaN(c_y) || isNaN(c_componentNumber) || isNaN(c_length)) {
					return window.parent.myDialog("请输入有效数值！");
				} else if (c_x >= template.svgEle.width()) {
					// 如果X大于浏览器宽
					$(this).val(defaultVal);
					window.parent.myDialog("当前X最大取值范围为" + (template.svgEle.width() - 1));
					return window.parent.myDialog("当前X最大取值范围为" + (template.svgEle.width() - 1));
				} else if (c_y >= template.svgEle.height()) {
					// 如果Y大于浏览器高
					$(this).val(defaultVal);
					window.parent.myDialog("当前Y最大取值范围为" + (template.svgEle.height() - 1));
					return window.parent.myDialog("当前Y最大取值范围为" + (template.svgEle.height() - 1));
				} else if (currentSelected.attr("attr") == "line") {
					var background = currentSelected.find("rect[attr='background']");
					var dottedLine = currentSelected.find("rect[attr='dottedLine']");
					// wOrh:width Or height
					var wOrh = currentSelected.attr("line") == consts.LEVEL ? "width" : "height";
					var defaultLength = background.attr(wOrh);
					var fillLength = c_length - defaultLength;// 补充长度=输入长度-默认长度
					background.attr(wOrh, (1 * background.attr(wOrh)) + (1 * fillLength));
					dottedLine.attr(wOrh, (1 * dottedLine.attr(wOrh)) + (1 * fillLength));
				} else if (currentSelected.attr("parent") == "container_fadianji") {
					// 如果是发电机
					currentSelected.contents().find("tspan").text("G" + c_componentNumber);
				}
				// 状态栏X、Y显示：：x=控件x-补充x+左侧控件栏宽度，y=控件y-补充y
				var _x = c_x - fill_x + 92;
				var _y = c_y - fill_y;
				$("#c_x").attr("defaultVal", c_x);
				$("#c_y").attr("defaultVal", c_y);
				$("#c_componentNumber").attr("defaultVal", c_componentNumber);
				$("#c_length").attr("defaultVal", c_length);
				currentSelected.attr("transform", "translate(" + _x + "," + _y + ")");
			}
		} else if (keyCode == 27) {
			// ESC键，恢复原始值，针对ESC键做以下处理
			window.setTimeout('$("#' + $(this).attr("id") + '").val(' + defaultVal + ');', 10);
		}
	},

	/**
	 * 控件导航单击事件
	 */
	componentNavClick : function() {
		var currentSelected = template.currentSelected;
		var componentNav = $(this);

		if (componentNav.attr("id") == "controls_block")
			return;

		var _text = componentNav.contents().find("tspan").text();// 获取导航文本

		// 导航效果
		if ($.browser.msie) {
			// 处理IE
			template.svgEle.children("#currentControls").attr("transform",
					"translate(0," + (template.getTranslate(componentNav).y - 1) + ")").show();
		} else {
			template.svgEle.children("#currentControls").css({
				"transform" : "matrix(1, 0, 0, 1, 0, " + template.getTranslate(componentNav).y + ")"
			});
		}

		template.svgEle.children("#currentControls").contents().find("tspan").text(_text);
		template.svgEle.children("[for^='controls']").hide();
		template.svgEle.children("[for='" + componentNav.attr("id") + "']").show();
		template.svgEle.attr("componentNav", "show");// 标识组件块为显示
		template.svgEle.find("#deleteMenu").hide();// 隐藏右键删除菜单
		if (currentSelected)
			currentSelected.find("rect[attr='dottedLine']").hide();// 隐藏虚线框
	},

	/**
	 * 控件导航鼠标移入事件
	 */
	componentNavOver : function() {
		var componentNav = $(this);
		componentNav.contents().find("[name='block']").css({
			"fill" : "#DCDCDC"
		});
	},

	/**
	 * 控件导航鼠标移除事件
	 */
	componentNavOut : function() {
		var componentNav = $(this);
		componentNav.contents().find("[name='block']").css({
			"fill" : "#D3D3D3"
		});
	},

	/**
	 * 显示组件关联名称select
	 */
	showComponentList : function() {
		var currentSelected = template.currentSelected;
		var eqType = currentSelected.attr("eqtype");
		var select = $("#c_componentList");
		var showOptions = $("#temp_resultList option[eqtype='" + eqType + "']");
		select.html(showOptions.clone());
		select.prepend("<option eqtype='empty'></option>");

		if (showOptions.length != 0) {
			// 如果有可关联设备
			var idNum = currentSelected.attr("idNum");// 获取idNum，判断是否已经关联了设备
			if (idNum) {
				// 如果当前选中控件已经关联了设备
				select.find("option[_id='" + idNum + "']").attr("selected", true);
			} else {
				select.find("option[eqtype='empty']").attr("selected", true);
			}
			select.attr("disabled", false);
		} else {
			select.html("<option></option>");
			select.attr("disabled", true);
		}
	},

	/**
	 * 将X、Y坐标显示到文本框
	 * 
	 * @param x
	 * @param y
	 * @returns {Boolean}
	 */
	showXY : function(x, y) {
		if (x < 0 || y < 0)// 如果当前控件X或Y坐标为0则停止移动
			return false;
		$("#c_x").val(x).attr("defaultVal", x);
		$("#c_y").val(y).attr("defaultVal", y);
		return true;
	},

	/**
	 * 删除控件
	 * 
	 * @param currentSelected
	 */
	deleteComponent : function(currentSelected) {
		if (currentSelected) {
			if (confirm("确定删除当前控件吗？")) {
				if (currentSelected.attr("state") == consts.EXISTING
						|| currentSelected.attr("state") == consts.MODIFY) {
					// 如果当前控件是已存在的，隐藏控件并标识为删除
					currentSelected.hide();
					currentSelected.attr("state", consts.DELETE);
				} else {
					// 如果是新增加的控件，删除元素
					currentSelected.remove();
				}
				$("#embedNode").removeAttr("originalDocument");// 标识SVG模板文件已被修改，退出页面时提示保存
				template.releaseFocus();
			}
		}
	},

	/**
	 * 控件释放焦点
	 */
	releaseFocus : function() {
		var currentSelected = template.currentSelected;
		if (currentSelected) {
			// 如果当前有选中的控件
			template.attrTextKeydown("blur");
			template.currentSelected = null;// 置空当前选中控件
			currentSelected.find("rect[attr='dottedLine']").hide();// 隐藏虚线框
			$("#bt_turn").attr("disabled", true);// 禁用旋转按钮
			$("#unit_Radio").hide();// 禁用单位radio
			$("#c_componentList,#c_x,#c_y,#c_length").attr("disabled", true).val("");// 禁用并清空文本
			$("#text_componentNumber").hide().val("");
			template.svgEle.find("#deleteMenu").hide();// 隐藏右键删除菜单
			template.svgEle.unbind("keydown").keydown(function() {// 去除元素键盘移动事件并阻止浏览器默认行为
				return false;
			});
		}
	},

	/**
	 * 控件关联select选择事件
	 */
	selectChange : function() {
		var currentSelected = template.currentSelected;
		var selected = $(this).find("option:selected");
		var _id = selected.attr("_id");
		var value = selected.val();
		if (currentSelected && _id) {
			// 如果当前选中对象存在&&当前选项有效(_id存在)
			currentSelected.attr("idNum", _id);
			currentSelected.attr("title", value);
			if (currentSelected.attr("parent") == "container_pingtai_zongfuhe") {
				// 如果当前操作控件是平台
				var name = $.trim(value.substring(0, value.indexOf("平台")));
				currentSelected.contents().find("tspan[class='ptName']").text(name);
			}
		} else {
			currentSelected.removeAttr("idNum").removeAttr("title");// 删除属性
		}
	},

	/**
	 * 单位radio单击事件
	 */
	radioClick : function() {
		var currentSelected = template.currentSelected;
		var checkedVal = $(this).val();
		if (currentSelected) {
			var dataUnit = currentSelected.contents().find("[type='unit']");
			if (checkedVal == "show") {
				dataUnit.show();
				currentSelected.attr("unit", "show");
			} else {
				dataUnit.hide();
				currentSelected.attr("unit", "hide");
			}
		}
	},

	/**
	 * 右击菜单
	 * 
	 * @param e
	 */
	contextmenu : function(e) {
		// 获取当前鼠标点击时X、Y坐标
		var currentSelected = template.currentSelected;
		var contextMenu = template.svgEle.find("#SVGContextMenu");
		var mX = e.clientX;
		var mY = e.clientY;
		template.svgEle.contents().find("rect[attr='dottedLine']").hide();
		currentSelected.find("rect[attr='dottedLine']").show();
		contextMenu.attr("transform", "translate(" + mX + "," + mY + ")");
		contextMenu.find("#deleteMenu").show();
	},

	/**
	 * 浏览器关闭事件
	 * 
	 * @returns {String}
	 */
	browserBeforeunload : function(e) {
		if (!$("#embedNode").attr("originalDocument")) {
			// 如果originalDocument属性为空，代表当前模板已被修改
			return "模板尚未保存，确定关闭页面吗？";
		}
	},

	/**
	 * 获取控件Translate属性得到坐标位置
	 * 
	 * @param element
	 * @returns {___retVal1}
	 */
	getTranslate : function(element) {
		var translate = element.attr("transform");

		// 处理IE浏览器
		var isIE = $.browser.msie;
		if (!translate)
			translate = isIE ? "translate(0 0)" : "translate(0,0)";

		var s = translate.indexOf("(");
		var e = translate.indexOf(")");
		var x_y = translate.slice(s + 1, e);
		var retVal = x_y.split(isIE ? " " : ",");
		retVal.x = retVal[0];
		retVal.y = retVal[1];

		return retVal;
	},

	/**
	 * 获取控件transform样式中的缩放值
	 * 
	 * @param element
	 * @returns {___retVal2}
	 */
	getTransform : function(element) {
		var transform = element.css("transform");

		if (!transform || transform == "none")
			transform = "(1,0,0,1,0,0)"

		var s = transform.indexOf("(");
		var e = transform.indexOf(")");
		var x_y = transform.substring(s + 1, e);
		var retVal = x_y.split(",");
		retVal.x = retVal[0];
		retVal.y = retVal[3];

		return retVal;
	},

	/**
	 * 设置模板宽高
	 */
	setTemplateWH : function(width, height) {
		template.svgEle.attr("width", width).attr("height", height);
		template.svgEle.find("#controls_block").attr("height", height);
		template.svgEle.find("#SVGContainer").attr("width", width).attr("height", height);
		$("#embedNode").removeAttr("originalDocument");// 标识SVG模板文件已被修改，退出页面时提示保存
	}
}