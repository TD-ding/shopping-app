# 部署文档

## 环境要求

- Node.js >= 14.x
- npm >= 6.x

## 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/TD-ding/shopping-app.git
cd shopping-app

# 2. 安装依赖
npm install

# 3. 启动服务
npm start
```

服务启动后访问 http://localhost:3000

## 配置说明

### 端口

默认端口 3000，在 `server.js` 中修改：

```javascript
const PORT = 3000;
```

### 商品数据

商品数据存储在 `data/products.json`，可直接编辑该文件来管理商品。

数据格式：

```json
{
  "id": 1,
  "name": "商品名称",
  "price": 9999,
  "category": "分类",
  "image": "图片URL",
  "description": "商品描述"
}
```

### 订单数据

订单数据存储在 `data/orders.json`，首次提交订单时自动创建。

## 项目结构

```
shopping-app/
├── server.js           # Express 后端服务
├── package.json        # 项目配置
├── data/
│   ├── products.json   # 商品数据
│   └── orders.json     # 订单数据（自动生成）
├── public/
│   ├── index.html      # 前端页面
│   ├── style.css       # 样式
│   └── app.js          # 前端逻辑
└── docs/
    ├── frontend.md     # 前端文档
    ├── backend.md      # 后端文档
    └── deployment.md   # 本文档
```
