# Setup Instructions

## 1. Environment Variables

Create a `.env` file in the `urbansimple` directory with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_URL=postgresql://user:password@host:port/database
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Where to find these:**
1. Go to your Supabase project dashboard
2. Settings → API → Copy the URL and anon key
3. Settings → API → Copy the service_role key (keep this secret!)
4. Settings → Database → Connection string → Copy the URI

## 2. Database Setup

Run Prisma migrations and generate the client:

```bash
npx prisma migrate dev
npx prisma generate
```

## 3. Seed the Database

Run the seed script to create your company, branch, and admin user:

```bash
npm run db:seed
```

This will:
- Create "Urban Simple LLC" company
- Create "Austin" branch
- Create your admin user (alex@urbansimple.net)
- **If SUPABASE_SERVICE_ROLE_KEY is set**: Automatically create the Supabase auth user and show you the password
- **If not set**: You'll need to manually create the auth user in Supabase dashboard

## 4. Login Credentials

After running the seed script:

**Email:** `alex@urbansimple.net`

**Password:** 
- If you have `SUPABASE_SERVICE_ROLE_KEY` set: The seed script will print a random password
- If not: You'll need to create the user manually in Supabase Auth dashboard

## 5. Manual User Creation (if needed)

If the seed script couldn't create the auth user:

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. Email: `alex@urbansimple.net`
4. Set a password
5. Copy the User ID
6. Update your database:
   ```sql
   UPDATE users SET auth_id = '<user_id_from_supabase>' WHERE email = 'alex@urbansimple.net';
   ```
   Or use Prisma Studio: `npx prisma studio`

## 6. Start the Dev Server

```bash
npm run dev
```

Then visit: `http://localhost:3000/login` or `http://localhost:3000/app/login`


