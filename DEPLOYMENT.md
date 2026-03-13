# Deployment Guide

This guide will help you deploy the Quiz Platform to Vercel or another hosting platform.

## Prerequisites

- Supabase project (free tier is sufficient for testing)
- Vercel account (for Vercel deployment) OR your preferred hosting
- GitHub repository (recommended for easier deployment)

## Step 1: Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Copy your project credentials:
   - `NEXT_PUBLIC_SUPABASE_URL` - Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon/Public key
   - `SUPABASE_SERVICE_ROLE_KEY` - Service Role key

3. Make note of these values - you'll need them for environment variables

## Step 2: GitHub Setup (Optional but Recommended)

1. Push your project to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Quiz platform"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
   git push -u origin main
   ```

## Step 3: Environment Variables

### Local Development
1. Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   JWT_SECRET=your-random-secret-key-min-32-chars
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run development server:
   ```bash
   pnpm dev
   ```

4. Visit `http://localhost:3000/setup` to initialize database

## Step 4: Deploy to Vercel

### Option A: Via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project settings:
   - Framework: Next.js
   - Build command: `pnpm build`
   - Start command: `pnpm start`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
5. Click Deploy

### Option B: Via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts and add environment variables when asked

## Step 5: Post-Deployment Setup

1. Visit your deployment URL
2. Go to `/setup` to initialize the database
3. Click "Initialize Database" button
4. After initialization, go to `/admin/login` to create your first admin account

## Step 6: Verify Installation

### Student Portal
- Visit `https://yoursite.com/student`
- Create test account (you won't have any quizzes yet)

### Admin Portal
- Visit `https://yoursite.com/admin/login`
- Login with your admin account
- Create a test quiz

### Test Full Flow
1. Create a quiz with 2-3 questions
2. Log in as student and take the quiz
3. Verify anti-cheating detection (try switching tabs)
4. Go back to admin portal and grade submission

## Troubleshooting Deployment

### Database Connection Error
- Check all environment variables are correctly set
- Verify Supabase project is active
- Check service role key is correct (not just anon key)

### CORS Errors
- Ensure `NEXT_PUBLIC_SUPABASE_URL` is correct
- Vercel will allow your domain automatically

### Authentication Issues
- Check `JWT_SECRET` is set and consistent
- Clear browser cookies and localStorage
- Try incognito/private window

### Missing Dependencies
- Make sure `pnpm install` completed successfully
- Check package.json has all required dependencies

## Database Backup

### Export Data
```bash
pg_dump -h db.XXXXX.supabase.co -U postgres -d postgres > backup.sql
```

### Import Data
```bash
psql -h db.XXXXX.supabase.co -U postgres -d postgres < backup.sql
```

## Scaling Considerations

The application is designed to scale well:
- **Database**: Supabase handles scaling automatically
- **API**: Next.js serverless functions scale infinitely
- **Storage**: RLS policies prevent unauthorized access
- **Concurrent Users**: Can handle thousands of concurrent students

For high-volume quizzes:
1. Consider adding indexes (already in schema)
2. Monitor Supabase quota
3. Enable Supabase backup feature

## Production Checklist

- [ ] Change `JWT_SECRET` to a secure random string
- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Set up custom domain (Vercel settings)
- [ ] Enable Supabase backups
- [ ] Configure Supabase backup frequency
- [ ] Set up monitoring/logging
- [ ] Review RLS policies for security
- [ ] Test admin and student flows thoroughly
- [ ] Create admin documentation for teachers
- [ ] Test export/grading workflow

## Custom Domain

To use a custom domain with Vercel:

1. In Vercel project settings, go to Domains
2. Add your domain
3. Follow DNS configuration instructions
4. Update Supabase allowed redirect URLs if needed

## SSL Certificate

Vercel automatically provisions SSL certificates. No action needed.

## Support

For issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Check Supabase database connection
4. Review environment variables
5. Check GitHub issues or create new one

## Advanced Configuration

### Database Pooling
If experiencing connection issues, enable Supabase connection pooling:
1. In Supabase console, go to Database settings
2. Enable pgBouncer
3. Use pooling connection string in production

### Rate Limiting
Consider adding rate limiting for API endpoints:
- Quiz submission: 1 per student per quiz
- Login: 5 attempts per minute
- Grading: No rate limit for admins

### Content Security Policy
For production, consider adding CSP headers:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';
```

## Monitoring

### Recommended Tools
- Vercel Analytics (built-in)
- Sentry (error tracking)
- LogRocket (session replay)

### Key Metrics to Monitor
- Login failures
- Quiz submission errors
- Database query performance
- API response times
