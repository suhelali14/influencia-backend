/**
 * India Market Configuration
 * Platform-specific settings for Indian influencer marketing
 */

export const INDIA_CONFIG = {
  // Supported regional languages
  LANGUAGES: [
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  ],

  // Major Indian cities
  CITIES: [
    'Mumbai',
    'Delhi',
    'Bangalore',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Pune',
    'Ahmedabad',
    'Jaipur',
    'Lucknow',
    'Chandigarh',
    'Kochi',
    'Indore',
    'Bhopal',
    'Visakhapatnam',
    'Nagpur',
    'Surat',
    'Coimbatore',
    'Vadodara',
    'Patna',
  ],

  // Indian social media platforms
  PLATFORMS: [
    { id: 'instagram', name: 'Instagram', popular: true, global: true },
    { id: 'youtube', name: 'YouTube', popular: true, global: true },
    { id: 'facebook', name: 'Facebook', popular: true, global: true },
    { id: 'twitter', name: 'Twitter', popular: false, global: true },
    { id: 'linkedin', name: 'LinkedIn', popular: false, global: true },
    { id: 'sharechat', name: 'ShareChat', popular: true, global: false, india: true },
    { id: 'moj', name: 'Moj', popular: true, global: false, india: true },
    { id: 'josh', name: 'Josh', popular: true, global: false, india: true },
    { id: 'chingari', name: 'Chingari', popular: false, global: false, india: true },
    { id: 'roposo', name: 'Roposo', popular: false, global: false, india: true },
  ],

  // India-specific content categories
  CATEGORIES: [
    'Fashion & Lifestyle',
    'Technology & Gadgets',
    'Food & Cooking',
    'Entertainment & Comedy',
    'Education & Skills',
    'Finance & Investment',
    'Health & Fitness',
    'Travel & Tourism',
    'Gaming',
    'Beauty & Makeup',
    'Devotional & Spirituality',
    'Regional Content',
    'News & Current Affairs',
    'Music & Dance',
    'Sports & Cricket',
    'Family & Parenting',
    'Business & Entrepreneurship',
    'Art & Craft',
    'Photography & Videography',
    'Automotive',
  ],

  // Popular Indian brands by category
  BRANDS: {
    ecommerce: ['Flipkart', 'Amazon India', 'Myntra', 'Ajio', 'Meesho'],
    fintech: ['PhonePe', 'Paytm', 'CRED', 'Google Pay', 'Razorpay'],
    foodtech: ['Swiggy', 'Zomato', 'Blinkit', 'Zepto'],
    edtech: ["Byju's", 'Unacademy', 'Vedantu', 'UpGrad', 'PhysicsWallah'],
    beauty: ['Nykaa', 'Mamaearth', 'Sugar Cosmetics', 'Wow Skin Science', 'Plum'],
    electronics: ['Boat', 'Noise', 'Realme', 'OnePlus', 'Xiaomi'],
    fmcg: ['HUL', 'Nestle India', 'ITC', 'Britannia', 'Amul'],
    automotive: ['Tata Motors', 'Maruti Suzuki', 'Hero MotoCorp', 'TVS', 'Ola Electric'],
  },

  // Budget ranges in INR
  BUDGET_RANGES: [
    { min: 5000, max: 25000, label: '₹5K - ₹25K', tier: 'nano' },
    { min: 25000, max: 100000, label: '₹25K - ₹1L', tier: 'micro' },
    { min: 100000, max: 500000, label: '₹1L - ₹5L', tier: 'mid' },
    { min: 500000, max: 2000000, label: '₹5L - ₹20L', tier: 'macro' },
    { min: 2000000, max: 10000000, label: '₹20L - ₹1Cr', tier: 'mega' },
  ],

  // Creator tiers with India-specific follower ranges
  CREATOR_TIERS: [
    { id: 'nano', name: 'Nano', minFollowers: 500, maxFollowers: 10000, color: '#10B981' },
    { id: 'micro', name: 'Micro', minFollowers: 10000, maxFollowers: 50000, color: '#3B82F6' },
    { id: 'mid', name: 'Mid-tier', minFollowers: 50000, maxFollowers: 500000, color: '#8B5CF6' },
    { id: 'macro', name: 'Macro', minFollowers: 500000, maxFollowers: 1000000, color: '#EF4444' },
    { id: 'mega', name: 'Mega', minFollowers: 1000000, maxFollowers: 100000000, color: '#F59E0B' },
  ],

  // Age groups common in India
  AGE_GROUPS: [
    { value: '13-17', label: '13-17 (Gen Z Early)' },
    { value: '18-24', label: '18-24 (Gen Z)' },
    { value: '25-34', label: '25-34 (Millennials)' },
    { value: '35-44', label: '35-44 (Gen X)' },
    { value: '45+', label: '45+ (Boomers)' },
  ],

  // Gender options
  GENDER_OPTIONS: [
    { value: 'All', label: 'All Genders' },
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' },
  ],

  // Currency format
  CURRENCY: {
    code: 'INR',
    symbol: '₹',
    locale: 'en-IN',
  },

  // Payment options popular in India
  PAYMENT_METHODS: [
    'UPI',
    'Bank Transfer (NEFT/IMPS)',
    'Paytm',
    'PhonePe',
    'Google Pay',
    'Credit/Debit Card',
    'Cash',
  ],

  // Common deliverables
  DELIVERABLES: [
    'Instagram Post',
    'Instagram Story',
    'Instagram Reel',
    'YouTube Video',
    'YouTube Short',
    'Facebook Post',
    'Twitter Tweet',
    'LinkedIn Post',
    'ShareChat Post',
    'Moj Video',
    'Josh Video',
    'Blog Article',
    'Product Review',
    'Live Session',
    'Unboxing Video',
    'Tutorial/How-to',
  ],

  // Default settings
  DEFAULTS: {
    language: 'en',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    minBudget: 5000,
    maxBudget: 10000000,
    minEngagement: 2.0,
    campaignDuration: 30,
  },
};

export default INDIA_CONFIG;
