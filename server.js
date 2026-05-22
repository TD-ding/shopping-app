const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const productsPath = path.join(__dirname, 'data', 'products.json');
const ordersPath = path.join(__dirname, 'data', 'orders.json');

const MAX_QUANTITY = 99;

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/products', (req, res) => {
  res.json(readJSON(productsPath));
});

app.get('/api/categories', (req, res) => {
  const products = readJSON(productsPath);
  res.json([...new Set(products.map(p => p.category))]);
});

app.post('/api/orders', (req, res) => {
  const { name, phone, address, items } = req.body;
  if (!name || !phone || !address || !items || items.length === 0) {
    return res.status(400).json({ error: '请填写完整的收货信息' });
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ error: '手机号格式不正确' });
  }
  const allProducts = readJSON(productsPath);
  const productMap = new Map(allProducts.map(p => [p.id, p]));
  let total = 0;
  const verifiedItems = [];
  for (const item of items) {
    const product = productMap.get(item.id);
    if (!product) return res.status(400).json({ error: `商品不存在（id: ${item.id}）` });
    if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > MAX_QUANTITY) {
      return res.status(400).json({ error: '商品数量无效' });
    }
    total += product.price * item.quantity;
    verifiedItems.push({ id: product.id, name: product.name, price: product.price, quantity: item.quantity });
  }
  const orders = readJSON(ordersPath);
  const order = {
    id: Date.now(), name, phone, address,
    items: verifiedItems, total,
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  writeJSON(ordersPath, orders);
  res.json({ message: '下单成功', order });
});

app.get('/api/orders', (req, res) => {
  res.json(readJSON(ordersPath));
});

app.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
});
