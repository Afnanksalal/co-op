/**
 * Seed Admin User Script
 * 
 * Creates an admin user in Supabase and syncs to the database.
 * Also creates entry in admin_users table.
 * 
 * Usage: npm run seed:admin
 */

import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { config } from 'dotenv';
import { pgTable, uuid, varchar, boolean, timestamp, text, integer, decimal } from 'drizzle-orm/pg-core';

// Load environment variables
config();

// ============================================
// INLINE SCHEMA (to avoid import issues)
// ============================================

const startups = pgTable('startups', {
  id: uuid('id').primaryKey().defaultRandom(),
  founderName: varchar('founder_name', { length: 255 }).notNull(),
  founderRole: varchar('founder_role', { length: 100 }).notNull(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  tagline: varchar('tagline', { length: 500 }),
  description: text('description').notNull(),
  website: varchar('website', { length: 500 }),
  industry: varchar('industry', { length: 100 }).notNull(),
  sector: varchar('sector', { length: 50 }).notNull().default('other'),
  businessModel: varchar('business_model', { length: 100 }).notNull(),
  revenueModel: varchar('revenue_model', { length: 100 }),
  stage: varchar('stage', { length: 100 }).notNull(),
  foundedYear: integer('founded_year').notNull(),
  teamSize: varchar('team_size', { length: 50 }).notNull(),
  cofounderCount: integer('cofounder_count').notNull().default(1),
  country: varchar('country', { length: 100 }).notNull(),
  city: varchar('city', { length: 100 }),
  fundingStage: varchar('funding_stage', { length: 100 }),
  totalRaised: decimal('total_raised', { precision: 15, scale: 2 }),
  monthlyRevenue: decimal('monthly_revenue', { precision: 15, scale: 2 }),
  isRevenue: varchar('is_revenue', { length: 20 }).notNull().default('no'),
  targetCustomer: text('target_customer'),
  problemSolved: text('problem_solved'),
  competitiveAdvantage: text('competitive_advantage'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  authProvider: varchar('auth_provider', { length: 50 }),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  startupId: uuid('startup_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  role: varchar('role', { length: 50 }).notNull().default('admin'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// CONFIGURATION
// ============================================

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@co-op.dev';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!@#';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Co-Op Admin';

// ============================================
// MAIN FUNCTION
// ============================================

async function main(): Promise<void> {
  console.log('');
  console.log('========================================');
  console.log('       CO-OP ADMIN SEED SCRIPT         ');
  console.log('========================================');
  console.log('');

  // Validate environment
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  console.log('[1/7] Checking environment variables...');
  
  if (!supabaseUrl) {
    console.error('ERROR: SUPABASE_URL is not set');
    process.exit(1);
  }
  if (!supabaseServiceKey) {
    console.error('ERROR: SUPABASE_SERVICE_KEY is not set');
    process.exit(1);
  }
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL is not set');
    process.exit(1);
  }
  
  console.log('       All environment variables present');
  console.log('');

  // Initialize Supabase Admin client
  console.log('[2/7] Initializing Supabase client...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  console.log('       Supabase client ready');
  console.log('');

  // Initialize Database connection
  console.log('[3/7] Connecting to database...');
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool);
  console.log('       Database connected');
  console.log('');

  try {
    // Check/Create Supabase user
    console.log('[4/7] Setting up Supabase auth user...');
    console.log('       Email: ' + ADMIN_EMAIL);
    
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existingUser = listData?.users?.find((u: { email?: string }) => u.email === ADMIN_EMAIL);
    
    let supabaseUserId: string;
    
    if (existingUser) {
      console.log('       User already exists in Supabase');
      supabaseUserId = existingUser.id;
      
      // Update metadata to ensure admin role
      await supabase.auth.admin.updateUserById(supabaseUserId, {
        app_metadata: { role: 'admin' },
        user_metadata: { full_name: ADMIN_NAME },
      });
      console.log('       Updated app_metadata.role = admin');
    } else {
      console.log('       Creating new Supabase user...');
      
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        app_metadata: { role: 'admin' },
        user_metadata: { full_name: ADMIN_NAME },
      });
      
      if (error || !newUser.user) {
        console.error('ERROR: Failed to create Supabase user');
        console.error(error?.message || 'Unknown error');
        process.exit(1);
      }
      
      supabaseUserId = newUser.user.id;
      console.log('       Created Supabase user: ' + supabaseUserId);
    }
    console.log('');

    // Check/Create database user
    console.log('[5/7] Syncing user to database...');
    
    const existingDbUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, supabaseUserId))
      .limit(1);
    
    let startupId: string | null = null;
    
    if (existingDbUsers.length > 0) {
      console.log('       User exists in database');
      startupId = existingDbUsers[0].startupId;
      
      // Update to admin role
      await db
        .update(users)
        .set({ 
          role: 'admin', 
          name: ADMIN_NAME,
          updatedAt: new Date(),
        })
        .where(eq(users.id, supabaseUserId));
      console.log('       Updated users.role = admin');
    } else {
      console.log('       Creating database user...');
      
      await db.insert(users).values({
        id: supabaseUserId,
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: 'admin',
        authProvider: 'email',
        onboardingCompleted: false, // Will be set true after startup creation
      });
      console.log('       Created user in database');
    }
    console.log('');

    // Create startup if needed
    console.log('[6/7] Setting up startup profile...');
    
    if (startupId) {
      console.log('       Startup already linked: ' + startupId);
    } else {
      console.log('       Creating startup profile...');
      
      const [newStartup] = await db
        .insert(startups)
        .values({
          founderName: ADMIN_NAME,
          founderRole: 'ceo',
          companyName: 'Co-Op Platform',
          tagline: 'AI Advisory for Startups',
          description: 'Co-Op is an AI-powered advisory platform providing expert guidance across legal, finance, investor relations, and competitive analysis.',
          website: 'https://co-op.dev',
          industry: 'ai_ml',
          sector: 'saas',
          businessModel: 'b2b',
          revenueModel: 'subscription',
          stage: 'growth',
          foundedYear: 2024,
          teamSize: '6-20',
          cofounderCount: 2,
          country: 'United States',
          city: 'San Francisco',
          fundingStage: 'seed',
          isRevenue: 'yes',
          targetCustomer: 'Early-stage startups seeking expert advisory',
          problemSolved: 'Startups lack access to affordable expert advisory',
          competitiveAdvantage: 'LLM Council architecture with cross-validation',
        })
        .returning();
      
      startupId = newStartup.id;
      console.log('       Created startup: ' + startupId);
      
      // Link startup to user and mark onboarding complete
      await db
        .update(users)
        .set({ 
          startupId: startupId,
          onboardingCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, supabaseUserId));
      console.log('       Linked startup to user');
    }
    console.log('');

    // Create admin_users entry
    console.log('[7/7] Setting up admin_users entry...');
    
    const existingAdminUser = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.userId, supabaseUserId))
      .limit(1);
    
    if (existingAdminUser.length > 0) {
      console.log('       Admin entry already exists');
    } else {
      await db.insert(adminUsers).values({
        userId: supabaseUserId,
        role: 'admin',
      });
      console.log('       Created admin_users entry');
    }
    console.log('');

    // Done!
    console.log('========================================');
    console.log('         SEED COMPLETED!                ');
    console.log('========================================');
    console.log('');
    console.log('  Admin user created with:');
    console.log('');
    console.log('  Email:    ' + ADMIN_EMAIL);
    console.log('  Password: ' + ADMIN_PASSWORD);
    console.log('  Role:     admin');
    console.log('');
    console.log('  Database entries:');
    console.log('  - users table (role=admin)');
    console.log('  - admin_users table');
    console.log('  - startups table');
    console.log('');
    console.log('  Supabase:');
    console.log('  - app_metadata.role = admin');
    console.log('');
    console.log('========================================');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('            SEED FAILED                 ');
    console.error('========================================');
    console.error('');
    if (error instanceof Error) {
      console.error('Error: ' + error.message);
      console.error('');
      console.error(error.stack);
    } else {
      console.error(error);
    }
    console.error('');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run
main().catch(console.error);
