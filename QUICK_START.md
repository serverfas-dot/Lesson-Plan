# Quick Start Guide

## Get Your System Running in 3 Steps

### 1. Get Service Role Key from Supabase

- Visit: https://supabase.com/dashboard
- Select your project
- Go to **Settings** → **API**
- Copy the **service_role** key (click to reveal)

### 2. Add Key to .env File

Edit `.env` file and replace the placeholder:

```
SUPABASE_SERVICE_ROLE_KEY=paste-your-key-here
```

### 3. Run Setup

```bash
npm install
npm run setup-demo
```

Done! The system will create all demo accounts automatically.

## Login Credentials

### Principal
- Email: `principal@school.com`
- Password: `principal123`

### Leading Teachers
- `lt1@school.com` / `leading123` - Mr. David Chen
- `lt2@school.com` / `leading123` - Ms. Emily Rodriguez
- `lt3@school.com` / `leading123` - Mr. James Wilson
- `lt4@school.com` / `leading123` - Mrs. Amira Patel

### Teachers
- `teacher1@school.com` through `teacher16@school.com`
- All passwords: `teacher123`
- 4 teachers per leading teacher

## Test Flow

1. **Login as teacher1@school.com**
   - Create a lesson plan
   - Fill all fields
   - Submit for approval

2. **Login as lt1@school.com**
   - Set your signature (any image URL works)
   - View pending lesson plan
   - Approve it (signature auto-appears)

3. **Login as principal@school.com**
   - See all 4 leading teacher sections
   - View all lesson plans
   - See approved plans with signatures

## Features

- **Teachers**: Create and submit lesson plans
- **Leading Teachers**: Review and approve with automatic signature
- **Principal**: View all sections and all plans
- **Organized**: Each leading teacher has their own section with assigned teachers
- **Secure**: Row-level security ensures proper access control

## Need Help?

See `DEMO_ACCOUNTS.md` for complete credential list
See `SETUP_GUIDE.md` for detailed system information
