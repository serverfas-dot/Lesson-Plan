# Super Admin Setup Guide

## Creating a Super Admin Account

To create a super admin account, you need to manually update the database since super admins have the highest level of access.

### Step 1: Create a User Account

First, create a regular user account through Supabase Authentication:

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add User"
4. Enter the email and password for your super admin
5. Click "Create User"

### Step 2: Update User Role to Super Admin

After creating the user, you need to update their role in the `profiles` table:

1. Go to the SQL Editor in Supabase
2. Run the following SQL command (replace `your-super-admin-email@example.com` with the actual email):

```sql
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'your-super-admin-email@example.com';
```

### Step 3: Login

Now you can login with the super admin credentials and access the Super Admin Dashboard.

## Super Admin Capabilities

The super admin can:

- View all users in the system (Principals, Leading Teachers, Teachers)
- Reset passwords for any user
- See statistics for the entire system
- Manage the system at the highest level

## Password Reset Process

When a super admin resets a user's password:

1. The user receives a password reset email
2. They click the link in the email
3. They're redirected to set a new password
4. Their password is securely updated in the system

## Security Notes

- Super admin accounts should be limited to only essential personnel
- Always use strong passwords for super admin accounts
- Regularly audit super admin access
- Consider enabling two-factor authentication for super admin accounts in Supabase
