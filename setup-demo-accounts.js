import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables!');
  console.error('Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const demoAccounts = [
  {
    email: 'principal@school.com',
    password: 'principal123',
    full_name: 'Principal',
    role: 'principal',
    leading_teacher_id: null
  },
  // Ahmed Faris's Team
  {
    email: 'ahmed.faris@school.com',
    password: 'leading123',
    full_name: 'Ahmed Faris',
    role: 'leading_teacher',
    leading_teacher_id: null
  },
  {
    email: 'ahmed.farish@school.com',
    password: 'teacher123',
    full_name: 'Ahmed Farish',
    role: 'teacher',
    leading_teacher_email: 'ahmed.faris@school.com'
  },
  {
    email: 'ahmed.fareed@school.com',
    password: 'teacher123',
    full_name: 'Ahmed Fareed',
    role: 'teacher',
    leading_teacher_email: 'ahmed.faris@school.com'
  },
  {
    email: 'abdulla.shareef@school.com',
    password: 'teacher123',
    full_name: 'Abdulla Shareef',
    role: 'teacher',
    leading_teacher_email: 'ahmed.faris@school.com'
  },
  {
    email: 'aminath.shauna@school.com',
    password: 'teacher123',
    full_name: 'Aminath Shauna',
    role: 'teacher',
    leading_teacher_email: 'ahmed.faris@school.com'
  },
  {
    email: 'anbukumaran.murugesan@school.com',
    password: 'teacher123',
    full_name: 'Anbukumaran Murugesan',
    role: 'teacher',
    leading_teacher_email: 'ahmed.faris@school.com'
  },
  {
    email: 'fareetha.yasmeen@school.com',
    password: 'teacher123',
    full_name: 'Fareetha Yasmeen',
    role: 'teacher',
    leading_teacher_email: 'ahmed.faris@school.com'
  },
  {
    email: 'nouman.tholoor@school.com',
    password: 'teacher123',
    full_name: 'Nouman Tholoor',
    role: 'teacher',
    leading_teacher_email: 'ahmed.faris@school.com'
  },
  {
    email: 'soba@school.com',
    password: 'teacher123',
    full_name: 'Soba',
    role: 'teacher',
    leading_teacher_email: 'ahmed.faris@school.com'
  },
  {
    email: 'soni.mathew@school.com',
    password: 'teacher123',
    full_name: 'Soni Mathew',
    role: 'teacher',
    leading_teacher_email: 'ahmed.faris@school.com'
  },
  // Ahmed Shareef (Asyri ufaa)'s Team
  {
    email: 'ahmed.shareef.asyri@school.com',
    password: 'leading123',
    full_name: 'Ahmed Shareef (Asyri ufaa)',
    role: 'leading_teacher',
    leading_teacher_id: null
  },
  {
    email: 'ali.nasir@school.com',
    password: 'teacher123',
    full_name: 'Ali Nasir',
    role: 'teacher',
    leading_teacher_email: 'ahmed.shareef.asyri@school.com'
  },
  {
    email: 'aminath.shiuraa@school.com',
    password: 'teacher123',
    full_name: 'Aminath Shiuraa',
    role: 'teacher',
    leading_teacher_email: 'ahmed.shareef.asyri@school.com'
  },
  {
    email: 'azzam.mohamed@school.com',
    password: 'teacher123',
    full_name: 'Azzam Mohamed',
    role: 'teacher',
    leading_teacher_email: 'ahmed.shareef.asyri@school.com'
  },
  {
    email: 'fathuhulla.shathir@school.com',
    password: 'teacher123',
    full_name: 'Fathuhulla Shathir',
    role: 'teacher',
    leading_teacher_email: 'ahmed.shareef.asyri@school.com'
  },
  {
    email: 'leeza@school.com',
    password: 'teacher123',
    full_name: 'Leeza',
    role: 'teacher',
    leading_teacher_email: 'ahmed.shareef.asyri@school.com'
  },
  {
    email: 'raishaa@school.com',
    password: 'teacher123',
    full_name: 'Raishaa',
    role: 'teacher',
    leading_teacher_email: 'ahmed.shareef.asyri@school.com'
  },
  {
    email: 'samiya@school.com',
    password: 'teacher123',
    full_name: 'Samiya',
    role: 'teacher',
    leading_teacher_email: 'ahmed.shareef.asyri@school.com'
  },
  {
    email: 'zaahir@school.com',
    password: 'teacher123',
    full_name: 'Zaahir',
    role: 'teacher',
    leading_teacher_email: 'ahmed.shareef.asyri@school.com'
  },
  // Ahmed Shareef (Bageecha)'s Team
  {
    email: 'ahmed.shareef.bageecha@school.com',
    password: 'leading123',
    full_name: 'Ahmed Shareef (Bageecha)',
    role: 'leading_teacher',
    leading_teacher_id: null
  },
  {
    email: 'aisath.rifasha@school.com',
    password: 'teacher123',
    full_name: 'Aisath Rifasha',
    role: 'teacher',
    leading_teacher_email: 'ahmed.shareef.bageecha@school.com'
  },
  {
    email: 'safoora@school.com',
    password: 'teacher123',
    full_name: 'Safoora',
    role: 'teacher',
    leading_teacher_email: 'ahmed.shareef.bageecha@school.com'
  },
  {
    email: 'shani.biju@school.com',
    password: 'teacher123',
    full_name: 'Shani Biju',
    role: 'teacher',
    leading_teacher_email: 'ahmed.shareef.bageecha@school.com'
  },
  {
    email: 'sreesh@school.com',
    password: 'teacher123',
    full_name: 'Sreesh',
    role: 'teacher',
    leading_teacher_email: 'ahmed.shareef.bageecha@school.com'
  },
  // Asif Ibrahim's Team
  {
    email: 'asif.ibrahim@school.com',
    password: 'leading123',
    full_name: 'Asif Ibrahim',
    role: 'leading_teacher',
    leading_teacher_id: null
  },
  {
    email: 'mariyam.sanoona@school.com',
    password: 'teacher123',
    full_name: 'Mariyam Sanoona',
    role: 'teacher',
    leading_teacher_email: 'asif.ibrahim@school.com'
  },
  {
    email: 'najudha@school.com',
    password: 'teacher123',
    full_name: 'Najudha',
    role: 'teacher',
    leading_teacher_email: 'asif.ibrahim@school.com'
  },
  {
    email: 'ruyya@school.com',
    password: 'teacher123',
    full_name: 'Ruyya',
    role: 'teacher',
    leading_teacher_email: 'asif.ibrahim@school.com'
  },
  {
    email: 'shadiya@school.com',
    password: 'teacher123',
    full_name: 'Shadiya',
    role: 'teacher',
    leading_teacher_email: 'asif.ibrahim@school.com'
  },
  {
    email: 'sharoona@school.com',
    password: 'teacher123',
    full_name: 'Sharoona',
    role: 'teacher',
    leading_teacher_email: 'asif.ibrahim@school.com'
  },
  {
    email: 'sifzaa@school.com',
    password: 'teacher123',
    full_name: 'Sifzaa',
    role: 'teacher',
    leading_teacher_email: 'asif.ibrahim@school.com'
  }
];

