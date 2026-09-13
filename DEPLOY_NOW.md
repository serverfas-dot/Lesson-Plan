# 🚀 Deploy to Netlify - Simple Steps

Your project is ready to deploy! Follow these easy steps:

---

## **Method 1: Drag & Drop (Fastest - 2 minutes)**

### Step 1: Get Your Build Files
The `dist` folder in your project contains the ready-to-deploy files.

### Step 2: Deploy to Netlify
1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Sign up or log in (it's free!)
3. Drag the **`dist`** folder from your project directly onto the Netlify dashboard
4. Netlify will upload and deploy automatically

### Step 3: Configure Environment Variables (CRITICAL!)
1. After deployment, click on your new site
2. Go to **Site configuration** → **Environment variables**
3. Click **Add a variable** and add these two:

**Variable 1:**
- Key: `VITE_SUPABASE_URL`
- Value: `https://uqkhucaajholzyezhtxt.supabase.co`

**Variable 2:**
- Key: `VITE_SUPABASE_ANON_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxa2h1Y2FhamhvbHp5ZXpodHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5OTkzMzYsImV4cCI6MjA4MDU3NTMzNn0.McjIMEroH66SgeDEy3PZTRwf3DDitGW62T-9XI0xE1E`

4. Click **Save**
5. Go to **Deploys** tab → **Trigger deploy** → **Deploy site**

### Step 4: Done! 🎉
Your site is live! Click the URL to access your Lesson Plan System.

---

## **Method 2: GitHub + Netlify (For Automatic Updates)**

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit - Lesson Plan System"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Step 2: Connect Netlify to GitHub
1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub** and authorize
4. Select your repository
5. Netlify auto-detects settings from `netlify.toml` - just click **Deploy**

### Step 3: Add Environment Variables
Same as Method 1, Step 3 above.

### Step 4: Done! 🎉
Every time you push to GitHub, Netlify will auto-deploy!

---

## **What's Configured For You**

✅ Build command: `npm run build`
✅ Publish directory: `dist`
✅ Node version: 18
✅ SPA routing: All routes redirect to index.html
✅ Latest build with royal light blue background

---

## **Important Notes**

⚠️ **Environment variables are REQUIRED** - The app won't work without them
⚠️ **After adding environment variables**, you MUST trigger a new deploy
⚠️ **Your data is in Supabase** - It's safe and will work with any deployment

---

## **Your Netlify URL**

After deployment, you'll get a URL like:
- `https://your-site-name.netlify.app`

You can customize this in **Site configuration** → **Site details** → **Change site name**

---

## **Troubleshooting**

**Can't log in?**
- Check that environment variables are set correctly
- Make sure you triggered a redeploy after adding them

**Build failed?**
- Check the deploy logs in Netlify
- Ensure all dependencies are in `package.json`

**Site shows blank page?**
- Open browser console (F12)
- Look for errors related to missing environment variables

---

## **Need Help?**

All your configuration is in:
- `netlify.toml` - Netlify configuration
- `.env` - Local environment variables (reference)
- `package.json` - Build scripts

**Your site is ready to go live! 🚀**
