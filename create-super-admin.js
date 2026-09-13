import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createSuperAdmin() {
  const email = 'admin@school.com';
  const password = 'Admin@123456';
  const full_name = 'Super Admin';

  console.log('Creating super admin account...');
  console.log('Email:', email);
  console.log('Password:', password);

  const apiUrl = `${supabaseUrl}/functions/v1/create-super-admin`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        email,
        password,
        full_name,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ Super Admin created successfully!');
      console.log('\n📧 Login Credentials:');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('\n⚠️  Please save these credentials securely!');
    } else {
      console.error('❌ Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
  }
}

createSuperAdmin();
