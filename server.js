const express = require('express');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const bodyParser = require('body-parser');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);

const app = express();

// ============ CONFIG ============

// Cloudinary - use environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'djtoefz3n',
  api_key: process.env.CLOUDINARY_API_KEY || '589533349818838',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'khseu9GGysYqnmUlktMEf9s4aFk'
});

// In-memory storage for products (serverless compatible)
let productsData = {
  gold: {},
  silver: {},
  diamond: {},
  gemstone: {}
};

// Mock file storage for serverless environment
const memoryStorage = multer.memoryStorage();
const upload = multer({ 
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Admin credentials - use environment variables
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

// Product types
const PRODUCT_TYPES = ['Ring', 'Bracelet', 'Necklace', 'Earring', 'Pendant', 'Nose Pin', 'Bangle'];

// ============ MIDDLEWARE ============
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

// Serverless-compatible session storage
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key_change_in_production',
  resave: false,
  saveUninitialized: false,
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer Error:', err);
    return res.status(400).send(`File upload error: ${err.message}`);
  }
  console.error('Server Error:', err);
  res.status(500).send('Something went wrong!');
});

// ============ ROUTES ============

// Home and static pages
app.get(['/', '/branch', '/collection', '/about', '/contact'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Collection routes
function renderCollection(route, category, title) {
  app.get(route, (req, res) => {
    try {
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
      console.error("Error loading products:", err);
      res.status(500).render('error', { message: "Error loading products" });
    }
  });
}

renderCollection('/gold', 'gold', 'Gold Collection');
renderCollection('/silver', 'silver', 'Silver Collection');
renderCollection('/diamond', 'diamond', 'Diamond Collection');
renderCollection('/gemstone', 'gemstone', 'Gemstone Collection');

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
    res.render('admin-login', { error: 'Invalid credentials' });
  }
});

function requireAdminAuth(req, res, next) {
  if (req.session.isAdmin) {
    next();
  } else {
    res.redirect('/admin/login');
  }
}

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// Admin dashboard
app.get('/admin', requireAdminAuth, (req, res) => {
  res.render('admin', {
    title: 'Admin Panel',
    products: productsData
  });
});

// ============ PRODUCT CRUD (Serverless Compatible) ============

// Upload product
app.post("/admin/upload", requireAdminAuth, upload.single("image"), async (req, res) => {
  try {
    const { category, type, name, description, price } = req.body;

    if (!req.file) {
      return res.status(400).render('admin', { 
        error: "No file uploaded.",
        products: productsData 
      });
    }

    // Upload to Cloudinary from buffer
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `jewelry/${category || "general"}`,
          allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    const newProduct = {
      id: Date.now().toString(),
      name,
      description,
      price: parseInt(price),
      type: type || 'Uncategorized',
      image: result.secure_url,
      public_id: result.public_id
    };

    if (!productsData[category]) {
      productsData[category] = {};
    }

    productsData[category][newProduct.id] = newProduct;

    res.redirect("/admin");
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).render('admin', { 
      error: "Error uploading product",
      products: productsData 
    });
  }
});

// Delete product
app.post('/admin/delete', requireAdminAuth, async (req, res) => {
  try {
    const { category, id } = req.body;
    
    if (!productsData[category] || !productsData[category][id]) {
      return res.status(404).render('admin', { 
        error: "Product not found",
        products: productsData 
      });
    }

    const product = productsData[category][id];

    // Delete from Cloudinary
    if (product.public_id) {
      await cloudinary.uploader.destroy(product.public_id);
    }

    delete productsData[category][id];
    res.redirect('/admin');
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).render('admin', { 
      error: "Error deleting product",
      products: productsData 
    });
  }
});

// Update product
app.post('/admin/update', requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    const { category, id, type, name, description, price } = req.body;
    
    if (!productsData[category] || !productsData[category][id]) {
      return res.status(404).render('admin', { 
        error: "Product not found",
        products: productsData 
      });
    }

    const product = productsData[category][id];
    product.name = name;
    product.description = description;
    product.price = parseInt(price);
    product.type = type || 'Uncategorized';

    if (req.file) {
      // Delete old image from Cloudinary
      if (product.public_id) {
        await cloudinary.uploader.destroy(product.public_id);
      }

      // Upload new image
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `jewelry/${category || "general"}`,
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      product.image = result.secure_url;
      product.public_id = result.public_id;
    }

    res.redirect('/admin');
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).render('admin', { 
      error: "Error updating product",
      products: productsData 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found' });
});

// ============ EXPORT FOR VERCEL ============
module.exports = app;