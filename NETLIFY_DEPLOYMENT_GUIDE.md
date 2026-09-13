# Netlify Deployment Guide - Update Existing Site

This guide will help you update your existing Netlify deployment with all the latest changes while preserving all your data.

## Important: Your Data is Safe

Your data is stored in Supabase (cloud database), not in your code. When you redeploy to Netlify, **all your data will remain intact** - users, lesson plans, signatures, everything.

## Step 1: Download Your Project

Click the **Download** button in the interface to download the complete project as a ZIP file.

## Step 2: Extract the Project

1. Extract the downloaded ZIP file to a folder on your computer
2. You should see all project files including `package.json`, `src/`, `supabase/`, etc.

## Step 3: Deploy to Netlify (Two Options)

### Option A: Update via Netlify Dashboard (Easiest)

1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Log in to your account
3. Click on your existing site
4. Go to **Deploys** tab
5. Drag and drop the extracted project folder into the deploy area
6. Netlify will automatically build and deploy

### Option B: Deploy via Git (Recommended for future updates)

1. Go to your existing Git repository (GitHub, GitLab, etc.)
2. Replace all files with the new project files
3. Commit and push:
   ```bash
   git add .
   git commit -m "Update lesson plan system with latest fixes"
   git push
   ```
4. Netlify will automatically detect the changes and redeploy

## Step 4: Configure Environment Variables

**CRITICAL:** You must set these environment variables in Netlify:

1. In your Netlify site dashboard, go to **Site configuration** → **Environment variables**
2. Add these variables:

```
VITE_SUPABASE_URL=https://uqkhucaajholzyezhtxt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxa2h1Y2FhamhvbHp5ZXpodHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5OTkzMzYsImV4cCI6MjA4MDU3NTMzNn0.McjIMEroH66SgeDEy3PZTRwf3DDitGW62T-9XI0xE1E
```

3. Click **Save**
4. Trigger a new deploy to apply the environment variables

## Step 5: Verify Deployment

After deployment completes:

1. Visit your Netlify site URL
2. Log in with your existing credentials
3. Verify all data is visible
4. Test the PDF download (the main fix in this update)

## What's New in This Update

- **Fixed PDF Download**: Resolved "tainted canvas" error
- **Images in PDF**: Signatures and logos now appear correctly in PDFs
- **Multi-page PDFs**: Long lesson plans properly split across pages
- **Performance improvements**: Better image handling

## Troubleshooting

### If you see "Failed to fetch" errors:
- Check that environment variables are set correctly in Netlify
- Make sure you triggered a redeploy after adding environment variables

### If you can't log in:
- Your login credentials haven't changed
- All user accounts are preserved in Supabase
- Check browser console for errors

### If data is missing:
- Data is stored in Supabase, not in your code
- As long as you use the same `VITE_SUPABASE_URL`, all data will be there
- Check that the URL matches your original deployment

## Need Help?

If you encounter any issues:
1. Check the Netlify deploy logs for build errors
2. Check browser console for runtime errors
3. Verify environment variables are set correctly
4. Ensure you're using the same Supabase URL as before

---

**Remember:** Your Supabase database URL (`https://uqkhucaajholzyezhtxt.supabase.co`) is the key to your data. As long as you connect to the same database, all your data will be preserved.
