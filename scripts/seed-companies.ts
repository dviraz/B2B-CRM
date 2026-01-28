import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Initialize Supabase client with service role key for admin operations
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sampleCompanies = [
  {
    name: 'Bella Vista Dental',
    status: 'active' as const,
    plan_tier: 'pro' as const,
    max_active_limit: 2,
    industry: 'dental' as const,
    business_type: 'b2c' as const,
    city: 'San Francisco',
    state: 'CA',
    country: 'USA',
    website_url: 'https://bellavistadental.com',
    phone: '+1-415-555-0123',
    employee_count: 12,
    annual_revenue_range: '500k_1m' as const,
    notes: 'Premium dental practice, needs monthly social media content',
    contacts: [
      {
        name: 'Dr. Sarah Martinez',
        email: 'sarah@bellavistadental.com',
        phone: '+1-415-555-0123',
        role: 'Owner & Dentist',
        is_primary: true,
        is_billing_contact: true,
        is_active: true,
      },
      {
        name: 'Jennifer Lee',
        email: 'jennifer@bellavistadental.com',
        phone: '+1-415-555-0124',
        role: 'Office Manager',
        is_primary: false,
        is_billing_contact: false,
        is_active: true,
      },
    ],
    services: [
      {
        service_name: 'Social Media Management - Pro',
        service_type: 'subscription' as const,
        status: 'active' as const,
        price: 995,
        billing_cycle: 'monthly' as const,
        start_date: '2025-01-01',
        renewal_date: '2026-01-01',
      },
      {
        service_name: 'Website Redesign',
        service_type: 'one_time' as const,
        status: 'active' as const,
        price: 4500,
        billing_cycle: 'one_time' as const,
        start_date: '2025-12-15',
      },
    ],
  },
  {
    name: 'GreenLeaf Home Services',
    status: 'active' as const,
    plan_tier: 'standard' as const,
    max_active_limit: 1,
    industry: 'home_services' as const,
    business_type: 'b2c' as const,
    city: 'Austin',
    state: 'TX',
    country: 'USA',
    website_url: 'https://greenleafhome.com',
    phone: '+1-512-555-0200',
    employee_count: 25,
    annual_revenue_range: '1m_5m' as const,
    instagram_handle: '@greenleafhome',
    facebook_url: 'https://facebook.com/greenleafhome',
    notes: 'Landscaping and maintenance company, seasonal content needs',
    contacts: [
      {
        name: 'Michael Johnson',
        email: 'michael@greenleafhome.com',
        phone: '+1-512-555-0200',
        role: 'CEO',
        is_primary: true,
        is_billing_contact: true,
        is_active: true,
      },
    ],
    services: [
      {
        service_name: 'Marketing Package - Standard',
        service_type: 'subscription' as const,
        status: 'active' as const,
        price: 495,
        billing_cycle: 'monthly' as const,
        start_date: '2025-11-01',
        renewal_date: '2025-11-01',
      },
    ],
  },
  {
    name: 'TechVision Software',
    status: 'active' as const,
    plan_tier: 'pro' as const,
    max_active_limit: 2,
    industry: 'technology' as const,
    business_type: 'b2b' as const,
    city: 'Seattle',
    state: 'WA',
    country: 'USA',
    website_url: 'https://techvision.io',
    linkedin_url: 'https://linkedin.com/company/techvision',
    phone: '+1-206-555-0300',
    employee_count: 50,
    annual_revenue_range: '5m_10m' as const,
    notes: 'SaaS company, needs content marketing and design support',
    contacts: [
      {
        name: 'David Chen',
        email: 'david@techvision.io',
        phone: '+1-206-555-0300',
        role: 'VP Marketing',
        is_primary: true,
        is_billing_contact: false,
        is_active: true,
      },
      {
        name: 'Amanda Rodriguez',
        email: 'amanda@techvision.io',
        phone: '+1-206-555-0301',
        role: 'CFO',
        is_primary: false,
        is_billing_contact: true,
        is_active: true,
      },
    ],
    services: [
      {
        service_name: 'Design & Content - Pro',
        service_type: 'subscription' as const,
        status: 'active' as const,
        price: 1495,
        billing_cycle: 'monthly' as const,
        start_date: '2024-06-01',
        renewal_date: '2026-06-01',
      },
    ],
  },
  {
    name: 'Elite Fitness Studio',
    status: 'paused' as const,
    plan_tier: 'standard' as const,
    max_active_limit: 1,
    industry: 'fitness' as const,
    business_type: 'b2c' as const,
    city: 'Miami',
    state: 'FL',
    country: 'USA',
    website_url: 'https://elitefitness.com',
    instagram_handle: '@elitefitnessstudio',
    phone: '+1-305-555-0400',
    employee_count: 8,
    annual_revenue_range: '100k_500k' as const,
    notes: 'Temporarily paused due to facility renovation',
    contacts: [
      {
        name: 'Carlos Rivera',
        email: 'carlos@elitefitness.com',
        phone: '+1-305-555-0400',
        role: 'Owner',
        is_primary: true,
        is_billing_contact: true,
        is_active: true,
      },
    ],
    services: [
      {
        service_name: 'Social Media - Standard',
        service_type: 'subscription' as const,
        status: 'paused' as const,
        price: 495,
        billing_cycle: 'monthly' as const,
        start_date: '2024-03-01',
      },
    ],
  },
  {
    name: 'Harmony Spa & Wellness',
    status: 'active' as const,
    plan_tier: 'pro' as const,
    max_active_limit: 2,
    industry: 'beauty_spa' as const,
    business_type: 'b2c' as const,
    city: 'Los Angeles',
    state: 'CA',
    country: 'USA',
    website_url: 'https://harmonyspa.com',
    instagram_handle: '@harmonyspa',
    facebook_url: 'https://facebook.com/harmonyspa',
    phone: '+1-310-555-0500',
    employee_count: 15,
    annual_revenue_range: '1m_5m' as const,
    notes: 'Luxury spa, high-end branding requirements',
    contacts: [
      {
        name: 'Isabella Thompson',
        email: 'isabella@harmonyspa.com',
        phone: '+1-310-555-0500',
        role: 'Spa Director',
        is_primary: true,
        is_billing_contact: true,
        is_active: true,
      },
    ],
    services: [
      {
        service_name: 'Premium Marketing Suite',
        service_type: 'subscription' as const,
        status: 'active' as const,
        price: 1995,
        billing_cycle: 'monthly' as const,
        start_date: '2024-01-15',
        renewal_date: '2026-01-15',
      },
    ],
  },
  {
    name: 'Metro Legal Associates',
    status: 'churned' as const,
    plan_tier: 'standard' as const,
    max_active_limit: 1,
    industry: 'legal' as const,
    business_type: 'b2b' as const,
    city: 'Chicago',
    state: 'IL',
    country: 'USA',
    website_url: 'https://metrolegal.com',
    linkedin_url: 'https://linkedin.com/company/metrolegal',
    phone: '+1-312-555-0600',
    employee_count: 20,
    annual_revenue_range: '1m_5m' as const,
    notes: 'Cancelled service in December 2025, brought marketing in-house',
    contacts: [
      {
        name: 'Robert Williams',
        email: 'robert@metrolegal.com',
        phone: '+1-312-555-0600',
        role: 'Managing Partner',
        is_primary: true,
        is_billing_contact: true,
        is_active: false,
      },
    ],
    services: [
      {
        service_name: 'Legal Marketing - Standard',
        service_type: 'subscription' as const,
        status: 'cancelled' as const,
        price: 795,
        billing_cycle: 'monthly' as const,
        start_date: '2024-05-01',
        end_date: '2025-12-31',
      },
    ],
  },
  {
    name: 'Prime Real Estate Group',
    status: 'active' as const,
    plan_tier: 'pro' as const,
    max_active_limit: 2,
    industry: 'real_estate' as const,
    business_type: 'b2c' as const,
    city: 'Denver',
    state: 'CO',
    country: 'USA',
    website_url: 'https://primerealestate.com',
    instagram_handle: '@primerealestate',
    linkedin_url: 'https://linkedin.com/company/primerealestate',
    phone: '+1-303-555-0700',
    employee_count: 35,
    annual_revenue_range: 'over_10m' as const,
    notes: 'High-volume real estate firm, needs property marketing materials',
    contacts: [
      {
        name: 'Lisa Anderson',
        email: 'lisa@primerealestate.com',
        phone: '+1-303-555-0700',
        role: 'Broker/Owner',
        is_primary: true,
        is_billing_contact: false,
        is_active: true,
      },
      {
        name: 'Tom Baker',
        email: 'tom@primerealestate.com',
        phone: '+1-303-555-0701',
        role: 'Marketing Director',
        is_primary: false,
        is_billing_contact: true,
        is_active: true,
      },
    ],
    services: [
      {
        service_name: 'Real Estate Marketing - Pro',
        service_type: 'subscription' as const,
        status: 'active' as const,
        price: 1295,
        billing_cycle: 'monthly' as const,
        start_date: '2023-08-01',
        renewal_date: '2026-08-01',
      },
      {
        service_name: 'Listing Photo Package',
        service_type: 'subscription' as const,
        status: 'active' as const,
        price: 299,
        billing_cycle: 'monthly' as const,
        start_date: '2024-01-01',
        renewal_date: '2026-01-01',
      },
    ],
  },
];

