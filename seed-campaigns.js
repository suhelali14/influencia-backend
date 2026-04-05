/**
 * seed-campaigns.js
 * Creates 10 realistic campaigns — one per seeded brand,
 * matching each brand's industry with appropriate campaign data.
 *
 * Usage:  node seed-campaigns.js
 * Prereq: seed-50-users.js must have been run first (brands must exist)
 */

const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

/* ════════════════════════════════════════════════════════════════════
 *  CAMPAIGNS — one per brand, industry-appropriate
 * ════════════════════════════════════════════════════════════════════ */
const CAMPAIGNS = [
  // ── Nykaa Beauty (Beauty & Cosmetics) ──────────────────
  {
    brand_email: 'rajiv@nykaa.com',
    title: 'Nykaa Summer Glow Collection Launch',
    description: 'Promote our new Summer Glow 2026 skincare and makeup collection. Creators will receive the full product kit and create "Get Ready With Me" content showcasing the range. Focus on highlighting SPF-infused foundations, waterproof mascaras, and vitamin C serums.',
    platform: 'instagram',
    category: 'beauty',
    budget: 2500000,
    start_date: '2026-04-15',
    end_date: '2026-06-15',
    status: 'active',
    total_creators: 15,
    requirements: {
      min_followers: 50000,
      min_engagement_rate: 4.0,
      content_types: ['reels', 'stories', 'carousel'],
      deliverables: ['3 Instagram Reels', '5 Stories', '1 Carousel Post'],
    },
    target_audience: {
      age_range: '18-35',
      gender: 'female',
      locations: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'],
      interests: ['beauty', 'skincare', 'makeup', 'fashion'],
    },
  },

  // ── boAt Lifestyle (Consumer Electronics) ──────────────
  {
    brand_email: 'aditi@boatlifestyle.com',
    title: 'boAt Airdopes 500 ANC Launch Campaign',
    description: 'Launch campaign for our flagship boAt Airdopes 500 with Active Noise Cancellation. Creators will do unboxing videos, sound quality tests, and lifestyle integration content. Highlight the 50-hour battery life, hybrid ANC, and ENx quad-mic technology.',
    platform: 'youtube',
    category: 'tech',
    budget: 3500000,
    start_date: '2026-04-10',
    end_date: '2026-05-31',
    status: 'active',
    total_creators: 20,
    requirements: {
      min_followers: 100000,
      min_engagement_rate: 3.5,
      content_types: ['video', 'shorts', 'review'],
      deliverables: ['1 Detailed Review Video (8+ min)', '2 YouTube Shorts', '1 Community Post'],
    },
    target_audience: {
      age_range: '18-30',
      gender: 'all',
      locations: ['India'],
      interests: ['tech', 'gadgets', 'music', 'gaming', 'fitness'],
    },
  },

  // ── Mamaearth (Personal Care) ──────────────────────────
  {
    brand_email: 'vikrant@mamaearth.in',
    title: 'Mamaearth Onion Hair Care Challenge',
    description: 'Run a 30-day hair transformation challenge using our Onion Hair Oil and Onion Shampoo range. Creators document their hair journey with before/after content. Focus on natural ingredients, no harmful chemicals, and visible results in 30 days.',
    platform: 'instagram',
    category: 'health',
    budget: 1800000,
    start_date: '2026-05-01',
    end_date: '2026-06-30',
    status: 'active',
    total_creators: 25,
    requirements: {
      min_followers: 25000,
      min_engagement_rate: 5.0,
      content_types: ['reels', 'stories', 'before-after'],
      deliverables: ['4 Reels (weekly progress)', '10 Stories', '1 Before/After carousel'],
    },
    target_audience: {
      age_range: '20-40',
      gender: 'female',
      locations: ['India'],
      interests: ['haircare', 'natural beauty', 'wellness', 'organic'],
    },
  },

  // ── Zomato (Food & Delivery) ───────────────────────────
  {
    brand_email: 'neha@zomato.com',
    title: 'Zomato "Hidden Gems" City Food Series',
    description: 'A multi-city food exploration campaign where creators discover hidden gem restaurants in their cities using Zomato. Each creator covers 5 lesser-known eateries, showcasing the ordering experience, food quality, and value for money. Tie-in with Zomato Gold membership benefits.',
    platform: 'youtube',
    category: 'food',
    budget: 5000000,
    start_date: '2026-04-01',
    end_date: '2026-07-31',
    status: 'active',
    total_creators: 10,
    requirements: {
      min_followers: 200000,
      min_engagement_rate: 4.5,
      content_types: ['vlog', 'review', 'shorts'],
      deliverables: ['5 Restaurant Review Videos', '5 Shorts', '1 Best-Of Compilation'],
    },
    target_audience: {
      age_range: '18-35',
      gender: 'all',
      locations: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata'],
      interests: ['food', 'restaurants', 'street food', 'cooking', 'lifestyle'],
    },
  },

  // ── Myntra Fashion (E-commerce / Fashion) ──────────────
  {
    brand_email: 'sameer@myntra.com',
    title: 'Myntra EORS 2026 — End of Reason Sale Hype',
    description: 'Build hype for Myntra\'s biggest sale event — End of Reason Sale (EORS) 2026. Creators will curate wish-lists, do haul videos, and create "Top Picks Under ₹999" content. Showcase the app experience, exclusive brands, and early-bird deals.',
    platform: 'instagram',
    category: 'fashion',
    budget: 8000000,
    start_date: '2026-06-01',
    end_date: '2026-06-30',
    status: 'draft',
    total_creators: 50,
    requirements: {
      min_followers: 50000,
      min_engagement_rate: 3.0,
      content_types: ['reels', 'stories', 'try-on haul'],
      deliverables: ['2 Reels', '3 Stories', '1 Try-On Haul Video'],
    },
    target_audience: {
      age_range: '18-35',
      gender: 'all',
      locations: ['India'],
      interests: ['fashion', 'shopping', 'lifestyle', 'deals', 'style'],
    },
  },

  // ── CRED (Fintech) ─────────────────────────────────────
  {
    brand_email: 'priyanka@cred.club',
    title: 'CRED UPI Rewards — Spend Smart, Earn More',
    description: 'Promote CRED UPI and its cashback rewards program. Creators demonstrate real transactions, showcase CRED coins redemption, and highlight exclusive CRED store deals. Content should feel aspirational yet relatable — luxury rewards for smart financial behavior.',
    platform: 'instagram',
    category: 'finance',
    budget: 4000000,
    start_date: '2026-04-20',
    end_date: '2026-06-20',
    status: 'active',
    total_creators: 12,
    requirements: {
      min_followers: 100000,
      min_engagement_rate: 3.5,
      content_types: ['reels', 'stories', 'collaboration'],
      deliverables: ['2 Reels', '4 Stories', '1 Collab Reel with another CRED creator'],
    },
    target_audience: {
      age_range: '25-40',
      gender: 'all',
      locations: ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Chennai', 'Hyderabad'],
      interests: ['finance', 'luxury', 'technology', 'lifestyle', 'rewards'],
    },
  },

  // ── Freshworks (SaaS / Technology) ─────────────────────
  {
    brand_email: 'arjun@freshworks.com',
    title: 'Freshworks for Startups — Build Better, Ship Faster',
    description: 'Thought leadership campaign targeting startup founders and tech leaders. Creators (tech YouTubers and Twitter/X influencers) create content about how modern SaaS tools improve productivity. Highlight Freshdesk, Freshsales, and Freshservice with real use-case demos.',
    platform: 'twitter',
    category: 'tech',
    budget: 2000000,
    start_date: '2026-05-15',
    end_date: '2026-07-15',
    status: 'active',
    total_creators: 8,
    requirements: {
      min_followers: 50000,
      min_engagement_rate: 2.5,
      content_types: ['thread', 'video', 'blog'],
      deliverables: ['3 Twitter Threads', '1 Demo Video', '2 Quote Tweets'],
    },
    target_audience: {
      age_range: '25-45',
      gender: 'all',
      locations: ['India', 'USA', 'UK', 'Singapore'],
      interests: ['SaaS', 'startups', 'productivity', 'technology', 'business'],
    },
  },

  // ── Lenskart (Eyewear / Retail) ────────────────────────
  {
    brand_email: 'meghna@lenskart.com',
    title: 'Lenskart Studio — Frame Your Style',
    description: 'Style-focused campaign for Lenskart\'s new designer frames collection. Creators try on frames using the Lenskart 3D Try-On feature, share their top picks, and create "Frames for Every Face Shape" content. Highlight the home try-on program and BOGO offers.',
    platform: 'instagram',
    category: 'fashion',
    budget: 2200000,
    start_date: '2026-04-25',
    end_date: '2026-06-25',
    status: 'active',
    total_creators: 18,
    requirements: {
      min_followers: 30000,
      min_engagement_rate: 4.0,
      content_types: ['reels', 'try-on', 'stories'],
      deliverables: ['2 Try-On Reels', '3 Stories', '1 Carousel Post'],
    },
    target_audience: {
      age_range: '20-40',
      gender: 'all',
      locations: ['India'],
      interests: ['fashion', 'eyewear', 'style', 'accessories', 'lifestyle'],
    },
  },

  // ── Urban Company (Home Services) ──────────────────────
  {
    brand_email: 'rohit@urbancompany.com',
    title: 'Urban Company — Self-Care Sunday Campaign',
    description: 'Promote Urban Company\'s at-home beauty and wellness services. Creators book real services (salon at home, spa, massage) and document the full experience — booking flow, service quality, and results. Target busy professionals and new moms who deserve self-care.',
    platform: 'tiktok',
    category: 'lifestyle',
    budget: 1500000,
    start_date: '2026-05-10',
    end_date: '2026-07-10',
    status: 'active',
    total_creators: 15,
    requirements: {
      min_followers: 50000,
      min_engagement_rate: 6.0,
      content_types: ['short-video', 'vlog', 'review'],
      deliverables: ['3 TikTok Videos', '1 Detailed Experience Video'],
    },
    target_audience: {
      age_range: '22-40',
      gender: 'female',
      locations: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Kolkata'],
      interests: ['self-care', 'beauty', 'wellness', 'home services', 'convenience'],
    },
  },

  // ── SUGAR Cosmetics (Beauty & Cosmetics) ───────────────
  {
    brand_email: 'anita@sugarcosmetics.com',
    title: 'SUGAR Cosmetics — Bold & Free Monsoon Collection',
    description: 'Launch campaign for SUGAR\'s monsoon-proof makeup line. Creators test products in rain/humidity conditions, create "Waterproof Makeup Challenge" content, and do full-face tutorials. Highlight the matte lipsticks, smudge-proof kajal, and transfer-proof foundation.',
    platform: 'tiktok',
    category: 'beauty',
    budget: 1800000,
    start_date: '2026-06-15',
    end_date: '2026-08-15',
    status: 'draft',
    total_creators: 20,
    requirements: {
      min_followers: 25000,
      min_engagement_rate: 5.5,
      content_types: ['short-video', 'challenge', 'tutorial'],
      deliverables: ['3 TikTok Videos', '1 Full Face Tutorial', 'Participate in #SUGARMonsoonProof challenge'],
    },
    target_audience: {
      age_range: '18-30',
      gender: 'female',
      locations: ['India'],
      interests: ['makeup', 'beauty', 'cosmetics', 'bold looks', 'monsoon'],
    },
  },
];

