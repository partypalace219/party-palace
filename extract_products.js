// Extract products from app.js and create SQL insert statements
const fs = require('fs');

// Read app.js
const appJs = fs.readFileSync('app.js', 'utf8');

// Find the products array
const productsMatch = appJs.match(/const products = \[([\s\S]*?)\];/);
if (!productsMatch) {
    console.error('Could not find products array');
    process.exit(1);
}

// Parse the products (this is a simplified parser)
const productsString = productsMatch[1];

// Since products can have base64 images, we need to be careful
// Let's extract each product object carefully
const products = [];
let depth = 0;
let currentProduct = '';
let inString = false;
let stringChar = '';

for (let i = 0; i < productsString.length; i++) {
    const char = productsString[i];
    const prevChar = productsString[i - 1] || '';
    
    // Handle string boundaries
    if ((char === '"' || char === "'") && prevChar !== '\') {
        if (!inString) {
            inString = true;
            stringChar = char;
        } else if (char === stringChar) {
            inString = false;
        }
    }
    
    if (!inString) {
        if (char === '{') depth++;
        if (char === '}') depth--;
    }
    
    currentProduct += char;
    
    if (!inString && depth === 0 && char === '}') {
        // Found complete product
        currentProduct = currentProduct.trim();
        if (currentProduct.startsWith('{')) {
            products.push(currentProduct);
            currentProduct = '';
        }
    }
}

console.log(`Found ${products.length} products`);

// Now generate SQL
const sqlStatements = [];

products.forEach(productStr => {
    try {
        // Use eval to parse the product object (safe in this controlled context)
        const product = eval('(' + productStr + ')');
        
        const name = product.name.replace(/'/g, "''");
        const category = product.category;
        const description = (product.description || '').replace(/'/g, "''");
        const price = product.price;
        const priceLabel = (product.priceLabel || 'starting at').replace(/'/g, "''");
        const featured = product.popular ? 'true' : 'false';
        const emoji = product.icon || '';
        const hasGallery = product.hasGallery ? 'true' : 'false';
        
        // Handle images array if present
        let imagesJson = 'NULL';
        if (product.images && product.images.length > 0) {
            // Convert images array to JSON, escaping single quotes
            imagesJson = "'" + JSON.stringify(product.images).replace(/'/g, "''") + "'::jsonb";
        }
        
        const sql = `INSERT INTO products (name, category, description, price, price_label, featured, emoji, image_url) 
VALUES ('${name}', '${category}', '${description}', ${price}, '${priceLabel}', ${featured}, '${emoji}', ${imagesJson});`;
        
        sqlStatements.push(sql);
    } catch (e) {
        console.error('Error parsing product:', e.message);
    }
});

// Write SQL file
fs.writeFileSync('migrate_products.sql', sqlStatements.join('\n\n'));
console.log(`Generated migrate_products.sql with ${sqlStatements.length} INSERT statements`);