async function seedCompanies() {
  console.log('🌱 Starting to seed companies...\n');

  for (const companyData of sampleCompanies) {
    try {
      const { contacts, services, ...company } = companyData;

      // Insert company
      console.log(`📝 Creating company: ${company.name}`);
      const { data: insertedCompany, error: companyError } = await (supabase
        .from('companies') as ReturnType<typeof supabase.from>)
        .insert(company as Record<string, unknown>)
        .select()
        .single();

      if (companyError) {
        console.error(`❌ Error creating ${company.name}:`, companyError.message);
        continue;
      }

      console.log(`✅ Created company: ${insertedCompany.name} (${insertedCompany.id})`);

      // Insert contacts
      if (contacts && contacts.length > 0) {
        const contactsWithCompanyId = contacts.map((contact) => ({
          ...contact,
          company_id: insertedCompany.id,
        }));

        const { data: insertedContacts, error: contactsError } = await (supabase
          .from('contacts') as ReturnType<typeof supabase.from>)
          .insert(contactsWithCompanyId as Record<string, unknown>[])
          .select();

        if (contactsError) {
          console.error(`❌ Error creating contacts:`, contactsError.message);
        } else {
          console.log(`  👤 Added ${insertedContacts.length} contact(s)`);

          // Update company with primary contact
          const primaryContact = (insertedContacts as Array<{ id: string; is_primary?: boolean }>).find((c) => c.is_primary);
          if (primaryContact) {
            await (supabase
              .from('companies') as ReturnType<typeof supabase.from>)
              .update({ primary_contact_id: primaryContact.id } as Record<string, unknown>)
              .eq('id', (insertedCompany as { id: string }).id);
          }
        }
      }

      // Insert services
      if (services && services.length > 0) {
        const servicesWithCompanyId = services.map((service) => ({
          ...service,
          company_id: insertedCompany.id,
          metadata: {},
        }));

        const { data: insertedServices, error: servicesError } = await (supabase
          .from('client_services') as ReturnType<typeof supabase.from>)
          .insert(servicesWithCompanyId as Record<string, unknown>[])
          .select();

        if (servicesError) {
          console.error(`❌ Error creating services:`, servicesError.message);
        } else {
          console.log(`  💼 Added ${insertedServices.length} service(s)`);
        }
      }

      console.log('');
    } catch (error) {
      console.error(`❌ Unexpected error:`, error);
    }
  }

  console.log('✨ Seeding completed!\n');

  // Show summary
  const { count } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total companies in database: ${count}`);
}

// Run the seed function
seedCompanies()
  .then(() => {
    console.log('👋 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
