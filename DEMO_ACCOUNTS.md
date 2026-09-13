# Demo Account Credentials

## Quick Setup

Since Supabase requires proper authentication flow, I've created a setup script to create all demo accounts.

## Demo Credentials

### Super Admin Account
- **Email**: admin@school.com
- **Password**: Admin@123456
- **Name**: Super Admin
- **Role**: Super Administrator
- **Capabilities**: Can reset passwords for all users, view all system users

### Principal Account
- **Email**: principal@school.com
- **Password**: principal123
- **Name**: Dr. Sarah Johnson
- **Role**: Principal

### Leading Teachers (4 accounts)

#### Leading Teacher 1
- **Email**: lt1@school.com
- **Password**: leading123
- **Name**: Mr. David Chen
- **Role**: Leading Teacher

#### Leading Teacher 2
- **Email**: lt2@school.com
- **Password**: leading123
- **Name**: Ms. Emily Rodriguez
- **Role**: Leading Teacher

#### Leading Teacher 3
- **Email**: lt3@school.com
- **Password**: leading123
- **Name**: Mr. James Wilson
- **Role**: Leading Teacher

#### Leading Teacher 4
- **Email**: lt4@school.com
- **Password**: leading123
- **Name**: Mrs. Amira Patel
- **Role**: Leading Teacher

### Teachers (16 accounts - 4 per leading teacher)

#### Teachers under Mr. David Chen (LT1)
1. **Email**: teacher1@school.com | **Password**: teacher123 | **Name**: Ms. Anna Thompson
2. **Email**: teacher2@school.com | **Password**: teacher123 | **Name**: Mr. Robert Lee
3. **Email**: teacher3@school.com | **Password**: teacher123 | **Name**: Ms. Maria Garcia
4. **Email**: teacher4@school.com | **Password**: teacher123 | **Name**: Mr. Ahmed Hassan

#### Teachers under Ms. Emily Rodriguez (LT2)
5. **Email**: teacher5@school.com | **Password**: teacher123 | **Name**: Ms. Jennifer Kim
6. **Email**: teacher6@school.com | **Password**: teacher123 | **Name**: Mr. Michael Brown
7. **Email**: teacher7@school.com | **Password**: teacher123 | **Name**: Ms. Sofia Martinez
8. **Email**: teacher8@school.com | **Password**: teacher123 | **Name**: Mr. Daniel White

#### Teachers under Mr. James Wilson (LT3)
9. **Email**: teacher9@school.com | **Password**: teacher123 | **Name**: Ms. Lisa Anderson
10. **Email**: teacher10@school.com | **Password**: teacher123 | **Name**: Mr. Kevin Taylor
11. **Email**: teacher11@school.com | **Password**: teacher123 | **Name**: Ms. Priya Sharma
12. **Email**: teacher12@school.com | **Password**: teacher123 | **Name**: Mr. Carlos Sanchez

#### Teachers under Mrs. Amira Patel (LT4)
13. **Email**: teacher13@school.com | **Password**: teacher123 | **Name**: Ms. Rachel Green
14. **Email**: teacher14@school.com | **Password**: teacher123 | **Name**: Mr. Thomas Clark
15. **Email**: teacher15@school.com | **Password**: teacher123 | **Name**: Ms. Fatima Ali
16. **Email**: teacher16@school.com | **Password**: teacher123 | **Name**: Mr. John Davis

## Automatic Setup (Recommended)

### Step 1: Get Your Service Role Key

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Find the **service_role** key (under "Project API keys")
5. Click to reveal and copy this key

### Step 2: Add Service Role Key to .env

Open the `.env` file in your project root and replace `your-service-role-key-here` with your actual service role key:

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Run Setup Script

```bash
npm run setup-demo
```

This will automatically create all 21 demo accounts:
- 1 Principal
- 4 Leading Teachers
- 16 Teachers (4 assigned to each leading teacher)

The script will show progress as it creates each account and sets up relationships.

## Manual Setup (Alternative)

If you prefer to set up accounts manually:

1. Sign up for each account through the login page
2. Use the Supabase SQL Editor to update profiles with correct roles and relationships

## Testing the System

### Test as Super Admin
1. Login with: admin@school.com / Admin@123456
2. View all system users (Principals, Leading Teachers, Teachers)
3. Reset any user's password
4. See system-wide statistics

### Test as Principal
1. Login with: principal@school.com / principal123
2. You'll see all 4 leading teacher sections
3. Expand any section to see teachers and their lesson plans
4. Manage leading teachers (add/remove)

### Test as Leading Teacher
1. Login with any LT account (e.g., lt1@school.com / leading123)
2. Set your signature first (use any image URL)
3. You'll see only your assigned teachers
4. Review and approve lesson plans
5. Manage your teachers (add/remove)

### Test as Teacher
1. Login with any teacher account (e.g., teacher1@school.com / teacher123)
2. Create a new lesson plan
3. Submit it for approval
4. Your leading teacher will see it in their dashboard

## Quick Test Flow

1. Login as **teacher1@school.com** → Create and submit a lesson plan
2. Login as **lt1@school.com** → Set signature, then approve the lesson plan
3. Login as **principal@school.com** → View all sections and see the approved plan
