/**
 * WooCommerce Product Discovery Script
 *
 * This script fetches all products from your WooCommerce store
 * and displays their IDs, names, and types to help you configure
 * the product plan mapping in .env.local
 *
 * Usage: npx tsx scripts/discover-woo-products.ts
 */

import 'dotenv/config';

interface WooProduct {
  id: number;
  name: string;
  type: string;
  status: string;
  price: string;
  regular_price: string;
  categories: Array<{ id: number; name: string }>;
}

async function discoverProducts() {
  const WOO_STORE_URL = process.env.WOO_STORE_URL;
  const WOO_CONSUMER_KEY = process.env.WOO_CONSUMER_KEY;
  const WOO_CONSUMER_SECRET = process.env.WOO_CONSUMER_SECRET;

  if (!WOO_STORE_URL || !WOO_CONSUMER_KEY || !WOO_CONSUMER_SECRET) {
    console.error('❌ Missing WooCommerce credentials in .env.local');
    console.error('Required: WOO_STORE_URL, WOO_CONSUMER_KEY, WOO_CONSUMER_SECRET');
    process.exit(1);
  }

  console.log('🔍 Discovering WooCommerce Products...\n');
  console.log(`Store: ${WOO_STORE_URL}\n`);

  try {
    const auth = Buffer.from(`${WOO_CONSUMER_KEY}:${WOO_CONSUMER_SECRET}`).toString('base64');
    const baseUrl = `${WOO_STORE_URL}/wp-json/wc/v3`;

    // Fetch all products (with pagination)
    const allProducts: WooProduct[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore) {
      const url = `${baseUrl}/products?page=${page}&per_page=${perPage}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${response.status} - ${error}`);
      }

      const products: WooProduct[] = await response.json();
      allProducts.push(...products);

      if (products.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log(`Found ${allProducts.length} products:\n`);
    console.log('═'.repeat(80));

    // Group products by type
    const subscriptions = allProducts.filter(p =>
      p.type === 'subscription' ||
      p.type === 'variable-subscription' ||
      p.name.toLowerCase().includes('subscription') ||
      p.name.toLowerCase().includes('plan')
    );

    const other = allProducts.filter(p => !subscriptions.includes(p));

    if (subscriptions.length > 0) {
      console.log('\n📦 SUBSCRIPTION PRODUCTS (use these for plan mapping):');
      console.log('─'.repeat(80));
      subscriptions.forEach(product => {
        console.log(`ID: ${product.id.toString().padEnd(8)} | ${product.name}`);
        console.log(`  Type: ${product.type.padEnd(20)} | Price: $${product.price || product.regular_price || '0'}`);
        if (product.categories.length > 0) {
          console.log(`  Categories: ${product.categories.map(c => c.name).join(', ')}`);
        }
        console.log('');
      });
    }

    if (other.length > 0) {
      console.log('\n📦 OTHER PRODUCTS:');
      console.log('─'.repeat(80));
      other.forEach(product => {
        console.log(`ID: ${product.id.toString().padEnd(8)} | ${product.name}`);
        console.log(`  Type: ${product.type.padEnd(20)} | Status: ${product.status}`);
        console.log('');
      });
    }

    console.log('═'.repeat(80));
    console.log('\n📝 CONFIGURATION GUIDE:\n');
    console.log('Add these to your .env.local file:\n');

    if (subscriptions.length >= 2) {
      const standardId = subscriptions[0].id;
      const proId = subscriptions[1].id;
      console.log(`# Example configuration based on your products:`);
      console.log(`WOO_STANDARD_PRODUCT_IDS=${standardId}  # ${subscriptions[0].name}`);
      console.log(`WOO_PRO_PRODUCT_IDS=${proId}  # ${subscriptions[1].name}`);
    } else if (subscriptions.length === 1) {
      console.log(`# You have one subscription product:`);
      console.log(`WOO_STANDARD_PRODUCT_IDS=${subscriptions[0].id}  # ${subscriptions[0].name}`);
      console.log(`WOO_PRO_PRODUCT_IDS=  # Add your pro plan product ID here`);
    } else {
      console.log(`# No subscription products found. Manual configuration needed:`);
      console.log(`WOO_STANDARD_PRODUCT_IDS=123,456  # Add your standard plan product IDs`);
      console.log(`WOO_PRO_PRODUCT_IDS=789  # Add your pro plan product IDs`);
    }

    console.log('\n✅ Discovery complete!');

  } catch (error) {
    console.error('❌ Error discovering products:', error);
    process.exit(1);
  }
}

discoverProducts();
