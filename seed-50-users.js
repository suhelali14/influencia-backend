/**
 * seed-50-users.js
 * Creates 50 realistic users (40 creators + 10 brand admins) with
 * social accounts, realistic follower counts, engagement rates, etc.
 *
 * Usage:  node seed-50-users.js
 * Password for ALL users:  Test@1234
 */

const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

// bcrypt hash of "Test@1234" (cost 10)
const PASSWORD_HASH = '$2b$10$D5ugs.Zu0uIPE70FhrTh5eDEtfoNKGZ6KgQGzya0tlZ1WgvybuciO';

/* ════════════════════════════════════════════════════════════════════
 *  40 CREATOR PROFILES — realistic Indian & global influencers
 * ════════════════════════════════════════════════════════════════════ */
const CREATORS = [
  {
    first_name: 'Priya', last_name: 'Sharma',
    email: 'priya.sharma@creators.com',
    phone: '+91-98765-43210',
    bio: 'Mumbai-based fashion and lifestyle creator. Known for affordable fashion hauls and ethnic wear styling. 5+ years in the influencer space with brand collabs with Myntra, Nykaa, and Ajio.',
    location: 'Mumbai, Maharashtra, India',
    categories: ['fashion', 'lifestyle', 'beauty'],
    languages: ['en', 'hi', 'mr'],
    rating: 4.8, total_campaigns: 85, total_earnings: 1200000,
    socials: [
      { platform: 'instagram', username: 'priyasharma_style', followers: 1850000, engagement: 5.2 },
      { platform: 'youtube', username: 'PriyaSharmaStyle', followers: 920000, engagement: 4.8 },
    ]
  },
  {
    first_name: 'Arjun', last_name: 'Patel',
    email: 'arjun.patel@creators.com',
    phone: '+91-99887-76655',
    bio: 'Tech reviewer and gadget enthusiast from Bangalore. Specializes in smartphone reviews, laptop comparisons, and tech news. Former software engineer turned full-time creator.',
    location: 'Bangalore, Karnataka, India',
    categories: ['tech', 'gadgets', 'education'],
    languages: ['en', 'hi', 'kn'],
    rating: 4.6, total_campaigns: 62, total_earnings: 950000,
    socials: [
      { platform: 'youtube', username: 'ArjunTechReviews', followers: 2300000, engagement: 6.1 },
      { platform: 'instagram', username: 'arjun_tech', followers: 580000, engagement: 3.8 },
      { platform: 'twitter', username: 'ArjunTechIn', followers: 210000, engagement: 2.5 },
    ]
  },
  {
    first_name: 'Sneha', last_name: 'Reddy',
    email: 'sneha.reddy@creators.com',
    phone: '+91-87654-32109',
    bio: 'Hyderabad foodie documenting South Indian cuisine, street food, and restaurant reviews. Known for Biryani trail series and authentic home cooking recipes.',
    location: 'Hyderabad, Telangana, India',
    categories: ['food', 'lifestyle', 'travel'],
    languages: ['en', 'hi', 'te'],
    rating: 4.9, total_campaigns: 110, total_earnings: 1800000,
    socials: [
      { platform: 'instagram', username: 'sneha_foodie_hyd', followers: 3200000, engagement: 7.5 },
      { platform: 'youtube', username: 'SnehaFoodDiaries', followers: 1500000, engagement: 5.9 },
      { platform: 'tiktok', username: 'snehareddy_food', followers: 890000, engagement: 9.2 },
    ]
  },
  {
    first_name: 'Rahul', last_name: 'Verma',
    email: 'rahul.verma@creators.com',
    phone: '+91-77665-54433',
    bio: 'Fitness coach and bodybuilding competitor from Delhi. Certified nutritionist. Known for transformation challenges and home workout routines that went viral.',
    location: 'New Delhi, Delhi, India',
    categories: ['fitness', 'health', 'lifestyle'],
    languages: ['en', 'hi'],
    rating: 4.7, total_campaigns: 95, total_earnings: 2200000,
    socials: [
      { platform: 'instagram', username: 'rahul_fit_delhi', followers: 4500000, engagement: 6.8 },
      { platform: 'youtube', username: 'RahulFitnessIndia', followers: 2800000, engagement: 5.5 },
    ]
  },
  {
    first_name: 'Ananya', last_name: 'Krishnan',
    email: 'ananya.krishnan@creators.com',
    phone: '+91-99001-12233',
    bio: 'Classical dancer turned content creator from Chennai. Blends Bharatanatyam with modern trends. Creates cultural content, dance tutorials, and art vlogs.',
    location: 'Chennai, Tamil Nadu, India',
    categories: ['entertainment', 'education', 'lifestyle'],
    languages: ['en', 'ta', 'hi'],
    rating: 4.5, total_campaigns: 45, total_earnings: 650000,
    socials: [
      { platform: 'instagram', username: 'ananya_dances', followers: 1200000, engagement: 8.1 },
      { platform: 'youtube', username: 'AnanyaKrishnanDance', followers: 680000, engagement: 6.2 },
      { platform: 'tiktok', username: 'ananya_classical', followers: 2100000, engagement: 11.5 },
    ]
  },
  {
    first_name: 'Vikram', last_name: 'Singh',
    email: 'vikram.singh@creators.com',
    phone: '+91-88776-65544',
    bio: 'Travel vlogger exploring offbeat India. From Ladakh to Kerala backwaters, covering budget travel tips, hidden gems, and cultural experiences.',
    location: 'Jaipur, Rajasthan, India',
    categories: ['travel', 'adventure', 'lifestyle'],
    languages: ['en', 'hi', 'raj'],
    rating: 4.8, total_campaigns: 78, total_earnings: 1400000,
    socials: [
      { platform: 'youtube', username: 'VikramTravelsIndia', followers: 3800000, engagement: 5.8 },
      { platform: 'instagram', username: 'vikram_wanderer', followers: 1900000, engagement: 4.5 },
    ]
  },
  {
    first_name: 'Meera', last_name: 'Joshi',
    email: 'meera.joshi@creators.com',
    phone: '+91-99112-23344',
    bio: 'Beauty and skincare expert from Pune. Dermatology student sharing evidence-based skincare routines, product reviews, and makeup tutorials for Indian skin tones.',
    location: 'Pune, Maharashtra, India',
    categories: ['beauty', 'skincare', 'health'],
    languages: ['en', 'hi', 'mr'],
    rating: 4.6, total_campaigns: 120, total_earnings: 2800000,
    socials: [
      { platform: 'instagram', username: 'meera_glow', followers: 5200000, engagement: 7.2 },
      { platform: 'youtube', username: 'MeeraBeautyScience', followers: 2100000, engagement: 6.0 },
    ]
  },
  {
    first_name: 'Karthik', last_name: 'Nair',
    email: 'karthik.nair@creators.com',
    phone: '+91-88998-87766',
    bio: 'Gaming content creator and esports commentator from Kochi. Specializes in BGMI, Valorant, and mobile gaming. Hosts weekly tournaments with 50K+ viewers.',
    location: 'Kochi, Kerala, India',
    categories: ['gaming', 'entertainment', 'tech'],
    languages: ['en', 'ml', 'hi'],
    rating: 4.4, total_campaigns: 55, total_earnings: 900000,
    socials: [
      { platform: 'youtube', username: 'KarthikGamingIN', followers: 4100000, engagement: 8.5 },
      { platform: 'instagram', username: 'karthik_esports', followers: 850000, engagement: 5.0 },
      { platform: 'twitter', username: 'KarthikGames', followers: 320000, engagement: 3.2 },
    ]
  },
  {
    first_name: 'Divya', last_name: 'Gupta',
    email: 'divya.gupta@creators.com',
    phone: '+91-77889-90011',
    bio: 'Parenting and mom-life creator from Lucknow. Shares honest parenting tips, baby product reviews, and family vlogs. Community of 500K+ moms.',
    location: 'Lucknow, Uttar Pradesh, India',
    categories: ['parenting', 'lifestyle', 'education'],
    languages: ['en', 'hi'],
    rating: 4.7, total_campaigns: 68, total_earnings: 750000,
    socials: [
      { platform: 'instagram', username: 'divya_momlife', followers: 980000, engagement: 9.5 },
      { platform: 'youtube', username: 'DivyaParenting', followers: 520000, engagement: 7.8 },
    ]
  },
  {
    first_name: 'Aditya', last_name: 'Mehta',
    email: 'aditya.mehta@creators.com',
    phone: '+91-99334-45566',
    bio: 'Finance educator and stock market analyst from Ahmedabad. Breaking down complex investing concepts for millennials. SEBI registered research analyst.',
    location: 'Ahmedabad, Gujarat, India',
    categories: ['finance', 'education', 'business'],
    languages: ['en', 'hi', 'gu'],
    rating: 4.9, total_campaigns: 42, total_earnings: 1600000,
    socials: [
      { platform: 'youtube', username: 'AdityaFinanceGuru', followers: 6500000, engagement: 4.2 },
      { platform: 'instagram', username: 'aditya_invests', followers: 1800000, engagement: 3.5 },
      { platform: 'twitter', username: 'AdityaMehta_Fin', followers: 950000, engagement: 2.8 },
    ]
  },
  {
    first_name: 'Riya', last_name: 'Kapoor',
    email: 'riya.kapoor@creators.com',
    phone: '+91-88667-78899',
    bio: 'Comedy content creator from Delhi. Known for relatable office humor, desi family sketches, and satirical takes on daily life. 3 Filmfare nominations.',
    location: 'New Delhi, Delhi, India',
    categories: ['entertainment', 'comedy', 'lifestyle'],
    languages: ['en', 'hi', 'pa'],
    rating: 4.8, total_campaigns: 130, total_earnings: 4500000,
    socials: [
      { platform: 'instagram', username: 'riyakapoor_comedy', followers: 8200000, engagement: 9.8 },
      { platform: 'youtube', username: 'RiyaKapoorOfficial', followers: 5400000, engagement: 7.5 },
      { platform: 'tiktok', username: 'riyakapoor', followers: 12000000, engagement: 12.3 },
    ]
  },
  {
    first_name: 'Siddharth', last_name: 'Iyer',
    email: 'siddharth.iyer@creators.com',
    phone: '+91-99556-67788',
    bio: 'Photographer and visual storyteller from Goa. Specializes in landscape, wildlife, and street photography. National Geographic contributor.',
    location: 'Panaji, Goa, India',
    categories: ['photography', 'travel', 'art'],
    languages: ['en', 'hi', 'kok'],
    rating: 4.9, total_campaigns: 35, total_earnings: 580000,
    socials: [
      { platform: 'instagram', username: 'siddharth_frames', followers: 2800000, engagement: 6.5 },
      { platform: 'youtube', username: 'SiddharthVisuals', followers: 450000, engagement: 5.2 },
    ]
  },
  {
    first_name: 'Nisha', last_name: 'Agarwal',
    email: 'nisha.agarwal@creators.com',
    phone: '+91-77443-32211',
    bio: 'Home decor and DIY creator from Kolkata. Transforms spaces on a budget. Interior design graduate sharing affordable makeover ideas and festive decor tips.',
    location: 'Kolkata, West Bengal, India',
    categories: ['home', 'diy', 'lifestyle'],
    languages: ['en', 'hi', 'bn'],
    rating: 4.5, total_campaigns: 52, total_earnings: 480000,
    socials: [
      { platform: 'instagram', username: 'nisha_homedecor', followers: 1400000, engagement: 7.8 },
      { platform: 'youtube', username: 'NishaHomeIdeas', followers: 780000, engagement: 6.1 },
      { platform: 'tiktok', username: 'nisha_diy', followers: 650000, engagement: 10.2 },
    ]
  },
  {
    first_name: 'Rohan', last_name: 'Deshmukh',
    email: 'rohan.deshmukh@creators.com',
    phone: '+91-88112-23344',
    bio: 'Automotive journalist and car reviewer from Pune. Test drives, comparisons, and road trips. Former auto editor at Autocar India.',
    location: 'Pune, Maharashtra, India',
    categories: ['automotive', 'tech', 'travel'],
    languages: ['en', 'hi', 'mr'],
    rating: 4.6, total_campaigns: 48, total_earnings: 720000,
    socials: [
      { platform: 'youtube', username: 'RohanDrivesIndia', followers: 3200000, engagement: 5.5 },
      { platform: 'instagram', username: 'rohan_drives', followers: 1100000, engagement: 4.2 },
    ]
  },
  {
    first_name: 'Tanvi', last_name: 'Bhatt',
    email: 'tanvi.bhatt@creators.com',
    phone: '+91-99778-89900',
    bio: 'Yoga instructor and wellness advocate from Rishikesh. 500-hour certified yoga teacher sharing daily practices, meditation guides, and Ayurvedic lifestyle tips.',
    location: 'Rishikesh, Uttarakhand, India',
    categories: ['fitness', 'health', 'wellness'],
    languages: ['en', 'hi', 'sa'],
    rating: 4.8, total_campaigns: 72, total_earnings: 1100000,
    socials: [
      { platform: 'instagram', username: 'tanvi_yoga', followers: 3600000, engagement: 8.2 },
      { platform: 'youtube', username: 'TanviYogaLife', followers: 1800000, engagement: 6.8 },
    ]
  },
  {
    first_name: 'Harsh', last_name: 'Pandey',
    email: 'harsh.pandey@creators.com',
    phone: '+91-88554-43322',
    bio: 'Science communicator and educator from Varanasi. Makes physics and chemistry fun with experiments and animated explainers. 2M+ students reached.',
    location: 'Varanasi, Uttar Pradesh, India',
    categories: ['education', 'science', 'tech'],
    languages: ['en', 'hi'],
    rating: 4.7, total_campaigns: 28, total_earnings: 420000,
    socials: [
      { platform: 'youtube', username: 'HarshScienceIN', followers: 4800000, engagement: 5.8 },
      { platform: 'instagram', username: 'harsh_science', followers: 920000, engagement: 4.5 },
    ]
  },
  {
    first_name: 'Ishita', last_name: 'Das',
    email: 'ishita.das@creators.com',
    phone: '+91-77665-56677',
    bio: 'Sustainable fashion advocate from Kolkata. Promotes thrift shopping, upcycling, and ethical brands. Featured in Vogue India and Elle.',
    location: 'Kolkata, West Bengal, India',
    categories: ['fashion', 'sustainability', 'lifestyle'],
    languages: ['en', 'hi', 'bn'],
    rating: 4.5, total_campaigns: 58, total_earnings: 680000,
    socials: [
      { platform: 'instagram', username: 'ishita_sustainable', followers: 1600000, engagement: 7.0 },
      { platform: 'youtube', username: 'IshitaEcoStyle', followers: 420000, engagement: 5.5 },
      { platform: 'tiktok', username: 'ishita_thrift', followers: 980000, engagement: 11.0 },
    ]
  },
  {
    first_name: 'Amit', last_name: 'Saxena',
    email: 'amit.saxena@creators.com',
    phone: '+91-99223-34455',
    bio: 'Stand-up comedian and podcaster from Mumbai. Known for corporate humor and dating stories. Regular at Canvas Laugh Club. Podcast "Chai & Chaos" has 5M+ downloads.',
    location: 'Mumbai, Maharashtra, India',
    categories: ['comedy', 'entertainment', 'podcast'],
    languages: ['en', 'hi'],
    rating: 4.6, total_campaigns: 88, total_earnings: 3200000,
    socials: [
      { platform: 'instagram', username: 'amit_standup', followers: 5800000, engagement: 8.5 },
      { platform: 'youtube', username: 'AmitSaxenaComedy', followers: 3200000, engagement: 7.2 },
      { platform: 'twitter', username: 'AmitSaxena_LOL', followers: 1200000, engagement: 4.0 },
    ]
  },
  {
    first_name: 'Kavya', last_name: 'Menon',
    email: 'kavya.menon@creators.com',
    phone: '+91-88443-32211',
    bio: 'Book reviewer and literary content creator from Bangalore. Runs India\'s largest BookTok community. Author of "Read Between the Lines" newsletter with 200K subscribers.',
    location: 'Bangalore, Karnataka, India',
    categories: ['books', 'education', 'lifestyle'],
    languages: ['en', 'hi', 'kn', 'ml'],
    rating: 4.4, total_campaigns: 32, total_earnings: 350000,
    socials: [
      { platform: 'instagram', username: 'kavya_reads', followers: 780000, engagement: 9.2 },
      { platform: 'youtube', username: 'KavyaBookClub', followers: 340000, engagement: 7.5 },
      { platform: 'tiktok', username: 'kavya_booktok', followers: 1500000, engagement: 13.5 },
    ]
  },
  {
    first_name: 'Dev', last_name: 'Malhotra',
    email: 'dev.malhotra@creators.com',
    phone: '+91-99887-78800',
    bio: 'Pet content creator with 3 dogs and 2 cats from Chandigarh. Creates heartwarming animal content, pet care guides, and adoption awareness campaigns.',
    location: 'Chandigarh, Punjab, India',
    categories: ['pets', 'lifestyle', 'entertainment'],
    languages: ['en', 'hi', 'pa'],
    rating: 4.7, total_campaigns: 40, total_earnings: 520000,
    socials: [
      { platform: 'instagram', username: 'dev_and_pets', followers: 2400000, engagement: 10.5 },
      { platform: 'youtube', username: 'DevPetFamily', followers: 890000, engagement: 8.0 },
      { platform: 'tiktok', username: 'dev_petlife', followers: 3800000, engagement: 14.2 },
    ]
  },
  // --- Global / International Creators ---
  {
    first_name: 'Sarah', last_name: 'Chen',
    email: 'sarah.chen@creators.com',
    phone: '+1-415-555-0201',
    bio: 'San Francisco based tech entrepreneur and startup advisor. Creates content about SaaS, AI tools, and startup culture. Angel investor in 20+ companies.',
    location: 'San Francisco, California, USA',
    categories: ['tech', 'business', 'education'],
    languages: ['en', 'zh'],
    rating: 4.8, total_campaigns: 35, total_earnings: 2800000,
    socials: [
      { platform: 'twitter', username: 'SarahChenTech', followers: 890000, engagement: 3.8 },
      { platform: 'youtube', username: 'SarahChenStartups', followers: 1200000, engagement: 4.5 },
      { platform: 'instagram', username: 'sarahchen_sf', followers: 650000, engagement: 5.2 },
    ]
  },
  {
    first_name: 'Marcus', last_name: 'Williams',
    email: 'marcus.williams@creators.com',
    phone: '+1-323-555-0302',
    bio: 'LA-based fitness and nutrition coach. Former D1 athlete turned creator. Known for 90-day transformation programs and meal prep content.',
    location: 'Los Angeles, California, USA',
    categories: ['fitness', 'health', 'food'],
    languages: ['en', 'es'],
    rating: 4.6, total_campaigns: 92, total_earnings: 3500000,
    socials: [
      { platform: 'instagram', username: 'marcus_fitlife', followers: 6800000, engagement: 6.5 },
      { platform: 'youtube', username: 'MarcusFitnessTV', followers: 4200000, engagement: 5.8 },
      { platform: 'tiktok', username: 'marcusfits', followers: 9500000, engagement: 10.8 },
    ]
  },
  {
    first_name: 'Emma', last_name: 'Thompson',
    email: 'emma.thompson@creators.com',
    phone: '+44-20-7946-0958',
    bio: 'London fashion blogger and sustainability advocate. Collaborates with luxury and high-street brands. Vogue UK contributor and London Fashion Week regular.',
    location: 'London, United Kingdom',
    categories: ['fashion', 'luxury', 'sustainability'],
    languages: ['en', 'fr'],
    rating: 4.9, total_campaigns: 145, total_earnings: 5200000,
    socials: [
      { platform: 'instagram', username: 'emma_london_style', followers: 7500000, engagement: 5.8 },
      { platform: 'youtube', username: 'EmmaThompsonStyle', followers: 2800000, engagement: 4.5 },
      { platform: 'tiktok', username: 'emmathompson_uk', followers: 4200000, engagement: 8.5 },
    ]
  },
  {
    first_name: 'Carlos', last_name: 'Rodriguez',
    email: 'carlos.rodriguez@creators.com',
    phone: '+52-55-5555-0403',
    bio: 'Mexico City based food and travel creator. Documents Latin American cuisine and culture. Host of "Sabores del Mundo" web series with 100M+ views.',
    location: 'Mexico City, Mexico',
    categories: ['food', 'travel', 'culture'],
    languages: ['es', 'en', 'pt'],
    rating: 4.7, total_campaigns: 88, total_earnings: 1800000,
    socials: [
      { platform: 'youtube', username: 'CarlosSabores', followers: 5600000, engagement: 6.2 },
      { platform: 'instagram', username: 'carlos_foodie_mx', followers: 3200000, engagement: 7.8 },
      { platform: 'tiktok', username: 'carlosfoodmx', followers: 7800000, engagement: 11.5 },
    ]
  },
  {
    first_name: 'Yuki', last_name: 'Tanaka',
    email: 'yuki.tanaka@creators.com',
    phone: '+81-3-5555-0504',
    bio: 'Tokyo-based anime reviewer and Japanese culture creator. Creates content about anime, manga, Japanese street food, and Akihabara culture.',
    location: 'Tokyo, Japan',
    categories: ['entertainment', 'anime', 'culture'],
    languages: ['ja', 'en'],
    rating: 4.5, total_campaigns: 55, total_earnings: 1200000,
    socials: [
      { platform: 'youtube', username: 'YukiAnimeWorld', followers: 3400000, engagement: 7.2 },
      { platform: 'instagram', username: 'yuki_otaku_tokyo', followers: 1800000, engagement: 6.0 },
      { platform: 'tiktok', username: 'yukitanaka_jp', followers: 5200000, engagement: 12.0 },
    ]
  },
  {
    first_name: 'Fatima', last_name: 'Al-Hassan',
    email: 'fatima.alhassan@creators.com',
    phone: '+971-50-555-0605',
    bio: 'Dubai-based luxury lifestyle and travel creator. Covers premium hotels, fine dining, and luxury fashion. Brand ambassador for Emirates and Cartier.',
    location: 'Dubai, UAE',
    categories: ['luxury', 'travel', 'fashion'],
    languages: ['ar', 'en', 'fr'],
    rating: 4.9, total_campaigns: 105, total_earnings: 8500000,
    socials: [
      { platform: 'instagram', username: 'fatima_luxury_dubai', followers: 9200000, engagement: 4.8 },
      { platform: 'youtube', username: 'FatimaLuxuryLife', followers: 3800000, engagement: 5.2 },
      { platform: 'tiktok', username: 'fatima_dubai', followers: 6500000, engagement: 8.8 },
    ]
  },
  {
    first_name: 'Liam', last_name: 'O\'Brien',
    email: 'liam.obrien@creators.com',
    phone: '+353-1-555-0706',
    bio: 'Irish musician and music producer. Creates behind-the-scenes content, music tutorials, and covers. 3 independent albums with 50M+ streams on Spotify.',
    location: 'Dublin, Ireland',
    categories: ['music', 'entertainment', 'education'],
    languages: ['en', 'ga'],
    rating: 4.6, total_campaigns: 38, total_earnings: 920000,
    socials: [
      { platform: 'youtube', username: 'LiamMusicIRL', followers: 2100000, engagement: 6.8 },
      { platform: 'instagram', username: 'liam_music_dublin', followers: 1400000, engagement: 5.5 },
      { platform: 'tiktok', username: 'liamobrien_music', followers: 3600000, engagement: 9.5 },
    ]
  },
  {
    first_name: 'Sofia', last_name: 'Andersson',
    email: 'sofia.andersson@creators.com',
    phone: '+46-8-555-0807',
    bio: 'Swedish minimalist lifestyle creator. Focuses on Scandinavian design, slow living, and sustainable consumption. Author of "Less Is More" book.',
    location: 'Stockholm, Sweden',
    categories: ['lifestyle', 'home', 'sustainability'],
    languages: ['sv', 'en', 'no'],
    rating: 4.7, total_campaigns: 62, total_earnings: 1500000,
    socials: [
      { platform: 'instagram', username: 'sofia_minimal', followers: 2800000, engagement: 6.2 },
      { platform: 'youtube', username: 'SofiaMinimalLiving', followers: 950000, engagement: 5.8 },
    ]
  },
  {
    first_name: 'Jin', last_name: 'Park',
    email: 'jin.park@creators.com',
    phone: '+82-2-555-0908',
    bio: 'Seoul-based K-beauty and skincare expert. Licensed esthetician sharing Korean skincare routines, product reviews, and glass skin tutorials.',
    location: 'Seoul, South Korea',
    categories: ['beauty', 'skincare', 'lifestyle'],
    languages: ['ko', 'en', 'ja'],
    rating: 4.8, total_campaigns: 98, total_earnings: 3200000,
    socials: [
      { platform: 'instagram', username: 'jin_kbeauty', followers: 5400000, engagement: 7.5 },
      { platform: 'youtube', username: 'JinKBeautySeoul', followers: 3600000, engagement: 6.2 },
      { platform: 'tiktok', username: 'jinpark_beauty', followers: 8200000, engagement: 10.5 },
    ]
  },
  // --- More Indian Creators to fill 40 ---
  {
    first_name: 'Pooja', last_name: 'Banerjee',
    email: 'pooja.banerjee@creators.com',
    phone: '+91-99445-56677',
    bio: 'Wedding and bridal content creator from Kolkata. Covers lehenga styling, bridal makeup, and destination wedding planning. Worked with 200+ brides.',
    location: 'Kolkata, West Bengal, India',
    categories: ['wedding', 'fashion', 'beauty'],
    languages: ['en', 'hi', 'bn'],
    rating: 4.6, total_campaigns: 75, total_earnings: 1350000,
    socials: [
      { platform: 'instagram', username: 'pooja_bridal_diaries', followers: 2600000, engagement: 6.8 },
      { platform: 'youtube', username: 'PoojaBridalStudio', followers: 890000, engagement: 5.5 },
    ]
  },
  {
    first_name: 'Manish', last_name: 'Tiwari',
    email: 'manish.tiwari@creators.com',
    phone: '+91-88334-45566',
    bio: 'Motovlogger from Indore exploring India on two wheels. Covers bike reviews, road trips, and highway food. Ambassador for Royal Enfield.',
    location: 'Indore, Madhya Pradesh, India',
    categories: ['automotive', 'travel', 'adventure'],
    languages: ['en', 'hi'],
    rating: 4.5, total_campaigns: 42, total_earnings: 580000,
    socials: [
      { platform: 'youtube', username: 'ManishMotoIndia', followers: 2900000, engagement: 6.5 },
      { platform: 'instagram', username: 'manish_rides', followers: 1200000, engagement: 5.0 },
    ]
  },
  {
    first_name: 'Swati', last_name: 'Chauhan',
    email: 'swati.chauhan@creators.com',
    phone: '+91-77556-67788',
    bio: 'EdTech creator from Delhi specializing in UPSC preparation content. Former IAS aspirant turned educator. Free courses reaching 1M+ students.',
    location: 'New Delhi, Delhi, India',
    categories: ['education', 'career', 'motivation'],
    languages: ['en', 'hi'],
    rating: 4.9, total_campaigns: 22, total_earnings: 380000,
    socials: [
      { platform: 'youtube', username: 'SwatiUPSCGuru', followers: 5200000, engagement: 4.8 },
      { platform: 'instagram', username: 'swati_educator', followers: 1500000, engagement: 3.5 },
      { platform: 'twitter', username: 'SwatiChauhan_Ed', followers: 680000, engagement: 2.2 },
    ]
  },
  {
    first_name: 'Rajesh', last_name: 'Kumar',
    email: 'rajesh.kumar@creators.com',
    phone: '+91-99667-78899',
    bio: 'Rural India vlogger from Bihar. Documents village life, farming techniques, and rural entrepreneurship. Bridges urban-rural digital divide.',
    location: 'Patna, Bihar, India',
    categories: ['lifestyle', 'agriculture', 'education'],
    languages: ['hi', 'bh', 'en'],
    rating: 4.3, total_campaigns: 18, total_earnings: 180000,
    socials: [
      { platform: 'youtube', username: 'RajeshGaonSe', followers: 3500000, engagement: 8.2 },
      { platform: 'instagram', username: 'rajesh_village_life', followers: 850000, engagement: 6.5 },
    ]
  },
  {
    first_name: 'Zara', last_name: 'Khan',
    email: 'zara.khan@creators.com',
    phone: '+91-88776-65500',
    bio: 'Hijabi fashion creator from Lucknow. Modest fashion styling, DIY hijab tutorials, and inclusive beauty content. Featured in Cosmopolitan India.',
    location: 'Lucknow, Uttar Pradesh, India',
    categories: ['fashion', 'beauty', 'lifestyle'],
    languages: ['en', 'hi', 'ur'],
    rating: 4.7, total_campaigns: 65, total_earnings: 920000,
    socials: [
      { platform: 'instagram', username: 'zara_modest_style', followers: 2200000, engagement: 7.5 },
      { platform: 'youtube', username: 'ZaraModestFashion', followers: 680000, engagement: 6.0 },
      { platform: 'tiktok', username: 'zarakhan_style', followers: 1800000, engagement: 10.8 },
    ]
  },
  {
    first_name: 'Nikhil', last_name: 'Rao',
    email: 'nikhil.rao@creators.com',
    phone: '+91-99001-10022',
    bio: 'Cryptocurrency and Web3 educator from Bangalore. Simplifies blockchain concepts for beginners. Runs a Discord community of 50K+ crypto enthusiasts.',
    location: 'Bangalore, Karnataka, India',
    categories: ['crypto', 'finance', 'tech'],
    languages: ['en', 'hi', 'kn'],
    rating: 4.4, total_campaigns: 30, total_earnings: 650000,
    socials: [
      { platform: 'youtube', username: 'NikhilCryptoIN', followers: 1800000, engagement: 5.5 },
      { platform: 'twitter', username: 'NikhilRao_Web3', followers: 420000, engagement: 4.2 },
      { platform: 'instagram', username: 'nikhil_crypto', followers: 580000, engagement: 3.8 },
    ]
  },
  {
    first_name: 'Lakshmi', last_name: 'Sundaram',
    email: 'lakshmi.sundaram@creators.com',
    phone: '+91-88225-53344',
    bio: 'Classical Carnatic musician and music educator from Madurai. Teaches vocal music online to 10K+ students. Fusion music experiments blending classical with modern.',
    location: 'Madurai, Tamil Nadu, India',
    categories: ['music', 'education', 'culture'],
    languages: ['ta', 'en', 'hi'],
    rating: 4.8, total_campaigns: 25, total_earnings: 320000,
    socials: [
      { platform: 'youtube', username: 'LakshmiSingsClassical', followers: 1200000, engagement: 7.8 },
      { platform: 'instagram', username: 'lakshmi_music', followers: 680000, engagement: 6.5 },
    ]
  },
  {
    first_name: 'Abhishek', last_name: 'Jain',
    email: 'abhishek.jain@creators.com',
    phone: '+91-77998-89911',
    bio: 'Real estate and property investment educator from Mumbai. Helps first-time home buyers navigate the Indian real estate market. 500+ families guided.',
    location: 'Mumbai, Maharashtra, India',
    categories: ['real-estate', 'finance', 'education'],
    languages: ['en', 'hi', 'mr'],
    rating: 4.5, total_campaigns: 38, total_earnings: 850000,
    socials: [
      { platform: 'youtube', username: 'AbhishekPropertyGuru', followers: 2100000, engagement: 4.5 },
      { platform: 'instagram', username: 'abhishek_realestate', followers: 920000, engagement: 3.8 },
    ]
  },
  {
    first_name: 'Tanya', last_name: 'Sinha',
    email: 'tanya.sinha@creators.com',
    phone: '+91-99112-21100',
    bio: 'Mental health advocate and psychologist from Ranchi. Creates awareness content about anxiety, depression, and therapy. Runs free weekly support sessions.',
    location: 'Ranchi, Jharkhand, India',
    categories: ['health', 'wellness', 'education'],
    languages: ['en', 'hi'],
    rating: 4.9, total_campaigns: 15, total_earnings: 220000,
    socials: [
      { platform: 'instagram', username: 'tanya_mindful', followers: 1500000, engagement: 9.8 },
      { platform: 'youtube', username: 'TanyaMentalHealth', followers: 680000, engagement: 8.2 },
    ]
  },
  {
    first_name: 'Kunal', last_name: 'Choudhary',
    email: 'kunal.choudhary@creators.com',
    phone: '+91-88990-01122',
    bio: 'Street food explorer and food critic from Delhi. Documents the best street food across India. Famous "₹100 Food Challenge" series has 200M+ views.',
    location: 'New Delhi, Delhi, India',
    categories: ['food', 'travel', 'entertainment'],
    languages: ['en', 'hi'],
    rating: 4.7, total_campaigns: 95, total_earnings: 2100000,
    socials: [
      { platform: 'youtube', username: 'KunalStreetFood', followers: 7800000, engagement: 7.2 },
      { platform: 'instagram', username: 'kunal_foodwalk', followers: 4200000, engagement: 6.5 },
      { platform: 'tiktok', username: 'kunal_food100', followers: 5600000, engagement: 11.0 },
    ]
  },
];

