# 后端文档

## 概述

Mini Shop 后端基于 Node.js + Express 构建，提供 RESTful API，使用 JSON 文件作为数据存储。

## 技术栈

- **运行时**：Node.js
- **框架**：Express 4.x
- **数据存储**：JSON 文件（无需数据库）

## 文件结构

```
server.js              # 主服务文件（路由 + 业务逻辑）
data/
├── products.json      # 商品数据
└── orders.json        # 订单数据（运行时自动创建）
```

## 配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| PORT | 3000 | 服务监听端口 |
| MAX_QUANTITY | 99 | 单品最大购买数量 |

## API 接口

### 获取商品列表

```
GET /api/products
```

**响应**：

```json
[
  {
    "id": 1,
    "name": "MacBook Pro 16寸",
    "price": 18999,
    "category": "电脑",
    "image": "https://picsum.photos/seed/macbook/400/300",
    "description": "Apple M3 Pro 芯片，18GB 内存，512GB 存储"
  }
]
```

### 获取分类列表

```
GET /api/categories
```

**响应**：

```json
["电脑", "手机", "配件", "游戏"]
```

说明：从商品数据中自动提取去重后的分类列表。

### 提交订单

```
POST /api/orders
Content-Type: application/json
```

**请求体**：

```json
{
  "name": "张三",
  "phone": "13800138000",
  "address": "北京市朝阳区XX路XX号",
  "items": [
    { "id": 1, "quantity": 2 },
    { "id": 3, "quantity": 1 }
  ]
}
```

**成功响应**：

```json
{
  "message": "下单成功",
  "order": {
    "id": 1700000000000,
    "name": "张三",
    "phone": "13800138000",
    "address": "北京市朝阳区XX路XX号",
    "items": [
      { "id": 1, "name": "MacBook Pro 16寸", "price": 18999, "quantity": 2 },
      { "id": 3, "name": "AirPods Pro 2", "price": 1899, "quantity": 1 }
    ],
    "total": 39897,
    "createdAt": "2024-01-15T08:30:00.000Z"
  }
}
```

**错误响应** (HTTP 400)：

```json
{ "error": "请填写完整的收货信息" }
```

### 获取订单列表

```
GET /api/orders
```

**响应**：

```json
[
  {
    "id": 1700000000000,
    "name": "张三",
    "phone": "13800138000",
    "address": "北京市朝阳区XX路XX号",
    "items": [
      { "id": 1, "name": "MacBook Pro 16寸", "price": 18999, "quantity": 2 }
    ],
    "total": 37998,
    "createdAt": "2024-01-15T08:30:00.000Z"
  }
]
```

## 数据模型

### 商品 (Product)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Number | 商品唯一标识 |
| name | String | 商品名称 |
| price | Number | 单价（单位：元） |
| category | String | 分类名称 |
| image | String | 商品图片 URL |
| description | String | 商品描述 |

### 订单 (Order)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Number | 订单号（时间戳生成） |
| name | String | 收货人姓名 |
| phone | String | 手机号码 |
| address | String | 收货地址 |
| items | Array | 订单商品列表（含 name, price） |
| total | Number | 订单总金额（服务端计算） |
| createdAt | String | 创建时间（ISO 8601） |

## 验证规则

### 订单提交验证

1. **必填校验**：name、phone、address、items 均不能为空
2. **items 校验**：不能为空数组
3. **手机号格式**：正则 `^1[3-9]\d{9}$`（1开头，第二位3-9，共11位）
4. **商品存在性**：每个 item.id 必须在商品列表中存在
5. **数量校验**：quantity 必须为正整数且 ≤ 99
6. **价格计算**：服务端根据商品实际价格重新计算 total，不信任前端传入的价格

## 错误处理

- 所有 API 错误返回 HTTP 400 + JSON `{ error: "错误描述" }`
- JSON 文件读取失败时返回空数组（`readJSON` 容错处理）
- JSON 文件不存在时返回空数组（`readJSON` 检查文件是否存在）

## 静态文件服务

- Express 静态文件中间件指向 `public/` 目录
- 访问根路径 `/` 自动返回 `public/index.html`
