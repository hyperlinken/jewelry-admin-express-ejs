const express = require('express');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const app = express();

// ============ CONFIG ============

// Cloudinary - use environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'djtoefz3n',
  api_key: process.env.CLOUDINARY_API_KEY || '589533349818838',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'khseu9GGysYqnmUlktMEf9s4aFk'
});

// Simple in-memory storage for products
let productsData = {
  gold: {},
  silver: {},
  diamond: {},
  gemstone: {}
};

// Memory storage for uploads
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

// Generate a secure secret for tokens
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Product types
const PRODUCT_TYPES = ['Ring', 'Bracelet', 'Necklace', 'Earring', 'Pendant', 'Nose Pin', 'Bangle'];

// ============ MIDDLEWARE ============
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

// Simple token-based authentication (serverless compatible)
function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Store active tokens in memory (for demo purposes)
// In production, consider using a proper database
let activeTokens = new Set();

function requireAdminAuth(req, res, next) {
  const token = req.cookies.adminToken || req.headers['authorization'];
  
  if (token && activeTokens.has(token)) {
    next();
  } else {
    res.redirect('/admin/login');
  }
}

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
  res.render('admin-login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password }); // Debug log
  
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    const token = generateToken();
    activeTokens.add(token);
    
    // Set cookie that expires in 24 hours
    res.cookie('adminToken', token, { 
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    console.log('Login successful, redirecting to admin'); // Debug log
    res.redirect('/admin');
  } else {
    console.log('Login failed'); // Debug log
    res.render('admin-login', { 
      error: 'Invalid credentials. Please try again.' 
    });
  }
});

app.get('/admin/logout', (req, res) => {
  const token = req.cookies.adminToken;
  if (token) {
    activeTokens.delete(token);
  }
  res.clearCookie('adminToken');
  res.redirect('/admin/login');
});

// Admin dashboard
app.get('/admin', requireAdminAuth, (req, res) => {
  res.render('admin', {
    title: 'Admin Panel',
    products: productsData,
    error: null,
    success: null
  });
});

// ============ PRODUCT CRUD ============

// Upload product
app.post("/admin/upload", requireAdminAuth, upload.single("image"), async (req, res) => {
  try {
    const { category, type, name, description, price } = req.body;
    console.log('Upload request:', { category, type, name }); // Debug log

    if (!req.file) {
      return res.status(400).render('admin', { 
        error: "No file uploaded.",
        products: productsData,
        success: null
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

    res.render('admin', {
      title: 'Admin Panel',
      products: productsData,
      error: null,
      success: 'Product uploaded successfully!'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).render('admin', { 
      error: "Error uploading product: " + error.message,
      products: productsData,
      success: null
    });
  }
});

// Delete product
app.post('/admin/delete', requireAdminAuth, async (req, res) => {
  try {
    const { category, id } = req.body;
    console.log('Delete request:', { category, id }); // Debug log
    
    if (!productsData[category] || !productsData[category][id]) {
      return res.status(404).render('admin', { 
        error: "Product not found",
        products: productsData,
        success: null
      });
    }

    const product = productsData[category][id];

    // Delete from Cloudinary
    if (product.public_id) {
      await cloudinary.uploader.destroy(product.public_id);
    }

    delete productsData[category][id];
    
    res.render('admin', {
      title: 'Admin Panel',
      products: productsData,
      error: null,
      success: 'Product deleted successfully!'
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).render('admin', { 
      error: "Error deleting product: " + error.message,
      products: productsData,
      success: null
    });
  }
});

// Update product
app.post('/admin/update', requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    const { category, id, type, name, description, price } = req.body;
    console.log('Update request:', { category, id, name }); // Debug log
    
    if (!productsData[category] || !productsData[category][id]) {
      return res.status(404).render('admin', { 
        error: "Product not found",
        products: productsData,
        success: null
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

    res.render('admin', {
      title: 'Admin Panel',
      products: productsData,
      error: null,
      success: 'Product updated successfully!'
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).render('admin', { 
      error: "Error updating product: " + error.message,
      products: productsData,
      success: null
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    admin: activeTokens.size > 0 ? 'Logged in' : 'Not logged in'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found' });
});

// ============ EXPORT FOR VERCEL ============
module.exports = app;