# Deploy to Netlify - Simple Guide

Follow these steps to deploy your Lesson Plan Management System to Netlify.

## Step 1: Download the Project

You have two options:

**Option A: Using the Download Button (if available in your interface)**
- Click the Download button to get a ZIP file

**Option B: Using Terminal (from your local machine)**
```bash
# Navigate to where you want to save the project
cd ~/Desktop

# Copy the project (if running locally)
# Or download it from your development environment
```

## Step 2: Prepare for Upload

1. Make sure the project has been built successfully (this is already done)
2. The project is ready to deploy as-is

## Step 3: Deploy to Netlify

### Method 1: Drag & Drop (Easiest)

1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Log in or create a free account
3. Click **"Add new site"** → **"Deploy manually"**
4. Drag and drop your entire project folder into the Netlify window
5. Netlify will automatically:
   - Install dependencies
   - Run `npm run build`
   - Deploy your site

### Method 2: Connect to Git Repository (Best for updates)

1. Push your project to GitHub, GitLab, or Bitbucket
2. Go to [https://app.netlify.com](https://app.netlify.com)
3. Click **"Add new site"** → **"Import an existing project"**
4. Connect your Git provider
5. Select your repository
6. Netlify will auto-detect the settings from `netlify.toml`
7. Click **"Deploy site"**

## Step 4: Configure Environment Variables

**CRITICAL STEP - Don't skip this!**

After your site is deployed:

1. In Netlify dashboard, click on your site
2. Go to **"Site configuration"** → **"Environment variables"**
3. Click **"Add a variable"** and add these TWO variables:

```
Key: VITE_SUPABASE_URL
Value: https://uqkhucaajholzyezhtxt.supabase.co
```

```
Key: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxa2h1Y2FhamhvbHp5ZXpodHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5OTkzMzYsImV4cCI6MjA4MDU3NTMzNn0.McjIMEroH66SgeDEy3PZTRwf3DDitGW62T-9XI0xE1E
```

4. Click **"Save"**
5. Go back to **"Deploys"** and click **"Trigger deploy"** → **"Deploy site"**

## Step 5: Access Your Site

1. Once deployment completes, you'll get a URL like: `https://random-name-123456.netlify.app`
2. Visit that URL
3. Log in with your credentials
4. Your site is now live!

## Optional: Custom Domain

If you want a custom domain (like `lessonplans.yourschool.com`):

1. In Netlify, go to **"Domain management"**
2. Click **"Add custom domain"**
3. Follow the instructions to configure your DNS

## Build Settings (Auto-configured)

These settings are already configured in `netlify.toml`:
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** 18

## Troubleshooting

### Build Fails
- Check the deploy logs in Netlify
- Make sure you added the environment variables
- Trigger a new deploy after adding variables

### Can't Log In
- Verify both environment variables are set correctly
- Check there are no extra spaces in the values
- Clear your browser cache and try again

### Site Shows Blank Page
- Open browser developer console (F12)
- Check for errors related to Supabase connection
- Verify environment variables are correct

## Your Site is Ready!

Your Lesson Plan Management System is now deployed and accessible to:
- Teachers
- Leading Teachers
- Principal
- Super Admin

All data is stored securely in Supabase and will persist across deployments.

---

**Need to update your site later?**
- Just repeat Step 3 with the new project files
- Or push changes to Git (if using Method 2)
- Environment variables are preserved automatically
