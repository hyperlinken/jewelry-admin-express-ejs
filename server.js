const express = require('express');
const path = require('path');
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
const ADMIN_CREDENTIALS = { username: 'admin', password: 'admin123' };

// In-memory products store (replaceable with DB in future)
let PRODUCTS = {};

// ============ MIDDLEWARE ============
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));
app.use(express.static(path.join(process.cwd(), 'public')));

app.use(session({ secret: 'secret_key', resave: false, saveUninitialized: true }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Server error');
});

// ============ ROUTES ============

// Home
app.get(['/', '/branch', '/collection', '/about', '/contact'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Product types
const PRODUCT_TYPES = ['Ring', 'Bracelet', 'Necklace', 'Earring', 'Pendant', 'Nose Pin', 'Bangle'];

// ============ COLLECTION ROUTES ============
function renderCollection(route, category, title) {
  app.get(route, (req, res) => {
    const categoryProducts = PRODUCTS[category] || {};
    const productsByType = {};
    for (const [id, product] of Object.entries(categoryProducts)) {
      const type = product.type || 'Uncategorized';
      if (!productsByType[type]) productsByType[type] = [];
      productsByType[type].push({ ...product, id });
    }
    res.render(category, { title, products: productsByType, productTypes: PRODUCT_TYPES });
  });
}

renderCollection('/gold', 'gold', 'Gold Collection');
renderCollection('/silver', 'silver', 'Silver Collection');
renderCollection('/diamond', 'diamond', 'Diamond Collection');
renderCollection('/gemstone', 'gemstone', 'Gemstone Collection');

app.get('/:name', (req, res) => {
  const cat = req.params.name.toLowerCase();
  if (!PRODUCTS[cat]) return res.status(404).send('Category not found');
  res.render('category', { category: cat, items: PRODUCTS[cat] });
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
app.get('/admin/logout', (req, res) => req.session.destroy(() => res.redirect('/admin/login')));

// Admin dashboard
app.get('/admin', requireAdminAuth, (req, res) => {
  res.render('admin', { title: 'Admin Panel', products: PRODUCTS });
});

// ============ PRODUCT CRUD ============

// Upload
app.post("/admin/upload", requireAdminAuth, upload.single("image"), (req, res) => {
  const { category, type, name, description, price } = req.body;
  if (!req.file) return res.status(400).send("No file uploaded");

  if (!PRODUCTS[category]) PRODUCTS[category] = {};

  const id = Date.now().toString();
  PRODUCTS[category][id] = {
    id,
    name,
    description,
    price: parseInt(price),
    type: type || 'Uncategorized',
    image: req.file.path,
    public_id: req.file.filename
  };

  res.redirect('/admin');
});

// Delete
app.post('/admin/delete', requireAdminAuth, async (req, res) => {
  const { category, id } = req.body;
  const product = PRODUCTS[category]?.[id];
  if (product?.public_id) await cloudinary.uploader.destroy(product.public_id);

  if (PRODUCTS[category]) delete PRODUCTS[category][id];
  res.redirect('/admin');
});

// Update
app.post('/admin/update', requireAdminAuth, upload.single('image'), async (req, res) => {
  const { category, id, type, name, description, price } = req.body;
  const product = PRODUCTS[category]?.[id];
  if (!product) return res.status(404).send("Product not found");

  product.name = name;
  product.description = description;
  product.price = parseInt(price);
  product.type = type || 'Uncategorized';

  if (req.file) {
    if (product.public_id) await cloudinary.uploader.destroy(product.public_id);
    product.image = req.file.path;
    product.public_id = req.file.filename;
  }

  res.redirect('/admin');
});

// ============ EXPORT ============
module.exports = app;
