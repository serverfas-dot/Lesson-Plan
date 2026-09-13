# Lesson Plan Management System - Setup Guide

## Overview

This is a comprehensive lesson plan management system with role-based dashboards for Teachers, Leading Teachers, and Principal.

## System Architecture

### User Roles

1. **Teachers**: Create and submit lesson plans to their assigned leading teacher
2. **Leading Teachers**: Review and approve lesson plans from their assigned teachers (4 leading teachers, each managing 14+ teachers)
3. **Principal**: View all sections, all leading teachers, and all lesson plans across the entire system

### Key Features

- **Lesson Plan Form**: Matches the exact format from your PDF template with all fields
- **Approval Workflow**: Leading teachers can approve lesson plans and their signature automatically appears on the approved plan
- **Organized by Leading Teacher**: Each leading teacher has a separate section with their teachers
- **Signature Management**: Leading teachers can set/update their signature which appears on approved plans
- **Status Tracking**: Draft, Submitted, Approved, Rejected statuses with visual indicators

## Database Schema

The system uses Supabase with the following tables:

1. **profiles**: User information including role, assigned leading teacher, and signature
2. **lesson_plans**: Complete lesson plan data matching your PDF template
3. **approvals**: Records of approvals with leading teacher signature

## Initial Setup

### Step 1: Create Sample Users

You need to create users directly in the Supabase database. Here's how:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the following SQL to create sample users:

```sql
-- Note: First, users need to sign up through the auth system
-- After they sign up, you can update their profiles

-- Example: Creating a Principal
-- First, have them sign up at your app with email and password
-- Then update their profile:
UPDATE profiles
SET role = 'principal', full_name = 'Principal Name'
WHERE email = 'principal@school.com';

-- Example: Creating Leading Teachers
UPDATE profiles
SET role = 'leading_teacher', full_name = 'Leading Teacher 1'
WHERE email = 'lt1@school.com';

-- Example: Creating Teachers assigned to a leading teacher
UPDATE profiles
SET role = 'teacher',
    full_name = 'Teacher Name',
    leading_teacher_id = (SELECT id FROM profiles WHERE email = 'lt1@school.com')
WHERE email = 'teacher1@school.com';
```

### Step 2: Quick Setup Script

Here's a complete setup script to create the organizational structure:

```sql
-- After users have signed up through the auth system, run this:

-- Set up 4 Leading Teachers
UPDATE profiles SET role = 'leading_teacher', full_name = 'Leading Teacher 1' WHERE email = 'lt1@school.com';
UPDATE profiles SET role = 'leading_teacher', full_name = 'Leading Teacher 2' WHERE email = 'lt2@school.com';
UPDATE profiles SET role = 'leading_teacher', full_name = 'Leading Teacher 3' WHERE email = 'lt3@school.com';
UPDATE profiles SET role = 'leading_teacher', full_name = 'Leading Teacher 4' WHERE email = 'lt4@school.com';

-- Set up Principal
UPDATE profiles SET role = 'principal', full_name = 'Principal Name' WHERE email = 'principal@school.com';

-- Assign teachers to Leading Teacher 1
UPDATE profiles SET role = 'teacher', leading_teacher_id = (SELECT id FROM profiles WHERE email = 'lt1@school.com')
WHERE email IN (
  'teacher1@school.com',
  'teacher2@school.com',
  'teacher3@school.com',
  -- Add up to 14+ teachers per leading teacher
);
```

## Using the System

### For Teachers

1. Sign in with your teacher credentials
2. Click "Create New Lesson Plan"
3. Fill in all required fields matching the PDF template:
   - Week, Date, Duration, Lesson Number
   - Class, Subject, Topic
   - Strand and Sub-strand
   - Learning objectives and outcomes
   - Instructional procedures (Introduction, Body, Evaluation, Conclusion)
   - Reflection and Pedagogy checkboxes
4. Save as Draft or Submit for Approval
5. View status of all your lesson plans

### For Leading Teachers

1. Sign in with your leading teacher credentials
2. **First Time**: Set your signature by clicking "Set Signature" in the header
   - Enter a URL to your signature image
   - This signature will automatically appear on all approved lesson plans
3. View pending lesson plans from your assigned teachers
4. Click on a lesson plan to review it
5. Approve or Reject the lesson plan
6. When approving, your name and signature are automatically added to the lesson plan

### For Principal

1. Sign in with your principal credentials
2. View overview statistics:
   - Total leading teachers
   - Total teachers
   - Pending and approved lesson plans
3. Click on any leading teacher section to expand and see:
   - All teachers under that leading teacher
   - All lesson plans in that section
4. Click on any lesson plan to view details
5. See approval status and signatures on approved plans

## Signature Setup for Leading Teachers

Leading teachers must set up their signature before they can approve lesson plans:

1. Go to your dashboard
2. Click "Set Signature" button in the header
3. Enter a URL to your signature image (can be any publicly accessible image URL)
4. The signature will automatically appear on all lesson plans you approve

## Features Highlight

### Automatic Signature Display

When a leading teacher approves a lesson plan:
- Their full name is recorded
- Their signature image is automatically attached
- The approval timestamp is saved
- All of this appears in a special "Approved By" section on the lesson plan

### Organized Sections

- Each leading teacher has their own separate section/bar
- Teachers submit lesson plans to their assigned leading teacher's section
- Principal can see all sections and expand/collapse them

### Complete Lesson Plan Template

The form includes all fields from your PDF:
- Basic information (Week, Date, Duration, etc.)
- Curriculum details (Strand, Sub-strand, Outcomes)
- Learning objectives
- Instructional procedures with time allocations
- Teacher and student activities for each phase
- Reflection checkboxes
- Pedagogy and assessment checkboxes

## Technical Details

- Built with React, TypeScript, and Tailwind CSS
- Supabase for database and authentication
- Row Level Security (RLS) ensures users only see what they should
- Responsive design works on all devices

## Support

If you encounter any issues:
1. Check that users are properly assigned to leading teachers
2. Verify leading teachers have set their signatures
3. Ensure proper roles are assigned in the database
4. Check that RLS policies are enabled
