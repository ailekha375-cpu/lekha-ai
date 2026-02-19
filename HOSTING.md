# Hosting Your Lekha App with a GoDaddy Domain

Your app is a **Next.js** app, so the easiest option is **Vercel** (the company behind Next.js). This guide walks you through hosting your app on your custom GoDaddy domain.

---

## 🚀 Option 1: Vercel (Recommended - Easiest)

Vercel is the recommended hosting platform for Next.js apps. It offers:
- ✅ Free hosting for personal projects
- ✅ Automatic SSL certificates
- ✅ Automatic deployments from GitHub
- ✅ Built-in CDN and performance optimizations
- ✅ Zero configuration needed

---

### Step 1: Prepare Your Code for GitHub

#### 1.1 Initialize Git Repository (if not already done)

Open your terminal in the project folder and run:

```bash
# Check if git is already initialized
git status

# If not initialized, run these commands:
git init
git add .
git commit -m "Initial commit"
git branch -M main
```

#### 1.2 Create GitHub Repository

1. Go to [GitHub](https://github.com/new) and sign in
2. Click **"New repository"** (green button)
3. Fill in:
   - **Repository name**: `invite-rsvp-app` (or your preferred name)
   - **Description**: (optional)
   - **Visibility**: Choose **Private** (recommended) or **Public**
   - **DO NOT** initialize with README, .gitignore, or license (you already have these)
4. Click **"Create repository"**

#### 1.3 Push Code to GitHub

GitHub will show you commands. Use these (replace `YOUR_USERNAME` with your GitHub username):

```bash
git remote add origin https://github.com/YOUR_USERNAME/invite-rsvp-app.git
git push -u origin main
```

**Note**: If you get an error about authentication, you may need to set up a Personal Access Token. See [GitHub docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) for details.

---

### Step 2: Deploy on Vercel

#### 2.1 Sign Up / Sign In to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** or **"Log In"**
3. **Important**: Choose **"Continue with GitHub"** - this connects your GitHub account and makes deployments automatic

#### 2.2 Import Your Project

1. After logging in, you'll see your dashboard
2. Click **"Add New..."** → **"Project"**
3. You'll see a list of your GitHub repositories
4. Find and click **"Import"** next to `invite-rsvp-app` (or your repo name)

#### 2.3 Configure Project Settings

Vercel will auto-detect Next.js, but verify these settings:

- **Framework Preset**: Should show "Next.js" ✅
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (auto-filled)
- **Output Directory**: `.next` (auto-filled)
- **Install Command**: `npm install` (auto-filled)

**Click "Deploy"** - Vercel will start building your app!

#### 2.4 Wait for Deployment

- The build process takes 1-3 minutes
- You'll see build logs in real-time
- When complete, you'll get a URL like: `invite-rsvp-app.vercel.app`
- **Test this URL** to make sure your app works!

---

### Step 3: Configure Firebase for Production

#### 3.1 Add Your Domain to Firebase Authorized Domains

Your app uses Firebase Authentication. You need to authorize your production domain:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **lekha-5d006**
3. Click the **⚙️ gear icon** → **"Project settings"**
4. Scroll down to **"Authorized domains"** section
5. Click **"Add domain"** and add:
   - Your Vercel URL: `invite-rsvp-app.vercel.app`
   - Your custom domain: `yourdomain.com` (replace with your actual domain)
   - If using www: `www.yourdomain.com`
6. Click **"Add"** for each domain

**Note**: Your Firebase config is currently hardcoded in `src/app/lib/firebase.ts`. This works fine, but for better security, consider moving it to environment variables in the future.

---

### Step 4: Connect Your GoDaddy Domain to Vercel

#### 4.1 Add Domain in Vercel

1. In Vercel dashboard, open your project
2. Go to **"Settings"** tab (top navigation)
3. Click **"Domains"** in the left sidebar
4. In the **"Add Domain"** field, enter:
   - Your root domain: `yourdomain.com` (replace with your actual domain)
   - Click **"Add"**
5. If you want `www` subdomain, add: `www.yourdomain.com` and click **"Add"**

#### 4.2 Get DNS Configuration from Vercel

After adding your domain, Vercel will show you DNS records to add:

- For **root domain** (`yourdomain.com`): You'll see an **A record** with an IP address (e.g., `76.76.21.21`)
- For **www** (`www.yourdomain.com`): You'll see a **CNAME record** pointing to `cname.vercel-dns.com`

**📋 Copy these values** - you'll need them for GoDaddy!

---

### Step 5: Configure DNS at GoDaddy

#### 5.1 Access DNS Management

1. Log in to [GoDaddy](https://www.godaddy.com)
2. Click **"My Products"** (or your account menu)
3. Find your domain and click **"DNS"** or **"Manage DNS"**

#### 5.2 Add DNS Records

You'll see a table of existing DNS records. Add or edit records as follows:

**For Root Domain (`yourdomain.com`):**

1. Look for an existing **A record** with Name `@` or blank
2. If it exists, click **"Edit"** (pencil icon)
3. If not, click **"Add"** → **"A"**
4. Configure:
   - **Type**: A
   - **Name**: `@` (or leave blank - depends on GoDaddy interface)
   - **Value**: The IP address Vercel gave you (e.g., `76.76.21.21`)
   - **TTL**: `600` (or default)
5. Click **"Save"**

**For WWW Subdomain (`www.yourdomain.com`):**

1. Look for an existing **CNAME record** with Name `www`
2. If it exists, click **"Edit"**
3. If not, click **"Add"** → **"CNAME"**
4. Configure:
   - **Type**: CNAME
   - **Name**: `www`
   - **Value**: `cname.vercel-dns.com` (exactly as Vercel shows)
   - **TTL**: `600` (or default)
5. Click **"Save"**

**Important Notes:**
- ⚠️ **Remove or update** any conflicting A or CNAME records for `@` or `www`
- ⚠️ **Don't delete** other records (like MX for email, TXT for verification, etc.)
- ⚠️ Use the **exact values** Vercel provides (they may differ from examples)

#### 5.3 Verify DNS Propagation

DNS changes can take anywhere from a few minutes to 48 hours to propagate:

1. Go back to Vercel → **Settings** → **Domains**
2. Wait for the domain status to change from **"Pending"** to **"Valid"**
3. Vercel will automatically issue an SSL certificate (HTTPS) when DNS is valid
4. You can check DNS propagation using tools like:
   - [whatsmydns.net](https://www.whatsmydns.net)
   - [dnschecker.org](https://dnschecker.org)

---

### Step 6: Test Your Live Site

Once DNS is valid in Vercel:

1. Visit `https://yourdomain.com` (or `https://www.yourdomain.com`)
2. You should see your app!
3. Test Firebase authentication to ensure it works
4. Check that all features work correctly

**🎉 Congratulations! Your app is now live on your custom domain!**

---

## 🔄 Future Deployments

After the initial setup, deployments are automatic:

- **Every time you push to GitHub** → Vercel automatically deploys
- **Preview deployments** are created for pull requests
- **Production deployments** happen when you push to `main` branch

---

## 🛠️ Option 2: Netlify (Alternative)

If you prefer Netlify:

### Step 1: Sign Up and Connect GitHub

1. Go to [netlify.com](https://www.netlify.com) and sign up
2. Connect your GitHub account

### Step 2: Deploy Site

1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **"Deploy with GitHub"**
3. Select your repository: `invite-rsvp-app`
4. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next` (but Netlify usually auto-detects Next.js)
   - **Framework**: Next.js (should auto-detect)

### Step 3: Add Environment Variables

1. Go to **Site settings** → **Environment variables**
2. Add any Firebase variables if you move them to env vars

### Step 4: Configure Domain

1. Go to **Domain management** → **Add custom domain**
2. Enter your domain: `yourdomain.com`
3. Netlify will show DNS instructions:
   - **A record** for root domain (IP address)
   - **CNAME** for www subdomain
4. Follow the same GoDaddy DNS steps as above (Step 5)

### Step 5: Update Firebase

Add your Netlify domain to Firebase Authorized domains (same as Step 3.1 above)

---

## 🔐 Firebase Configuration Notes

### Current Setup

Your Firebase config is currently hardcoded in `src/app/lib/firebase.ts`. This works, but for better security practices, consider:

1. Moving config to environment variables
2. Using `.env.local` for local development
3. Setting environment variables in Vercel/Netlify for production

### Required Firebase Steps

✅ **Already Done**: Firebase config is in your code  
✅ **Required**: Add production domains to Firebase Authorized domains  
✅ **Optional**: Move config to environment variables for better security

---

## ✅ Deployment Checklist

Use this checklist to ensure everything is set up:

### Pre-Deployment
- [ ] Code is committed to Git
- [ ] Repository is pushed to GitHub
- [ ] App builds successfully locally (`npm run build`)

### Vercel Setup
- [ ] Signed up/logged in to Vercel with GitHub
- [ ] Imported GitHub repository
- [ ] Initial deployment successful
- [ ] Tested Vercel URL (e.g., `your-app.vercel.app`)

### Domain Configuration
- [ ] Added domain in Vercel Settings → Domains
- [ ] Copied DNS records from Vercel
- [ ] Updated GoDaddy DNS records (A and/or CNAME)
- [ ] Waited for DNS propagation
- [ ] Domain shows as "Valid" in Vercel
- [ ] SSL certificate is active (HTTPS works)

### Firebase Configuration
- [ ] Added Vercel domain to Firebase Authorized domains
- [ ] Added custom domain to Firebase Authorized domains
- [ ] Added www subdomain (if using) to Firebase Authorized domains
- [ ] Tested Firebase authentication on live site

### Final Testing
- [ ] Site loads at `https://yourdomain.com`
- [ ] Site loads at `https://www.yourdomain.com` (if configured)
- [ ] All pages work correctly
- [ ] Firebase authentication works
- [ ] No console errors in browser
- [ ] Mobile responsiveness works

---

## 🐛 Troubleshooting

### Domain Shows "Pending" in Vercel

**Possible causes:**
- DNS records not added correctly in GoDaddy
- DNS propagation still in progress (can take up to 48 hours)
- Conflicting DNS records

**Solutions:**
1. Double-check DNS records match Vercel's instructions exactly
2. Use [whatsmydns.net](https://www.whatsmydns.net) to check if DNS has propagated
3. Remove any conflicting A/CNAME records
4. Wait a few more hours for propagation

### Site Shows "Not Found" or Error

**Possible causes:**
- Build failed in Vercel
- Environment variables missing
- Firebase domain not authorized

**Solutions:**
1. Check Vercel deployment logs for errors
2. Verify Firebase domains are authorized
3. Test the Vercel URL (not custom domain) to isolate DNS vs. app issues

### Firebase Authentication Not Working

**Possible causes:**
- Domain not added to Firebase Authorized domains
- Firebase config issues

**Solutions:**
1. Verify domain is in Firebase Console → Project Settings → Authorized domains
2. Check browser console for Firebase errors
3. Ensure Firebase config values are correct

### SSL Certificate Issues

**Solutions:**
- Vercel automatically issues SSL certificates when DNS is valid
- If SSL shows as pending, wait for DNS to fully propagate
- Clear browser cache and try again

---

## 📞 Need Help?

If you encounter issues:

1. **Check Vercel deployment logs**: Project → Deployments → Click on deployment → View logs
2. **Check GoDaddy DNS**: Ensure records match Vercel's instructions exactly
3. **Test DNS propagation**: Use [whatsmydns.net](https://www.whatsmydns.net)
4. **Verify Firebase**: Check Authorized domains in Firebase Console

---

## 🎯 Quick Reference: GoDaddy DNS Records

When Vercel gives you DNS instructions, they'll look something like this:

| Type  | Name | Value                 | TTL  | Purpose                    |
|-------|------|-----------------------|------|----------------------------|
| A     | @    | `76.76.21.21`         | 600  | Points root domain to Vercel |
| CNAME | www  | `cname.vercel-dns.com`| 600  | Points www subdomain to Vercel |

**⚠️ Important**: Use the **exact values** Vercel provides for your project. The IP address may differ!

---

**Ready to deploy? Start with Step 1 and work through each section. Good luck! 🚀**
