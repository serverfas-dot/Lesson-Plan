# Netlify Deployment Checklist - Update Existing Site

Use this checklist to update your existing Netlify deployment without losing data.

## ✅ Your Data is Safe!

Your data is stored in Supabase (cloud database), not in your code. When you redeploy:
- All users remain intact
- All lesson plans are preserved
- All signatures are safe
- All history is maintained

## Step 1: Download & Extract

- [ ] Click Download button in the interface
- [ ] Extract ZIP file to your computer
- [ ] Verify all files are present (package.json, src/, supabase/, etc.)

## Step 2: Choose Deployment Method

### Option A: Update via Netlify Dashboard (Easiest)

- [ ] Go to [app.netlify.com](https://app.netlify.com)
- [ ] Click on your existing site
- [ ] Go to Deploys tab
- [ ] Drag the extracted project folder to the deploy area
- [ ] Wait for build to complete

### Option B: Update via Git (Recommended)

- [ ] Go to your Git repository (GitHub/GitLab)
- [ ] Replace all files with new project files
- [ ] Commit: `git add . && git commit -m "Update with PDF fixes"`
- [ ] Push: `git push`
- [ ] Netlify auto-deploys

## Step 3: Configure Environment Variables

**CRITICAL:** Set these in Netlify (if not already set):

- [ ] Go to Site configuration → Environment variables
- [ ] Add or verify `VITE_SUPABASE_URL`:
  ```
  https://uqkhucaajholzyezhtxt.supabase.co
  ```
- [ ] Add or verify `VITE_SUPABASE_ANON_KEY`:
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxa2h1Y2FhamhvbHp5ZXpodHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5OTkzMzYsImV4cCI6MjA4MDU3NTMzNn0.McjIMEroH66SgeDEy3PZTRwf3DDitGW62T-9XI0xE1E
  ```
- [ ] Save changes
- [ ] If you changed variables, trigger a new deploy

## Step 4: Verify Deployment

**Basic Checks:**
- [ ] Site loads without errors
- [ ] Can log in with existing credentials
- [ ] Dashboard displays correctly
- [ ] All existing lesson plans are visible

**Test the New Fixes:**
- [ ] Open a lesson plan
- [ ] Click PDF download button
- [ ] ✓ No black screen appears
- [ ] ✓ PDF downloads successfully
- [ ] ✓ Signatures appear in PDF
- [ ] ✓ School logo appears in PDF
- [ ] ✓ Multi-page PDFs work correctly

## What's Fixed in This Update 🎉

✅ **PDF Download Error Fixed**
- No more "tainted canvas" error
- Images and signatures now export properly
- Black screen issue resolved

✅ **Better PDF Quality**
- Signatures appear correctly
- School logo displays
- Multi-page support works

## Troubleshooting

**Problem: "Failed to fetch" errors**
- Solution: Check environment variables in Netlify
- Trigger a redeploy after adding variables

**Problem: Can't log in**
- Solution: Your credentials haven't changed
- Check browser console for errors
- Verify Supabase URL is correct

**Problem: PDF still fails**
- Solution: Clear browser cache
- Try incognito/private mode
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

**Problem: Data is missing**
- Solution: Verify you're using the same Supabase URL
- Your data is in Supabase, not affected by code updates

## Important Reminders

🔒 **Your Data**: Stored in Supabase cloud, completely safe

🔑 **Environment Variables**: Must be set in Netlify for site to work

⚡ **Build Process**: Netlify runs `npm run build` automatically

🌐 **Same Database**: Using same Supabase URL = All data preserved

---

**✨ Ready to Deploy!** Follow the steps above to update your site.

For detailed instructions, see `NETLIFY_DEPLOYMENT_GUIDE.md`