async function createUser(account) {
  try {
    console.log(`Creating user: ${account.email}...`);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        full_name: account.full_name
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`  ✓ User already exists: ${account.email}`);

        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === account.email);

        if (existingUser) {
          return existingUser.id;
        }
      } else {
        throw authError;
      }
    }

    if (authData?.user) {
      console.log(`  ✓ Created auth user: ${account.email}`);
      return authData.user.id;
    }
  } catch (error) {
    console.error(`  ✗ Error creating ${account.email}:`, error.message);
    return null;
  }
}

async function updateProfile(userId, account, leadingTeacherId) {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: account.email,
        full_name: account.full_name,
        role: account.role,
        leading_teacher_id: leadingTeacherId
      });

    if (error) throw error;
    console.log(`  ✓ Updated profile: ${account.email}`);
  } catch (error) {
    console.error(`  ✗ Error updating profile for ${account.email}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting demo account setup...\n');

  const userIds = {};

  console.log('Step 1: Creating principal and leading teachers...\n');
  for (const account of demoAccounts.filter(a => a.role !== 'teacher')) {
    const userId = await createUser(account);
    if (userId) {
      userIds[account.email] = userId;
      await updateProfile(userId, account, null);
    }
    console.log('');
  }

  console.log('\nStep 2: Creating teachers and assigning to leading teachers...\n');
  for (const account of demoAccounts.filter(a => a.role === 'teacher')) {
    const userId = await createUser(account);
    if (userId) {
      userIds[account.email] = userId;
      const leadingTeacherId = userIds[account.leading_teacher_email];
      await updateProfile(userId, account, leadingTeacherId);
    }
    console.log('');
  }

  console.log('\n✅ Demo account setup complete!\n');
  console.log('📋 Account Summary:');
  console.log('   - 1 Principal');
  console.log('   - 4 Leading Teachers');
  console.log('   - 31 Teachers total\n');
  console.log('📖 Login Credentials:');
  console.log('   Principal: principal@school.com / principal123');
  console.log('   Leading Teachers: [email] / leading123');
  console.log('   Teachers: [email] / teacher123\n');
}

main().catch(console.error);
