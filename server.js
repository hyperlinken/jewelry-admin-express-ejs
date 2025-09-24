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
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// app.get(['/', '/collection', '/branch', '/about', '/contact'], (req, res) => {
//   res.render('index', { title: "Magadh Jewels" });
// });


// Collection routes
function renderCollection(route, category, title) {
  app.get(route, (req, res) => {
    const dataPath = path.join(__dirname, 'data', 'products.json');
    try {
      const productsData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      res.render(category, {
        title,
        products: productsData[category]
      });
    } catch (err) {
      console.error("Error reading products file:", err);
      res.status(500).send("Error loading products");
    }
  });
}

// function renderCollection(route, category, title) {
//   app.get(route, (req, res) => {
//     const dataPath = path.join(__dirname, 'data', 'products.json');
//     try {
//       const productsData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
//       const categoryProducts = productsData[category] || {};

//       // Group products by type
//       const productsByType = {};
//       for (const [id, product] of Object.entries(categoryProducts)) {
//         const type = product.type || 'Uncategorized';
//         if (!productsByType[type]) {
//           productsByType[type] = [];
//         }
//         productsByType[type].push({ ...product, id });
//       }

//       // Always render the SAME file (collection.ejs)
//       res.render("collection", {
//         title,
//         category,
//         products: productsByType,
//         productTypes: PRODUCT_TYPES
//       });
//     } catch (err) {
//       console.error("Error reading products file:", err);
//       res.status(500).send("Error loading products");
//     }
//   });
// }



renderCollection('/gold', 'gold', 'Gold Collection');
renderCollection('/silver', 'silver', 'Silver Collection');
renderCollection('/diamond', 'diamond', 'Diamond Collection');
renderCollection('/gemstone', 'gemstone', 'Gemstone Collection');

app.get('/:name', (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'products.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const cat = req.params.name.toLowerCase();
  if (!data[cat]) return res.status(404).send('Category not found');
  res.render('category', { category: cat, items: data[cat] });
});


// ============ ADMIN AUTH ============
app.get('/admin/login', (req, res) => {
  res.render('admin-login');
});

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
app.get('/admin', requireAdminAuth, (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'products.json');
  const productsData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  res.render('admin', {
    title: 'Admin Panel',
    products: productsData
  });
});

// ============ PRODUCT CRUD ============

// ... existing code ...

// ============ CONFIG ============
// Add product types configuration
const PRODUCT_TYPES = ['Ring', 'Bracelet', 'Necklace', 'Earring', 'Pendant', 'Nose Pin', 'Bangle'];

// ... existing code ...

// ============ ROUTES ============

// Collection routes - updated to handle types
function renderCollection(route, category, title) {
  app.get(route, (req, res) => {
    const dataPath = path.join(__dirname, 'data', 'products.json');
    try {
      const productsData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      const categoryProducts = productsData[category] || {};
      
      // Group products by type
      const productsByType = {};
      for (const [id, product] of Object.entries(categoryProducts)) {
        const type = product.type || 'Uncategorized';
        if (!productsByType[type]) {
          productsByType[type] = [];
        }
        productsByType[type].push({...product, id});
      }
      
      res.render(category, {
        title,
        products: productsByType,
        productTypes: PRODUCT_TYPES
      });
    } catch (err) {
      console.error("Error reading products file:", err);
      res.status(500).send("Error loading products");
    }
  });
}

// ... existing code ...

// ============ PRODUCT CRUD ============

// Upload product - updated to handle type
app.post("/admin/upload", requireAdminAuth, upload.single("image"), (req, res) => {
  const { category, type, name, description, price } = req.body;

  if (!req.file) return res.status(400).send("No file uploaded.");

  const dataPath = path.join(__dirname, "data", "products.json");
  const productsData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const newProduct = {
    id: Date.now(),
    name,
    description,
    price: parseInt(price),
    type: type || 'Uncategorized',
    image: req.file.path,
    public_id: req.file.filename
  };

  if (!productsData[category]) {
    productsData[category] = {};
  }

  // Store products by ID for easier management
  productsData[category][newProduct.id] = newProduct;

  fs.writeFileSync(dataPath, JSON.stringify(productsData, null, 4));
  res.redirect("/admin");
});

// Delete product - updated for new structure
app.post('/admin/delete', requireAdminAuth, async (req, res) => {
  const { category, id } = req.body;
  const dataPath = path.join(__dirname, 'data', 'products.json');
  const productsData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const product = productsData[category][id];

  if (product && product.public_id) {
    await cloudinary.uploader.destroy(product.public_id);
  }

  delete productsData[category][id];
  fs.writeFileSync(dataPath, JSON.stringify(productsData, null, 4));

  res.redirect('/admin');
});

// Update product - updated to handle type
app.post('/admin/update', requireAdminAuth, upload.single('image'), async (req, res) => {
  const { category, id, type, name, description, price } = req.body;
  const dataPath = path.join(__dirname, 'data', 'products.json');
  const productsData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const product = productsData[category][id];
  product.name = name;
  product.description = description;
  product.price = parseInt(price);
  product.type = type || 'Uncategorized';

  if (req.file) {
    if (product.public_id) {
      await cloudinary.uploader.destroy(product.public_id);
    }
    product.image = req.file.path;
    product.public_id = req.file.filename;
  }

  fs.writeFileSync(dataPath, JSON.stringify(productsData, null, 4));
  res.redirect('/admin');
});

// ... existing code ...
// ============ START SERVER ============
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`✅ Server running on port ${PORT}`);
// });

module.exports = app;