/* ════════════════════════════════════════════════════════════════════
 *  MAIN SEED FUNCTION
 * ════════════════════════════════════════════════════════════════════ */
async function seed() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌 Connecting to Neon database...');
    await client.connect();
    console.log('✅ Connected!\n');

    await client.query('BEGIN');

    let campaignCount = 0;

    for (const c of CAMPAIGNS) {
      // 1. Look up the brand by user email
      const brandResult = await client.query(`
        SELECT b.id, b.company_name
        FROM brands b
        JOIN users u ON b.user_id = u.id
        WHERE u.email = $1
      `, [c.brand_email]);

      if (brandResult.rows.length === 0) {
        console.log(`  ⚠️  Brand not found for email ${c.brand_email} — skipping`);
        continue;
      }

      const brand = brandResult.rows[0];

      // 2. Check if campaign already exists (by title + brand)
      const existing = await client.query(`
        SELECT id FROM campaigns WHERE title = $1 AND brand_id = $2
      `, [c.title, brand.id]);

      if (existing.rows.length > 0) {
        console.log(`  ⏭️  Campaign "${c.title}" already exists — skipping`);
        campaignCount++;
        continue;
      }

      // 3. Insert campaign
      await client.query(`
        INSERT INTO campaigns (
          brand_id, title, description, platform, category,
          budget, start_date, end_date, status,
          requirements, target_audience, total_creators
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      `, [
        brand.id,
        c.title,
        c.description,
        c.platform,
        c.category,
        c.budget,
        c.start_date,
        c.end_date,
        c.status,
        JSON.stringify(c.requirements),
        JSON.stringify(c.target_audience),
        c.total_creators,
      ]);

      campaignCount++;
      console.log(`  ✅ Campaign ${campaignCount}/10: "${c.title}" → ${brand.company_name} (${c.platform}, ₹${(c.budget / 100000).toFixed(1)}L, ${c.status})`);
    }

    await client.query('COMMIT');

    console.log('\n' + '═'.repeat(65));
    console.log('🎉  CAMPAIGN SEED COMPLETE');
    console.log('═'.repeat(65));
    console.log(`   📢 Campaigns created : ${campaignCount}`);
    console.log('');
    console.log('📋 Campaign Summary:');
    console.log('   ┌─────────────────────────────────────────┬──────────┬──────────┬───────────┐');
    console.log('   │ Campaign                                │ Platform │ Budget   │ Status    │');
    console.log('   ├─────────────────────────────────────────┼──────────┼──────────┼───────────┤');
    CAMPAIGNS.forEach(c => {
      const name = c.title.length > 39 ? c.title.substring(0, 36) + '...' : c.title.padEnd(39);
      const plat = c.platform.padEnd(8);
      const budget = ('₹' + (c.budget / 100000).toFixed(1) + 'L').padEnd(8);
      const status = c.status.padEnd(9);
      console.log(`   │ ${name} │ ${plat} │ ${budget} │ ${status} │`);
    });
    console.log('   └─────────────────────────────────────────┴──────────┴──────────┴───────────┘');
    console.log('');
    console.log('   Total Budget: ₹' + (CAMPAIGNS.reduce((s, c) => s + c.budget, 0) / 10000000).toFixed(2) + ' Cr');
    console.log('   Platforms: Instagram (4), YouTube (2), TikTok (2), Twitter (1)');
    console.log('   Status: Active (8), Draft (2)');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

seed();
