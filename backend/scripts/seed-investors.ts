/**
 * Seed script for populating the investors database with real investor data
 * Run with: npx ts-node -r tsconfig-paths/register scripts/seed-investors.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { investors } from '../src/database/schema/investors.schema';

config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool);

interface InvestorSeed {
  name: string;
  description: string;
  website: string;
  stage: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'growth';
  sectors: string[];
  checkSizeMin: number;
  checkSizeMax: number;
  location: string;
  regions: string[];
  linkedinUrl?: string;
  twitterUrl?: string;
  portfolioCompanies: string[];
  notableExits: string[];
  isFeatured: boolean;
}

const investorData: InvestorSeed[] = [
  // Pre-Seed / Seed Investors
  {
    name: 'Y Combinator',
    description: 'The most prestigious startup accelerator. Invests $500K in startups twice a year.',
    website: 'https://www.ycombinator.com',
    stage: 'pre-seed',
    sectors: ['saas', 'fintech', 'ai', 'consumer', 'enterprise', 'healthtech', 'biotech'],
    checkSizeMin: 125,
    checkSizeMax: 500,
    location: 'San Francisco, CA',
    regions: ['us', 'global'],
    linkedinUrl: 'https://linkedin.com/company/y-combinator',
    twitterUrl: 'https://twitter.com/ycombinator',
    portfolioCompanies: ['Stripe', 'Airbnb', 'Dropbox', 'Coinbase', 'DoorDash', 'Instacart'],
    notableExits: ['Stripe ($95B)', 'Airbnb ($75B)', 'DoorDash ($50B)'],
    isFeatured: true,
  },
  {
    name: 'Techstars',
    description: 'Global accelerator network with programs in 150+ countries.',
    website: 'https://www.techstars.com',
    stage: 'pre-seed',
    sectors: ['saas', 'fintech', 'healthtech', 'ai', 'climate'],
    checkSizeMin: 20,
    checkSizeMax: 120,
    location: 'Boulder, CO',
    regions: ['us', 'eu', 'global'],
    linkedinUrl: 'https://linkedin.com/company/techstars',
    portfolioCompanies: ['SendGrid', 'DigitalOcean', 'Sphero', 'ClassPass'],
    notableExits: ['SendGrid (Twilio)', 'DigitalOcean (IPO)'],
    isFeatured: false,
  },
  {
    name: 'First Round Capital',
    description: 'Seed-stage VC focused on building a community of entrepreneurs.',
    website: 'https://firstround.com',
    stage: 'seed',
    sectors: ['saas', 'enterprise', 'consumer', 'fintech'],
    checkSizeMin: 500,
    checkSizeMax: 3000,
    location: 'San Francisco, CA',
    regions: ['us'],
    linkedinUrl: 'https://linkedin.com/company/first-round-capital',
    portfolioCompanies: ['Uber', 'Square', 'Notion', 'Roblox', 'Warby Parker'],
    notableExits: ['Uber (IPO)', 'Square (IPO)', 'Roblox (IPO)'],
    isFeatured: true,
  },
  {
    name: 'Precursor Ventures',
    description: 'Pre-seed fund investing in underrepresented founders.',
    website: 'https://precursorvc.com',
    stage: 'pre-seed',
    sectors: ['saas', 'fintech', 'consumer', 'enterprise'],
    checkSizeMin: 100,
    checkSizeMax: 500,
    location: 'San Francisco, CA',
    regions: ['us'],
    portfolioCompanies: ['Clearbit', 'Descript', 'Webflow'],
    notableExits: [],
    isFeatured: false,
  },

  // Series A Investors
  {
    name: 'Sequoia Capital',
    description: 'Legendary VC firm that has backed companies worth over $3.3 trillion in combined market value.',
    website: 'https://www.sequoiacap.com',
    stage: 'series-a',
    sectors: ['saas', 'fintech', 'ai', 'consumer', 'enterprise', 'crypto', 'healthtech'],
    checkSizeMin: 1000,
    checkSizeMax: 25000,
    location: 'Menlo Park, CA',
    regions: ['us', 'eu', 'apac', 'global'],
    linkedinUrl: 'https://linkedin.com/company/sequoia-capital',
    twitterUrl: 'https://twitter.com/sequoia',
    portfolioCompanies: ['Apple', 'Google', 'WhatsApp', 'Stripe', 'Zoom', 'Snowflake'],
    notableExits: ['WhatsApp ($19B)', 'Instagram ($1B)', 'YouTube ($1.65B)'],
    isFeatured: true,
  },
  {
    name: 'Andreessen Horowitz (a16z)',
    description: 'Software-focused VC firm with $35B+ under management.',
    website: 'https://a16z.com',
    stage: 'series-a',
    sectors: ['saas', 'fintech', 'ai', 'crypto', 'consumer', 'enterprise', 'biotech'],
    checkSizeMin: 2000,
    checkSizeMax: 50000,
    location: 'Menlo Park, CA',
    regions: ['us', 'global'],
    linkedinUrl: 'https://linkedin.com/company/andreessen-horowitz',
    twitterUrl: 'https://twitter.com/a16z',
    portfolioCompanies: ['Facebook', 'Airbnb', 'Coinbase', 'Slack', 'GitHub', 'Figma'],
    notableExits: ['GitHub ($7.5B)', 'Skype ($8.5B)', 'Oculus ($2B)'],
    isFeatured: true,
  },
  {
    name: 'Accel',
    description: 'Global VC firm with over 50 years of experience backing entrepreneurs.',
    website: 'https://www.accel.com',
    stage: 'series-a',
    sectors: ['saas', 'fintech', 'consumer', 'enterprise', 'ai'],
    checkSizeMin: 1000,
    checkSizeMax: 20000,
    location: 'Palo Alto, CA',
    regions: ['us', 'eu', 'apac'],
    linkedinUrl: 'https://linkedin.com/company/accel-partners',
    portfolioCompanies: ['Facebook', 'Spotify', 'Slack', 'Dropbox', 'Atlassian', 'Figma'],
    notableExits: ['Facebook (IPO)', 'Spotify (IPO)', 'Figma ($20B)'],
    isFeatured: true,
  },
  {
    name: 'Bessemer Venture Partners',
    description: 'One of the oldest VC firms with 130+ IPOs.',
    website: 'https://www.bvp.com',
    stage: 'series-a',
    sectors: ['saas', 'fintech', 'healthtech', 'consumer', 'enterprise'],
    checkSizeMin: 1000,
    checkSizeMax: 30000,
    location: 'San Francisco, CA',
    regions: ['us', 'eu', 'apac'],
    linkedinUrl: 'https://linkedin.com/company/bessemer-venture-partners',
    portfolioCompanies: ['Shopify', 'LinkedIn', 'Pinterest', 'Twilio', 'Canva'],
    notableExits: ['LinkedIn ($26B)', 'Shopify (IPO)', 'Twilio (IPO)'],
    isFeatured: false,
  },
  {
    name: 'Index Ventures',
    description: 'European-founded global VC with offices in SF, London, and Geneva.',
    website: 'https://www.indexventures.com',
    stage: 'series-a',
    sectors: ['saas', 'fintech', 'consumer', 'enterprise', 'ai'],
    checkSizeMin: 1000,
    checkSizeMax: 25000,
    location: 'San Francisco, CA',
    regions: ['us', 'eu', 'global'],
    linkedinUrl: 'https://linkedin.com/company/index-ventures',
    portfolioCompanies: ['Figma', 'Discord', 'Notion', 'Roblox', 'Revolut'],
    notableExits: ['Figma ($20B)', 'Supercell ($10B)'],
    isFeatured: false,
  },
  // Series B+ Investors
  {
    name: 'General Catalyst',
    description: 'Growth-stage VC with $25B+ under management.',
    website: 'https://www.generalcatalyst.com',
    stage: 'series-b',
    sectors: ['saas', 'fintech', 'healthtech', 'consumer', 'enterprise', 'ai'],
    checkSizeMin: 5000,
    checkSizeMax: 100000,
    location: 'Cambridge, MA',
    regions: ['us', 'eu'],
    linkedinUrl: 'https://linkedin.com/company/general-catalyst-partners',
    portfolioCompanies: ['Stripe', 'Airbnb', 'Snap', 'HubSpot', 'Warby Parker'],
    notableExits: ['Snap (IPO)', 'HubSpot (IPO)'],
    isFeatured: false,
  },
  {
    name: 'Lightspeed Venture Partners',
    description: 'Multi-stage VC with $18B+ under management.',
    website: 'https://lsvp.com',
    stage: 'series-b',
    sectors: ['saas', 'fintech', 'consumer', 'enterprise', 'crypto'],
    checkSizeMin: 5000,
    checkSizeMax: 75000,
    location: 'Menlo Park, CA',
    regions: ['us', 'apac', 'eu'],
    linkedinUrl: 'https://linkedin.com/company/lightspeed-venture-partners',
    portfolioCompanies: ['Snap', 'Affirm', 'Mulesoft', 'AppDynamics', 'Nutanix'],
    notableExits: ['Snap (IPO)', 'Mulesoft ($6.5B)', 'AppDynamics ($3.7B)'],
    isFeatured: false,
  },

  // Growth Stage
  {
    name: 'Tiger Global',
    description: 'Crossover fund known for aggressive growth-stage investments.',
    website: 'https://www.tigerglobal.com',
    stage: 'growth',
    sectors: ['saas', 'fintech', 'consumer', 'enterprise', 'ai', 'crypto'],
    checkSizeMin: 10000,
    checkSizeMax: 500000,
    location: 'New York, NY',
    regions: ['us', 'global'],
    portfolioCompanies: ['Stripe', 'ByteDance', 'Flipkart', 'Peloton', 'Toast'],
    notableExits: ['Flipkart ($16B)', 'JD.com (IPO)'],
    isFeatured: false,
  },
  {
    name: 'Coatue Management',
    description: 'Technology-focused crossover fund with $75B+ AUM.',
    website: 'https://www.coatue.com',
    stage: 'growth',
    sectors: ['saas', 'fintech', 'consumer', 'ai', 'enterprise'],
    checkSizeMin: 10000,
    checkSizeMax: 300000,
    location: 'New York, NY',
    regions: ['us', 'global'],
    portfolioCompanies: ['Snap', 'DoorDash', 'Instacart', 'Databricks', 'Airtable'],
    notableExits: ['Snap (IPO)', 'DoorDash (IPO)'],
    isFeatured: false,
  },
  // European Investors
  {
    name: 'Balderton Capital',
    description: 'Leading European VC focused on Series A and B.',
    website: 'https://www.balderton.com',
    stage: 'series-a',
    sectors: ['saas', 'fintech', 'consumer', 'enterprise', 'healthtech'],
    checkSizeMin: 1000,
    checkSizeMax: 20000,
    location: 'London, UK',
    regions: ['eu'],
    linkedinUrl: 'https://linkedin.com/company/balderton-capital',
    portfolioCompanies: ['Revolut', 'Citymapper', 'Depop', 'GoCardless'],
    notableExits: ['Depop ($1.6B)', 'The Hut Group (IPO)'],
    isFeatured: false,
  },
  {
    name: 'Atomico',
    description: 'European VC founded by Skype co-founder Niklas Zennström.',
    website: 'https://www.atomico.com',
    stage: 'series-a',
    sectors: ['saas', 'fintech', 'consumer', 'enterprise', 'climate'],
    checkSizeMin: 1000,
    checkSizeMax: 25000,
    location: 'London, UK',
    regions: ['eu'],
    linkedinUrl: 'https://linkedin.com/company/atomico',
    portfolioCompanies: ['Klarna', 'Supercell', 'Graphcore', 'Lilium'],
    notableExits: ['Supercell ($10B)'],
    isFeatured: false,
  },
  // Fintech Specialists
  {
    name: 'Ribbit Capital',
    description: 'Fintech-focused VC with deep expertise in financial services.',
    website: 'https://ribbitcap.com',
    stage: 'seed',
    sectors: ['fintech', 'crypto'],
    checkSizeMin: 500,
    checkSizeMax: 15000,
    location: 'Palo Alto, CA',
    regions: ['us', 'global'],
    portfolioCompanies: ['Robinhood', 'Coinbase', 'Nubank', 'Credit Karma', 'Affirm'],
    notableExits: ['Coinbase (IPO)', 'Credit Karma ($7B)', 'Affirm (IPO)'],
    isFeatured: true,
  },
  {
    name: 'QED Investors',
    description: 'Fintech specialist founded by Capital One co-founder.',
    website: 'https://www.qedinvestors.com',
    stage: 'series-a',
    sectors: ['fintech'],
    checkSizeMin: 1000,
    checkSizeMax: 20000,
    location: 'Alexandria, VA',
    regions: ['us', 'latam', 'eu'],
    linkedinUrl: 'https://linkedin.com/company/qed-investors',
    portfolioCompanies: ['Nubank', 'Klarna', 'SoFi', 'Credit Karma', 'Remitly'],
    notableExits: ['Credit Karma ($7B)', 'SoFi (IPO)'],
    isFeatured: false,
  },
  // AI/ML Specialists
  {
    name: 'Greylock Partners',
    description: 'Enterprise and AI-focused VC with legendary track record.',
    website: 'https://greylock.com',
    stage: 'series-a',
    sectors: ['saas', 'enterprise', 'ai', 'consumer'],
    checkSizeMin: 1000,
    checkSizeMax: 25000,
    location: 'Menlo Park, CA',
    regions: ['us'],
    linkedinUrl: 'https://linkedin.com/company/greylock-partners',
    portfolioCompanies: ['LinkedIn', 'Facebook', 'Airbnb', 'Discord', 'Figma'],
    notableExits: ['LinkedIn ($26B)', 'Workday (IPO)'],
    isFeatured: false,
  },
];

async function seed() {
  console.log('🌱 Seeding investors database...');
  
  try {
    // Insert all investors
    for (const inv of investorData) {
      await db.insert(investors).values({
        name: inv.name,
        description: inv.description,
        website: inv.website,
        stage: inv.stage,
        sectors: inv.sectors,
        checkSizeMin: inv.checkSizeMin,
        checkSizeMax: inv.checkSizeMax,
        location: inv.location,
        regions: inv.regions,
        linkedinUrl: inv.linkedinUrl,
        twitterUrl: inv.twitterUrl,
        portfolioCompanies: inv.portfolioCompanies,
        notableExits: inv.notableExits,
        isActive: true,
        isFeatured: inv.isFeatured,
      });
      console.log(`  ✓ Added ${inv.name}`);
    }
    
    console.log(`\n✅ Successfully seeded ${investorData.length} investors`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await pool.end();
    process.exit(1);
  }
  
  await pool.end();
  process.exit(0);
}

seed();
