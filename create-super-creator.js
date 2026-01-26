const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

async function createSuperCreator() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to Neon database...');
    await client.connect();
    console.log('✅ Connected!\n');

    await client.query('BEGIN');

    // 1. Create User Account
    console.log('👤 Creating user account...');
    const userResult = await client.query(`
      INSERT INTO users (
        email, 
        password_hash, 
        first_name, 
        last_name, 
        role, 
        status,
        email_verified,
        phone,
        avatar_url
      ) VALUES (
        'mrbeast@creators.com',
        '$2b$10$D5ugs.Zu0uIPE70FhrTh5eDEtfoNKGZ6KgQGzya0tlZ1WgvybuciO',
        'Jimmy',
        'Donaldson',
        'creator',
        'active',
        true,
        '+1-555-0100',
        'https://yt3.googleusercontent.com/ytc/AIf8zZQvLGJuCv-nBvvvVmOPmkVYPvPcMfqVMx5sGk_1=s900-c-k-c0x00ffffff-no-rj'
      )
      ON CONFLICT (email) DO UPDATE 
      SET first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          avatar_url = EXCLUDED.avatar_url
      RETURNING id
    `);
    const userId = userResult.rows[0].id;
    console.log(`✅ User created with ID: ${userId}`);

    // 2. Create Creator Profile
    console.log('\n🎨 Creating creator profile...');
    const creatorResult = await client.query(`
      INSERT INTO creators (
        user_id,
        bio,
        phone,
        location,
        avatar_url,
        social_links,
        overall_rating,
        total_campaigns,
        total_earnings,
        categories,
        languages,
        is_active,
        is_verified
      ) VALUES (
        $1,
        'World''s biggest content creator. Known for epic challenges, massive giveaways, and philanthropy. Perfect for high-impact brand collaborations with guaranteed viral reach. Over 240M YouTube subscribers and 400M+ total followers across platforms.',
        '+1-555-0100',
        'Greenville, North Carolina, USA',
        'https://yt3.googleusercontent.com/ytc/AIf8zZQvLGJuCv-nBvvvVmOPmkVYPvPcMfqVMx5sGk_1=s900-c-k-c0x00ffffff-no-rj',
        '{
          "instagram": "https://instagram.com/mrbeast",
          "youtube": "https://youtube.com/@MrBeast",
          "tiktok": "https://tiktok.com/@mrbeast",
          "twitter": "https://twitter.com/MrBeast"
        }'::jsonb,
        5.0,
        250,
        15000000.00,
        ARRAY['entertainment', 'challenges', 'philanthropy', 'gaming', 'food', 'lifestyle', 'tech', 'fashion', 'travel', 'education'],
        ARRAY['en', 'es', 'pt', 'fr', 'de', 'ja', 'ko', 'hi'],
        true,
        true
      )
      ON CONFLICT (user_id) DO UPDATE 
      SET bio = EXCLUDED.bio,
          total_campaigns = EXCLUDED.total_campaigns,
          total_earnings = EXCLUDED.total_earnings,
          overall_rating = EXCLUDED.overall_rating
      RETURNING id
    `, [userId]);
    const creatorId = creatorResult.rows[0].id;
    console.log(`✅ Creator profile created with ID: ${creatorId}`);

    // 3. Create Social Media Accounts
    console.log('\n📱 Creating social media accounts...');
    
    const platforms = [
      {
        name: 'YouTube',
        platform: 'youtube',
        platform_user_id: 'UCX6OQ3DkcsbYNE6H8uQQuVA',
        username: 'MrBeast',
        followers: 240000000,
        engagement_rate: 8.5,
        metrics: {
          display_name: 'MrBeast',
          profile_url: 'https://youtube.com/@MrBeast',
          total_videos: 850,
          avg_views: 85000000,
          is_verified: true
        }
      },
      {
        name: 'Instagram',
        platform: 'instagram',
        platform_user_id: 'mrbeast_ig_123',
        username: 'mrbeast',
        followers: 52000000,
        engagement_rate: 12.5,
        metrics: {
          display_name: 'MrBeast',
          profile_url: 'https://instagram.com/mrbeast',
          total_posts: 1200,
          avg_likes: 2500000,
          is_verified: true
        }
      },
      {
        name: 'TikTok',
        platform: 'tiktok',
        platform_user_id: 'mrbeast_tiktok_456',
        username: 'mrbeast',
        followers: 103000000,
        engagement_rate: 15.8,
        metrics: {
          display_name: 'MrBeast',
          profile_url: 'https://tiktok.com/@mrbeast',
          total_videos: 650,
          avg_views: 45000000,
          is_verified: true
        }
      },
      {
        name: 'Twitter',
        platform: 'twitter',
        platform_user_id: 'mrbeast_twitter_789',
        username: 'MrBeast',
        followers: 28000000,
        engagement_rate: 6.5,
        metrics: {
          display_name: 'MrBeast',
          profile_url: 'https://twitter.com/MrBeast',
          total_tweets: 8500,
          avg_likes: 450000,
          is_verified: true
        }
      }
    ];

    for (const social of platforms) {
      await client.query(`
        INSERT INTO social_accounts (
          creator_id,
          platform,
          platform_user_id,
          username,
          access_token,
          refresh_token,
          token_expires_at,
          followers_count,
          engagement_rate,
          metrics,
          is_connected,
          last_synced_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )

      `, [
        creatorId,
        social.platform,
        social.platform_user_id,
        social.username,
        `${social.platform}_token_encrypted`,
        `${social.platform}_refresh_token`,
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        social.followers,
        social.engagement_rate,
        JSON.stringify(social.metrics),
        true,
        new Date()
      ]);
      console.log(`✅ ${social.name}: ${(social.followers / 1000000).toFixed(0)}M followers`);
    }

    await client.query('COMMIT');

    console.log('\n🎉 Super Creator Profile Created Successfully!');
    console.log('\n📊 Summary:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Creator ID: ${creatorId}`);
    console.log(`   Total Reach: 423M+ followers across platforms`);
    console.log(`   Platforms: YouTube, Instagram, TikTok, Twitter`);
    console.log(`   Categories: 10 diverse categories`);
    console.log(`   Languages: 8 languages`);
    console.log(`   Rating: 5.0/5.0`);
    console.log(`   Total Campaigns: 250`);
    console.log(`   Total Earnings: $15,000,000`);
    console.log(`   Status: ✅ Active & Verified`);
    console.log('\n🔐 Login Credentials:');
    console.log(`   Email: mrbeast@creators.com`);
    console.log(`   Password: MrBeast@2024`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating super creator:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

createSuperCreator();
