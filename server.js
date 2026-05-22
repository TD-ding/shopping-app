const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const productsPath = path.join(__dirname, 'data', 'products.json');
const ordersPath = path.join(__dirname, 'data', 'orders.json');

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// 获取所有商品
app.get('/api/products', (req, res) => {
  const products = readJSON(productsPath);
  res.json(products);
});

// 获取商品分类列表
app.get('/api/categories', (req, res) => {
  const products = readJSON(productsPath);
  const categories = [...new Set(products.map(p => p.category))];
  res.json(categories);
});

// 提交订单
app.post('/api/orders', (req, res) => {
  const { name, phone, address, items } = req.body;

  if (!name || !phone || !address || !items || items.length === 0) {
    return res.status(400).json({ error: '请填写完整的收货信息' });
  }

  const orders = readJSON(ordersPath);
  const order = {
    id: Date.now(),
    name,
    phone,
    address,
    items,
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    createdAt: new Date().toISOString()
  };

  orders.push(order);
  writeJSON(ordersPath, orders);
  res.json({ message: '下单成功', order });
});

// 获取订单列表
app.get('/api/orders', (req, res) => {
  const orders = readJSON(ordersPath);
  res.json(orders);
});

app.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
});
