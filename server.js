const express = require("express");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// serve static files
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// ==========================
// FILE DATA
// ==========================
const DATA_FILE = "products.json";
const USERS_FILE = "users.json";

// pastikan products.json ada
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]");
}

// pastikan users.json ada
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]");
}

// ==========================
// MULTER CONFIG (UPLOAD GAMBAR)
// ==========================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ==========================
// HELPER LOAD & SAVE
// ==========================
function loadProducts() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveProducts(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

// ======================================================
// 🔐 SIMPLE AUTH API (SIGNUP & LOGIN)
// ======================================================

// SIGN UP
app.post("/auth/signup", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password required" });
  }

  const users = loadUsers();
  const exists = users.find((u) => u.email === email);

  if (exists) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    password, // NOTE: untuk demo saja, belum di-hash
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  // jangan kirim password ke frontend
  const { password: _, ...safeUser } = newUser;
  res.json({
    message: "Signup success",
    user: safeUser,
  });
});

// LOGIN
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const users = loadUsers();
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const { password: _, ...safeUser } = user;

  // token simple (demo), nanti bisa diganti JWT
  const fakeToken = `token-${user.id}`;

  res.json({
    message: "Login success",
    token: fakeToken,
    user: safeUser,
  });
});

// ======================================================
// PRODUCT CRUD API
// ======================================================

// LIST PRODUK
app.get("/products", (req, res) => {
  const products = loadProducts();
  res.json(products);
});

// UPLOAD / TAMBAH PRODUK
app.post("/upload", upload.single("image"), (req, res) => {
  const { name, price, description, category } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name || !price) {
    return res.status(400).json({ message: "Name and price are required" });
  }

  const products = loadProducts();
  const newProduct = {
    id: Date.now().toString(),
    name,
    price: Number(price),
    description: description || "",
    category: category || "Uncategorized",
    image,
    createdAt: new Date().toISOString(),
  };

  products.push(newProduct);
  saveProducts(products);

  res.json({ message: "Product uploaded!", product: newProduct });
});

// EDIT PRODUK (tanpa ganti gambar)
app.put("/products/:id", (req, res) => {
  const { id } = req.params;
  const { name, price, description, category } = req.body;

  const products = loadProducts();
  const idx = products.findIndex((p) => p.id === id);

  if (idx === -1) {
    return res.status(404).json({ message: "Product not found" });
  }

  products[idx] = {
    ...products[idx],
    name: name ?? products[idx].name,
    price: price !== undefined ? Number(price) : products[idx].price,
    description: description ?? products[idx].description,
    category: category ?? products[idx].category,
  };

  saveProducts(products);
  res.json({ message: "Product updated", product: products[idx] });
});

// DELETE PRODUK
app.delete("/products/:id", (req, res) => {
  const { id } = req.params;
  const products = loadProducts();
  const product = products.find((p) => p.id === id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (product.image) {
    const imgPath = path.join(__dirname, product.image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }

  const filtered = products.filter((p) => p.id !== id);
  saveProducts(filtered);

  res.json({ message: "Product deleted" });
});

// ======================================================
// AI SIMULATION API
// ======================================================
app.get("/ai/feature-importance", (req, res) => {
  const importance = [
    { feature: "Purchase History", importance: 34 },
    { feature: "Search Frequency", importance: 22 },
    { feature: "Category Preference", importance: 18 },
    { feature: "Click Behavior", importance: 15 },
    { feature: "Rating Behavior", importance: 11 },
  ];
  res.json(importance);
});

app.get("/ai/cluster", (req, res) => {
  const user = req.query.user || "Unknown";

  const clusters = ["Tech Enthusiast", "Fashion Lover", "Budget Shopper", "Lifestyle Shopper"];
  const chosen = clusters[Math.floor(Math.random() * clusters.length)];

  res.json({
    user,
    cluster: chosen,
    description: "Simulated K-Means clustering result",
  });
});

app.get("/ai/recommend", (req, res) => {
  const products = loadProducts();

  const scored = products.map((p) => ({
    ...p,
    aiScore: Math.round((Math.random() * 0.4 + 0.6) * 100),
  }));

  scored.sort((a, b) => b.aiScore - a.aiScore);

  res.json(scored.slice(0, 5));
});

app.get("/ai/model-eval", (req, res) => {
  res.json({
    rmse: 0.83,
    mae: 0.57,
    precisionAtK: 0.89,
    note: "Simulated evaluation metrics",
  });
});

// ======================================================
// START SERVER (LOCAL & RAILWAY READY)
// ======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`SERVER RUNNING on 0.0.0.0:${PORT}`);
});
