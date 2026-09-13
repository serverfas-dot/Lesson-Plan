# Netlify Deployment Guide

This guide will help you deploy your Lesson Plan Management System to Netlify.

## Is Your Data Safe?

**YES!** Your data is completely safe when deploying to Netlify because:

- **Netlify only hosts the frontend** (HTML, CSS, JavaScript files)
- **All data is stored in Supabase**, not on Netlify servers
- **Authentication is handled by Supabase**, not Netlify
- **Database and edge functions remain on Supabase**
- Netlify simply serves your React application to users' browsers

Think of it this way:
- **Netlify** = Your website's storefront (the interface users see)
- **Supabase** = Your secure backend (where all data lives)

## Prerequisites

Before deploying, make sure you have:
1. A Netlify account (free tier works fine) - Sign up at [netlify.com](https://netlify.com)
2. Your Supabase project URL and anon key (from your `.env` file)
3. This project code ready to deploy

## Deployment Methods

### Method 1: Drag and Drop (Easiest)

1. **Build your project locally:**
   ```bash
   npm run build
   ```
   This creates a `dist` folder with your production-ready files.

2. **Go to Netlify:**
   - Log in to [app.netlify.com](https://app.netlify.com)
   - Look for the drag-and-drop area that says "Want to deploy a new site without connecting to Git? Drag and drop your site output folder here"

3. **Drag the `dist` folder** from your project into the Netlify drop zone

4. **Configure Environment Variables:**
   - After deployment, click on "Site settings"
   - Go to "Environment variables" in the left sidebar
   - Click "Add a variable" and add these two variables:
     - Key: `VITE_SUPABASE_URL`
       Value: (copy from your .env file)
     - Key: `VITE_SUPABASE_ANON_KEY`
       Value: (copy from your .env file)

5. **Trigger a Redeploy:**
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Deploy site"
   - This ensures the environment variables are included

### Method 2: Connect to Git (Recommended for Updates)

1. **Push your code to GitHub/GitLab/Bitbucket:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_REPOSITORY_URL
   git push -u origin main
   ```

2. **Connect to Netlify:**
   - Log in to [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Choose your Git provider
   - Select your repository
   - Netlify will auto-detect the build settings from `netlify.toml`

3. **Add Environment Variables:**
   - Before deploying, click "Show advanced"
   - Click "New variable" and add:
     - Key: `VITE_SUPABASE_URL`
       Value: (copy from your .env file)
     - Key: `VITE_SUPABASE_ANON_KEY`
       Value: (copy from your .env file)

4. **Deploy:**
   - Click "Deploy site"
   - Netlify will automatically build and deploy your app
   - Future pushes to your repository will automatically trigger new deployments

### Method 3: Netlify CLI

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

3. **Initialize and Deploy:**
   ```bash
   netlify init
   netlify deploy --prod
   ```

4. **Set Environment Variables via CLI:**
   ```bash
   netlify env:set VITE_SUPABASE_URL "your-supabase-url"
   netlify env:set VITE_SUPABASE_ANON_KEY "your-supabase-anon-key"
   ```

## After Deployment

### 1. Test Your Deployed Site

Visit your Netlify URL (e.g., `https://your-site-name.netlify.app`) and:
- Try logging in with your existing accounts
- Create a lesson plan
- Test all features to ensure they work

### 2. Custom Domain (Optional)

To use your own domain:
1. Go to "Domain settings" in your Netlify site
2. Click "Add custom domain"
3. Follow the instructions to configure DNS

### 3. Enable HTTPS

Netlify automatically provides free HTTPS certificates. Just make sure:
- Go to "Domain settings" → "HTTPS"
- Verify that "SSL/TLS certificate" is enabled

## Important Security Notes

1. **Never commit your `.env` file** - It's already in `.gitignore`, which is good!

2. **Your Supabase anon key is safe to use in the frontend** - It's designed for public use and is protected by Row Level Security (RLS) policies in your database.

3. **Keep your service role key private** - Never add `SUPABASE_SERVICE_ROLE_KEY` to Netlify environment variables. It's only needed for local setup scripts.

4. **Row Level Security is your protection** - Make sure all your Supabase tables have proper RLS policies enabled.

## Troubleshooting

### Issue: Site deploys but shows blank page

**Solution:** Check browser console for errors. Usually means environment variables are missing.
1. Verify environment variables are set in Netlify
2. Make sure variable names start with `VITE_`
3. Redeploy after adding variables

### Issue: Authentication not working

**Solution:** Add your Netlify URL to Supabase allowed URLs:
1. Go to Supabase Dashboard
2. Navigate to Authentication → URL Configuration
3. Add your Netlify URL to "Site URL" and "Redirect URLs"

### Issue: 404 errors on page refresh

**Solution:** This should be handled by the `netlify.toml` redirect rule. If it persists:
1. Check that `netlify.toml` exists in your project root
2. Verify the redirect rule is present
3. Redeploy

### Issue: Old version showing after deployment

**Solution:** Clear your browser cache or try incognito mode. Also:
1. Check Netlify deploy logs to ensure build succeeded
2. Verify the correct branch is being deployed

## Performance Optimization

After deployment, consider:

1. **Enable Asset Optimization:**
   - Go to "Site settings" → "Build & deploy" → "Post processing"
   - Enable "Bundle CSS" and "Minify JS and CSS"

2. **Add Netlify Analytics (Optional):**
   - Go to "Analytics" tab
   - Enable Netlify Analytics to track site visitors

3. **Monitor Build Times:**
   - Check "Deploys" tab regularly
   - Typical build time should be 1-3 minutes

## Cost

- **Netlify Free Tier includes:**
  - 100 GB bandwidth per month
  - Automatic HTTPS
  - Continuous deployment
  - This is more than enough for most school applications

- **Supabase Free Tier includes:**
  - 500 MB database space
  - 1 GB file storage
  - 50,000 monthly active users
  - Also sufficient for most schools

## Need Help?

If you encounter any issues:
1. Check Netlify deploy logs for build errors
2. Check browser console for runtime errors
3. Verify all environment variables are set correctly
4. Ensure your Supabase project is active and accessible

## Updating Your Deployed Site

**If using Git method:**
- Just push changes to your repository
- Netlify will automatically rebuild and deploy

**If using drag-and-drop:**
- Run `npm run build` locally
- Drag the new `dist` folder to Netlify
- Or switch to Git method for easier updates

---

Your lesson plan management system is now live and accessible to all your teachers and administrators!
