const express = require('express');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();

// ============ CONFIG ============

// Cloudinary
cloudinary.config({
  cloud_name: 'djtoefz3n',
  api_key: '589533349818838',
  api_secret: 'khseu9GGysYqnmUlktMEf9s4aFk'
});

// Multer storage with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const folder = req.body.category || "general"; 
    return {
      folder: `jewelry/${folder}`,
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
    };
  },
});
const upload = multer({ storage });

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123' 
};

// ============ MIDDLEWARE ============
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

app.use(express.static(path.join(process.cwd(), 'public')));

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer Error:', err);
    return res.status(400).send(`File upload error: ${err.message}`);
  }
  console.error('Server Error:', err);
  res.status(500).send('Something broke!');
});

// ============ ROUTES ============

// Home
app.get(['/', '/branch', '/collection', '/about', '/contact'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// ============ PRODUCT TYPES ============
const PRODUCT_TYPES = ['Ring', 'Bracelet', 'Necklace', 'Earring', 'Pendant', 'Nose Pin', 'Bangle'];

// ============ COLLECTION ROUTES ============
async function renderCollection(route, category, title) {
  app.get(route, async (req, res) => {
    try {
      const dataPath = path.join(process.cwd(), 'data', 'products.json');
      const raw = await fs.promises.readFile(dataPath, 'utf-8');
      const productsData = JSON.parse(raw);
      const categoryProducts = productsData[category] || {};
      
      // Group products by type
      const productsByType = {};
      for (const [id, product] of Object.entries(categoryProducts)) {
        const type = product.type || 'Uncategorized';
        if (!productsByType[type]) productsByType[type] = [];
        productsByType[type].push({...product, id});
      }

      res.render(category, { title, products: productsByType, productTypes: PRODUCT_TYPES });
    } catch (err) {
      console.error("Error reading products file:", err);
      res.status(500).send("Error loading products");
    }
  });
}

renderCollection('/gold', 'gold', 'Gold Collection');
renderCollection('/silver', 'silver', 'Silver Collection');
renderCollection('/diamond', 'diamond', 'Diamond Collection');
renderCollection('/gemstone', 'gemstone', 'Gemstone Collection');

app.get('/:name', async (req, res) => {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'products.json');
    const raw = await fs.promises.readFile(dataPath, 'utf-8');
    const data = JSON.parse(raw);
    const cat = req.params.name.toLowerCase();
    if (!data[cat]) return res.status(404).send('Category not found');
    res.render('category', { category: cat, items: data[cat] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading products");
  }
});

// ============ ADMIN AUTH ============
app.get('/admin/login', (req, res) => res.render('admin-login'));

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    res.send('Invalid credentials');
  }
});

function requireAdminAuth(req, res, next) {
  if (req.session.isAdmin) next();
  else res.redirect('/admin/login');
}

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// Admin dashboard
app.get('/admin', requireAdminAuth, async (req, res) => {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'products.json');
    const raw = await fs.promises.readFile(dataPath, 'utf-8');
    const productsData = JSON.parse(raw);
    res.render('admin', { title: 'Admin Panel', products: productsData });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading products");
  }
});

// ============ PRODUCT CRUD ============
app.post("/admin/upload", requireAdminAuth, upload.single("image"), (req, res) => {
  res.status(501).send("Upload not supported on Vercel serverless function. Use Cloudinary API directly.");
});

app.post("/admin/delete", requireAdminAuth, (req, res) => {
  res.status(501).send("Delete not supported on Vercel serverless function.");
});

app.post("/admin/update", requireAdminAuth, (req, res) => {
  res.status(501).send("Update not supported on Vercel serverless function.");
});

// ============ EXPORT ============
module.exports = app;
