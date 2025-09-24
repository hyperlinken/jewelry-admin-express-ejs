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

// Memory storage for uploads
const memoryStorage = multer.memoryStorage();
const upload = multer({ 
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

// Generate a secure secret for tokens
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Product types
const PRODUCT_TYPES = ['Ring', 'Bracelet', 'Necklace', 'Earring', 'Pendant', 'Nose Pin', 'Bangle'];

// ============ PERSISTENT DATA STORAGE ============

// Store product data in Cloudinary as JSON file
const PRODUCTS_DATA_ID = 'jewelry/products_data';

async function loadProductsData() {
  try {
    console.log('Loading products data from Cloudinary...');
    const result = await cloudinary.api.resource(PRODUCTS_DATA_ID, {
      resource_type: 'raw',
      type: 'upload'
    });
    
    // Download the JSON content
    const response = await fetch(result.secure_url);
    const data = await response.json();
    console.log('Products data loaded successfully');
    return data;
  } catch (error) {
    if (error.http_code === 404) {
      console.log('No existing products data found, starting fresh');
      return {
        gold: {},
        silver: {},
        diamond: {},
        gemstone: {}
      };
    }
    console.error('Error loading products data:', error);
    return {
      gold: {},
      silver: {},
      diamond: {},
      gemstone: {}
    };
  }
}

async function saveProductsData(productsData) {
  try {
    console.log('Saving products data to Cloudinary...');
    // Convert to JSON string
    const dataString = JSON.stringify(productsData, null, 2);
    
    // Upload as raw file
    const result = await cloudinary.uploader.upload(
      `data:application/json;base64,${Buffer.from(dataString).toString('base64')}`,
      {
        public_id: PRODUCTS_DATA_ID,
        resource_type: 'raw',
        overwrite: true
      }
    );
    console.log('Products data saved successfully');
    return result;
  } catch (error) {
    console.error('Error saving products data:', error);
    throw error;
  }
}

// Global variable to cache products data in memory during function execution
let productsDataCache = null;

async function getProductsData() {
  if (!productsDataCache) {
    productsDataCache = await loadProductsData();
  }
  return productsDataCache;
}

async function updateProductsData(updater) {
  const data = await getProductsData();
  await updater(data);
  await saveProductsData(data);
  // Invalidate cache to force reload next time
  productsDataCache = null;
}

// ============ MIDDLEWARE ============
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

// Simple token-based authentication
function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

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

// Collection routes - FIXED: Added async
function renderCollection(route, category, title) {
  app.get(route, async (req, res) => {
    try {
      const productsData = await getProductsData();
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
  console.log('Login attempt:', { username, password });
  
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    const token = generateToken();
    activeTokens.add(token);
    
    res.cookie('adminToken', token, { 
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    console.log('Login successful, redirecting to admin');
    res.redirect('/admin');
  } else {
    console.log('Login failed');
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

// Admin dashboard - FIXED: Added async
app.get('/admin', requireAdminAuth, async (req, res) => {
  try {
    const productsData = await getProductsData();
    res.render('admin', {
      title: 'Admin Panel',
      products: productsData,
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Error loading admin page:', error);
    res.status(500).render('admin', {
      title: 'Admin Panel',
      products: { gold: {}, silver: {}, diamond: {}, gemstone: {} },
      error: 'Error loading products data',
      success: null
    });
  }
});

// ============ PRODUCT CRUD ============

// Upload product - FIXED: Uses persistent storage
app.post("/admin/upload", requireAdminAuth, upload.single("image"), async (req, res) => {
  try {
    const { category, type, name, description, price } = req.body;
    console.log('Upload request:', { category, type, name });

    if (!req.file) {
      const productsData = await getProductsData();
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

    await updateProductsData(async (productsData) => {
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
    });

    const updatedProductsData = await getProductsData();
    res.render('admin', {
      title: 'Admin Panel',
      products: updatedProductsData,
      error: null,
      success: 'Product uploaded successfully!'
    });

  } catch (error) {
    console.error('Upload error:', error);
    const productsData = await getProductsData();
    res.status(500).render('admin', { 
      error: "Error uploading product: " + error.message,
      products: productsData,
      success: null
    });
  }
});

// Delete product - FIXED: Uses persistent storage
app.post('/admin/delete', requireAdminAuth, async (req, res) => {
  try {
    const { category, id } = req.body;
    console.log('Delete request:', { category, id });
    
    await updateProductsData(async (productsData) => {
      if (!productsData[category] || !productsData[category][id]) {
        throw new Error("Product not found");
      }

      const product = productsData[category][id];

      // Delete from Cloudinary
      if (product.public_id) {
        await cloudinary.uploader.destroy(product.public_id);
      }

      delete productsData[category][id];
    });

    const updatedProductsData = await getProductsData();
    res.render('admin', {
      title: 'Admin Panel',
      products: updatedProductsData,
      error: null,
      success: 'Product deleted successfully!'
    });

  } catch (error) {
    console.error('Delete error:', error);
    const productsData = await getProductsData();
    res.status(500).render('admin', { 
      error: "Error deleting product: " + error.message,
      products: productsData,
      success: null
    });
  }
});

// Update product - FIXED: Uses persistent storage
app.post('/admin/update', requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    const { category, id, type, name, description, price } = req.body;
    console.log('Update request:', { category, id, name });
    
    await updateProductsData(async (productsData) => {
      if (!productsData[category] || !productsData[category][id]) {
        throw new Error("Product not found");
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
    });

    const updatedProductsData = await getProductsData();
    res.render('admin', {
      title: 'Admin Panel',
      products: updatedProductsData,
      error: null,
      success: 'Product updated successfully!'
    });

  } catch (error) {
    console.error('Update error:', error);
    const productsData = await getProductsData();
    res.status(500).render('admin', { 
      error: "Error updating product: " + error.message,
      products: productsData,
      success: null
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const productsData = await getProductsData();
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      products_count: Object.keys(productsData.gold).length + 
                     Object.keys(productsData.silver).length + 
                     Object.keys(productsData.diamond).length + 
                     Object.keys(productsData.gemstone).length,
      admin: activeTokens.size > 0 ? 'Logged in' : 'Not logged in'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      error: error.message 
    });
  }
});

// Initialize products data on startup
app.use(async (req, res, next) => {
  // Pre-load products data on first request
  if (!productsDataCache) {
    await getProductsData();
  }
  next();
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found' });
});

// ============ EXPORT FOR VERCEL ============
module.exports = app;