---
sidebar_label: 'layui-Form小结'
sidebar_position: 1
title: 使用Form组件过程中遇到的问题解决
date: 2024-06-26
authors: syn
---

#### 监听select的选择事件
```javascript
<select title="相关单位"  id="AAA">
    <option value=""></option>
	<option value="1">全部</option>
	<option value="2">上海</option>
</select>
<script data-th-inline="none" type="text/javascript">
layui.use(['form'], function(){
    var form = layui.form;

    form.on('select(AAA)', function(data){
        console.log(data.value); // 被选中的值
    });
})
</script>
```

#### 获取form表单中字段值的两种方法
##### 方法1：直接通过 DOM 元素获取值
```javascript
var validEndDateInput = document.getElementById('validEndDate');
var endDateValue = validEndDateInput.value;
console.log(endDateValue); // 输出当前输入框中的日期值
```
##### 方法 2: 使用 jQuery（如果项目中包含 jQuery）
```javascript
var endDateValue = $('#validEndDate').val();
console.log(endDateValue); // 输出当前输入框中的日期值
```
#### 两级选择框联动
```html
<select title="国家" name="country" id="country">
 	<option value="">请选择国家</option>
</select>
<select title="城市" name="city" id="city">
 	<option value="">请选择城市</option>
</select>
```
```javascript
<script data-th-inline="javascript">
layui.use([ 'jquery','form'],function() {
	var $ = layui.jquery;
	var	form = layui.form;
    var	targetWeight ='';
    form.on('select(country)', function(data){
        var elem = data.elem;  // 获得 select 原始 DOM 对象
        var	countryId = data.value; // 获得被选中的国家id
        var countryName = this.innerHTML;// 获得选中的国家名称
        var selectedOption = elem.querySelector('option[value="' + countryId + '"]'); // 通过value找到对应的option
            targetWeight = selectedOption.getAttribute('data-weight'); // 获取data-result属性的值

            $.ajax({
                url:'syn/findCitys',
                method:"GET",
                data:{countryId:countryId},
                dataType:'json',
                success:function(response){
                    $('#city').find('option:not(:first)').remove();// 清空考核项
                    var selectElement = document.querySelector('#city');
                    var jsonString = JSON.stringify(response.data);
                    var dynamicData = JSON.parse(jsonString);
                    dynamicData.forEach(function(item) {
                        var option = document.createElement('option');
                        option.value = item.itemId;
                        option.textContent = item.itemName;
                        option.setAttribute('data-scores', item.score);
                        selectElement.append(option);
                    });
                form.render('select');
                }
            });	 
    });
    // select 事件
    var targetItemName = '';
    form.on('select(city)', function(data){
        var elem = $(data.elem);
        var selectedOption = elem.find('option:selected');
        var dataResult = selectedOption.data('scores');
            targetItemName = this.innerHTML;// 获得选中的城市名称
            form.val("formId", {
                "score": dataResult,
                "result":Math.round((targetWeight*dataResult)*Math.pow(10, 2)) / Math.pow(10, 2)  
            });
    });	
});	
</script> 
```
#### 三级选择框联动
```html
<select name="stuNo" id="stuNo">
	<option value="">请输入/选择学号</option>
</select>
<select name="stuName" id="stuName">
	<option value="">请输入/选择姓名</option>
</select>
<select name="deptName" id="deptName">
	<option value="">请输入/选择班级</option>
</select>
```
```javascript
<script data-th-inline="javascript">
layui.use([ 'jquery','form'],function() {
	var $ = layui.jquery;
	var	form = layui.form;
    var student = [[${student}]];
    var gradeNo = student.gradeNo;//获得年级
		$.ajax({
			url : 'student/findBasicInfos/'+gradeNo,
			method: 'GET',
			dataType: 'json',
			success: function(res){
				var selectElementNo = document.querySelector('select#stuNO');
		        var selectElementName = document.querySelector('select#stuName');
		        var selectElementDeptName = document.querySelector('select#deptName');
		        
		        if (res.length > 0) {
		            res.forEach(function (item) {
		            	
		                var optionNo = new Option(item.stuNO, item.stuNO); 
		                var optionName = new Option(item.stuName, item.stuNO); // 将stuName与对应的stuNo关联起来
		                var optionDeptName = new Option(item.deptName, item.stuNO); // 将deptName与对应的stuNo关联起来

		                selectElementNo.add(optionNo);
		                selectElementName.add(optionName);
		                selectElementDeptName.add(optionDeptName);
		            });
		        }
		        
				form.render('select');
				
				// 监听stuNo下拉框的change事件
		        form.on('select(stuNo)', function(data){
		            var selectedNo = data.value;
		            // 在stuName下拉框中找到对应的选项并设置为选中状态
		            $('select#stuName').val(selectedNo);
		            $('select#deptName').val(selectedNo);
 		            //$('select#stuName').find('option[value="'+selectedNo+'"]').prop('selected', true);// 方法二
		            form.render('select');
		        });
		        form.on('select(stuName)', function(data){
		        	var selectedCName = data.value;
	                // 遍历stuNo下拉框的option元素，匹配对应的值并选中
	                $('select#stuNo option').each(function(){
	                    if($(this).val() === selectedCName){
	                        $(this).prop('selected', true);
	                    }
	                });
	             	// 遍历deptName下拉框的option元素，匹配对应的值并选中
	                $('select#deptName option').each(function(){
	                    if($(this).val() === selectedCName){
	                        $(this).prop('selected', true);
	                    }
	                });
		            form.render('select');
		        });
			}
		
		});
});	
</script> 
```
#### 自定义验证规则
```html
<div class="layui-input-inline">
     <input type="text" name="schoolName" id="schoolName" class="layui-input" lay-verify="rule2">
</div>
```
```javascript
form.verify({
    rule1 : function(value){
        if (value.length>250) {
            return '最多输入250字';
        }
    },
    rule2 : function(value){
        if(value.length<1){
            return '不能为空,请选择';
        }
    }
});

```       
#### 表单字段后面加提示
```html
<div class="layui-input-inline">
	 <select name="stuNO" id="stuNO"  lay-filter="stuNO" lay-verify="required">
	        <option value="">请输入/选择学号</option>
	</select>
</div>
<div class="layui-form-mid layui-text-em" id="stuNoTip" style="color:#FF0000"></div>

```
```javascript
var textNode = document.createTextNode('注：只能输入/选择'+student.gradeName+'及其子班级内学生的学号');
	document.getElementById('stuNoTip').appendChild(textNode);
```
