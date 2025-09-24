// migrate.js
const fs = require('fs');
const path = require('path');

// Path to your products data
const dataPath = path.join(__dirname, 'data', 'products.json');

// Default product type for existing items
const DEFAULT_TYPE = 'Ring';

// Function to migrate the data
function migrateData() {
  try {
    console.log('Starting migration...');
    
    // Read the current data
    const productsData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    let changed = false;
    
    // Process each category
    for (const category in productsData) {
      // Check if this category uses the old array format
      if (Array.isArray(productsData[category])) {
        console.log(`Migrating ${category} category...`);
        changed = true;
        
        // Convert array to object with IDs as keys
        const newCategoryData = {};
        
        productsData[category].forEach((product, index) => {
          // Ensure each product has an ID
          const id = product.id || `temp_${Date.now()}_${index}`;
          
          // Add default type if missing
          if (!product.type) {
            product.type = DEFAULT_TYPE;
          }
          
          // Add to new structure
          newCategoryData[id] = product;
        });
        
        // Replace the array with the new object structure
        productsData[category] = newCategoryData;
      } else {
        console.log(`Checking ${category} category for missing types...`);
        
        // For existing object structure, just ensure each product has a type
        for (const id in productsData[category]) {
          if (!productsData[category][id].type) {
            console.log(`Adding type to product ${id} in ${category}`);
            changed = true;
            productsData[category][id].type = DEFAULT_TYPE;
          }
        }
      }
    }
    
    if (changed) {
      // Backup the original file
      const backupPath = dataPath + '.backup.' + new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(dataPath, backupPath);
      console.log(`Backup created at: ${backupPath}`);
      
      // Write the migrated data
      fs.writeFileSync(dataPath, JSON.stringify(productsData, null, 4));
      console.log('Migration completed successfully!');
    } else {
      console.log('No migration needed - data is already in the correct format.');
    }
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateData();
}

module.exports = migrateData;