/* ════════════════════════════════════════════════════════════════════
 *  10 BRAND ADMIN PROFILES
 * ════════════════════════════════════════════════════════════════════ */
const BRANDS = [
  {
    first_name: 'Rajiv', last_name: 'Mehta',
    email: 'rajiv@nykaa.com',
    phone: '+91-98100-00001',
    brand_name: 'Nykaa Beauty',
    industry: 'Beauty & Cosmetics',
    website: 'https://www.nykaa.com',
    description: 'India\'s leading beauty and wellness destination. Multi-brand online retailer for cosmetics, skincare, haircare, and fragrances.',
    location: 'Mumbai, India',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Nykaa_logo.svg/200px-Nykaa_logo.svg.png',
    total_campaigns: 45, total_spent: 15000000,
  },
  {
    first_name: 'Aditi', last_name: 'Sharma',
    email: 'aditi@boatlifestyle.com',
    phone: '+91-98100-00002',
    brand_name: 'boAt Lifestyle',
    industry: 'Consumer Electronics',
    website: 'https://www.boat-lifestyle.com',
    description: 'India\'s No.1 audio and wearable brand. Known for affordable yet premium earphones, headphones, smartwatches, and speakers.',
    location: 'New Delhi, India',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Boat_Logo.png',
    total_campaigns: 68, total_spent: 22000000,
  },
  {
    first_name: 'Vikrant', last_name: 'Kumar',
    email: 'vikrant@mamaearth.in',
    phone: '+91-98100-00003',
    brand_name: 'Mamaearth',
    industry: 'Personal Care',
    website: 'https://mamaearth.in',
    description: 'Toxin-free, natural beauty and baby care brand. Made in India with a commitment to goodness inside. Asia\'s first MadeSafe certified brand.',
    location: 'Gurugram, India',
    logo_url: 'https://mamaearth.in/images/logo.png',
    total_campaigns: 55, total_spent: 18000000,
  },
  {
    first_name: 'Neha', last_name: 'Gupta',
    email: 'neha@zomato.com',
    phone: '+91-98100-00004',
    brand_name: 'Zomato',
    industry: 'Food & Delivery',
    website: 'https://www.zomato.com',
    description: 'India\'s largest food delivery and restaurant discovery platform. Serving 800+ cities with millions of restaurant listings.',
    location: 'Gurugram, India',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Zomato_logo.png',
    total_campaigns: 82, total_spent: 35000000,
  },
  {
    first_name: 'Sameer', last_name: 'Patel',
    email: 'sameer@myntra.com',
    phone: '+91-98100-00005',
    brand_name: 'Myntra Fashion',
    industry: 'E-commerce / Fashion',
    website: 'https://www.myntra.com',
    description: 'India\'s largest fashion e-commerce platform offering 5000+ brands. Known for End of Reason Sale and celebrity collaborations.',
    location: 'Bangalore, India',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Myntra_logo.png',
    total_campaigns: 95, total_spent: 42000000,
  },
  {
    first_name: 'Priyanka', last_name: 'Reddy',
    email: 'priyanka@cred.club',
    phone: '+91-98100-00006',
    brand_name: 'CRED',
    industry: 'Fintech',
    website: 'https://cred.club',
    description: 'Members-only credit card bill payment platform. Known for quirky advertising campaigns and premium user base of high-credit-score individuals.',
    location: 'Bangalore, India',
    logo_url: 'https://cred.club/images/logo.png',
    total_campaigns: 35, total_spent: 28000000,
  },
  {
    first_name: 'Arjun', last_name: 'Nair',
    email: 'arjun@freshworks.com',
    phone: '+91-98100-00007',
    brand_name: 'Freshworks',
    industry: 'SaaS / Technology',
    website: 'https://www.freshworks.com',
    description: 'Global SaaS company providing business software. From customer support to IT service management, serving 60,000+ businesses worldwide.',
    location: 'Chennai, India',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Freshworks_logo.png',
    total_campaigns: 22, total_spent: 12000000,
  },
  {
    first_name: 'Meghna', last_name: 'Iyer',
    email: 'meghna@lenskart.com',
    phone: '+91-98100-00008',
    brand_name: 'Lenskart',
    industry: 'Eyewear / Retail',
    website: 'https://www.lenskart.com',
    description: 'India\'s largest eyewear brand with 1500+ stores. Omnichannel retailer offering prescription glasses, sunglasses, and contact lenses with virtual try-on.',
    location: 'New Delhi, India',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Lenskart_logo.png',
    total_campaigns: 48, total_spent: 16000000,
  },
  {
    first_name: 'Rohit', last_name: 'Bansal',
    email: 'rohit@urbancompany.com',
    phone: '+91-98100-00009',
    brand_name: 'Urban Company',
    industry: 'Home Services',
    website: 'https://www.urbancompany.com',
    description: 'Asia\'s largest home services platform. Connects customers with trained professionals for beauty, repairs, cleaning, and more.',
    location: 'Gurugram, India',
    logo_url: 'https://urbancompany.com/images/logo.png',
    total_campaigns: 38, total_spent: 14000000,
  },
  {
    first_name: 'Anita', last_name: 'Desai',
    email: 'anita@sugarcosmetics.com',
    phone: '+91-98100-00010',
    brand_name: 'SUGAR Cosmetics',
    industry: 'Beauty & Cosmetics',
    website: 'https://www.sugarcosmetics.com',
    description: 'Born-in-India makeup brand designed for Indian skin tones and climate. Cruelty-free, bold, and long-lasting cosmetics for millennials.',
    location: 'Mumbai, India',
    logo_url: 'https://sugarcosmetics.com/images/logo.png',
    total_campaigns: 72, total_spent: 20000000,
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

    let creatorCount = 0;
    let brandCount = 0;
    let socialCount = 0;

    // ──────── INSERT CREATORS ────────
    for (const c of CREATORS) {
      // 1. Upsert user
      const userRes = await client.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified, phone)
        VALUES ($1, $2, $3, $4, 'creator', 'active', true, $5)
        ON CONFLICT (email) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name  = EXCLUDED.last_name,
          phone      = EXCLUDED.phone
        RETURNING id
      `, [c.email, PASSWORD_HASH, c.first_name, c.last_name, c.phone]);
      const userId = userRes.rows[0].id;

      // 2. Upsert creator profile
      const creatorRes = await client.query(`
        INSERT INTO creators (
          user_id, bio, phone, location, social_links,
          overall_rating, total_campaigns, total_earnings,
          categories, languages, is_active, is_verified
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,true)
        ON CONFLICT (user_id) DO UPDATE SET
          bio            = EXCLUDED.bio,
          total_campaigns= EXCLUDED.total_campaigns,
          total_earnings = EXCLUDED.total_earnings,
          overall_rating = EXCLUDED.overall_rating,
          categories     = EXCLUDED.categories,
          languages      = EXCLUDED.languages
        RETURNING id
      `, [
        userId, c.bio, c.phone, c.location,
        JSON.stringify(Object.fromEntries(c.socials.map(s => [s.platform, `https://${s.platform}.com/${s.username}`]))),
        c.rating, c.total_campaigns, c.total_earnings,
        c.categories, c.languages,
      ]);
      const creatorId = creatorRes.rows[0].id;
      creatorCount++;

      // 3. Delete existing social accounts for this creator, then re-insert
      await client.query('DELETE FROM social_accounts WHERE creator_id = $1', [creatorId]);

      for (const s of c.socials) {
        await client.query(`
          INSERT INTO social_accounts (
            creator_id, platform, platform_user_id, username,
            access_token, refresh_token, token_expires_at,
            followers_count, engagement_rate, metrics,
            is_connected, last_synced_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11)
        `, [
          creatorId, s.platform, `${s.username}_${s.platform}_id`, s.username,
          `${s.platform}_token_enc`, `${s.platform}_refresh_enc`,
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          s.followers, s.engagement,
          JSON.stringify({
            display_name: `${c.first_name} ${c.last_name}`,
            profile_url: `https://${s.platform}.com/${s.username}`,
            avg_likes: Math.round(s.followers * s.engagement / 100),
            is_verified: c.rating >= 4.5,
          }),
          new Date(),
        ]);
        socialCount++;
      }

      console.log(`  ✅ Creator ${creatorCount}/40: ${c.first_name} ${c.last_name} — ${c.socials.length} platforms`);
    }

    // ──────── INSERT BRAND ADMINS ────────
    for (const b of BRANDS) {
      // 1. Upsert user
      const userRes = await client.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified, phone)
        VALUES ($1, $2, $3, $4, 'brand_admin', 'active', true, $5)
        ON CONFLICT (email) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name  = EXCLUDED.last_name,
          phone      = EXCLUDED.phone
        RETURNING id
      `, [b.email, PASSWORD_HASH, b.first_name, b.last_name, b.phone]);
      const userId = userRes.rows[0].id;

      // 2. Upsert brand profile (brands table has: address, phone, NOT location/contact_email)
      await client.query(`
        INSERT INTO brands (
          user_id, company_name, industry, website, description,
          logo_url, phone, address,
          total_campaigns, total_spent, is_active, is_verified
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,true)
        ON CONFLICT (user_id) DO UPDATE SET
          company_name   = EXCLUDED.company_name,
          total_campaigns= EXCLUDED.total_campaigns,
          total_spent    = EXCLUDED.total_spent,
          description    = EXCLUDED.description
        RETURNING id
      `, [
        userId, b.brand_name, b.industry, b.website, b.description,
        b.logo_url, b.phone, b.location,
        b.total_campaigns, b.total_spent,
      ]);
      brandCount++;

      console.log(`  ✅ Brand ${brandCount}/10: ${b.brand_name} (${b.first_name} ${b.last_name})`);
    }

    await client.query('COMMIT');

    console.log('\n' + '═'.repeat(60));
    console.log('🎉  SEED COMPLETE');
    console.log('═'.repeat(60));
    console.log(`   👤 Creators inserted : ${creatorCount}`);
    console.log(`   🏢 Brands inserted   : ${brandCount}`);
    console.log(`   📱 Social accounts   : ${socialCount}`);
    console.log(`   📊 Total users       : ${creatorCount + brandCount}`);
    console.log('');
    console.log('🔐 Login credentials for ALL users:');
    console.log('   Password: Test@1234');
    console.log('');
    console.log('📧 Sample creator emails:');
    CREATORS.slice(0, 5).forEach(c => console.log(`   ${c.email}`));
    console.log('   ...');
    console.log('');
    console.log('📧 Sample brand emails:');
    BRANDS.slice(0, 3).forEach(b => console.log(`   ${b.email}  →  ${b.brand_name}`));
    console.log('   ...');

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

// Run!
seed();
