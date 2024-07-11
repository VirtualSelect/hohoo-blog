---
sidebar_label: 'layui-Table小结'
sidebar_position: 2
title: 使用Table组件过程中遇到的问题解决
date: 2024-06-26
authors: syn
---

#### 页面静态数据填充
```javascript
<table lay-filter="testTable" lay-data="{id: 'testTable'}"></table>

<script type="text/html" id="barDemo">
  <div class="layui-clear-space">
    <a class="layui-btn layui-btn-xs" lay-event="detail">操作部分</a>
  </div>
</script>

<script data-th-inline="none" type="text/javascript">
layui.use(['jquery','table'], function(){
  var $ = layui.jquery;
  var table = layui.table;
  var $view = $('#页面id');

  function initTable() {
      var tableData = {
          "code": 200,
          "msg": "",
          "count": 100,
          "data": [
              {
                  "id": 1,
                  "userName": "张三",
                  "userNO": "00000",
              },
              {
                  "id": 2,
                  "userName": "李四",
                  "userNO": "1111"
              },
              {
                  "id": 3,
                  "userName": "王五",
                  "userNO": "22222"
              }
          ]
      };

      var tableIns = table.init({
          elem: $view.find('table'),
          data: tableData.data,
          toolbar: '#toolbarDemo',
	      defaultToolbar: ['filter','print'],
		  even : true,
		  height: 'full-300',
	      lineStyle: 'height:auto',
          cols: [[
              {field: 'username', title: '姓名',align :'center',width : '8%'},
              {field: 'userNO', title: '工号',align :'center',width : '8%'},
              {fixed: 'right', title: '操作',align :'center',width : '10%', toolbar: '#barDemo'}
          ]],
		 done:function(){
			 var tds=$view.find('table').find('td');
			 tds.css({
		        'text-align': 'center'
		     });
		 }
      });
  }
  initTable();
    table.on('tool(testTable)', function(obj){
		var data = obj.data; // 获得当前行数据
	    if(obj.event === 'detail'){
	    	syn.modal.open('查看','syn/#',{
		    	  data:{
// 		    		  id: data.id,
		    	  },
		    	  btn: ['关闭'],
		    	  yes : function(index, layero) {
		    		  alert("你确定要关闭吗？");
		    		  layer.close(index);
		  			}
		      });
	    }
	});
});
</script>
```