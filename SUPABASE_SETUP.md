# 🚀 Setting Up Supabase PostgreSQL Database

## Current Setup
Your project is currently using a **local PostgreSQL database** stored on your device at:
- Host: `localhost:5432`
- Database: `kafka_backend_db`
- User: `admin`

## Switching to Supabase

Supabase provides a managed PostgreSQL database in the cloud. Here's how to switch:

---

## Step 1: Get Your Supabase Connection String

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account)
2. Create a new project (or select an existing one)
3. Go to **Project Settings** → **Database**
4. Scroll down to **Connection string** section
5. Select **URI** tab
6. Copy the connection string - it will look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
   Or:
   ```
   postgres://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

**Important:** Replace `[YOUR-PASSWORD]` with your actual database password (set when creating the project).

---

## Step 2: Update Your .env File

Update your `.env` file with the Supabase connection string:

```env
# Server Configuration
PORT=3000

# Supabase Database Configuration
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres

# IMPORTANT: Supabase requires SSL
PGSSLMODE=require

# JWT Secret
JWT_SECRET=your_jwt_secret_here

# Kafka Configuration (optional)
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=my-platform
```

**Key changes:**
- Replace `DATABASE_URL` with your Supabase connection string
- Add `PGSSLMODE=require` (Supabase requires SSL connections)

---

## Step 3: Run Migrations on Supabase

After updating your `.env` file, run the migrations to create the tables in Supabase:

```bash
npm run migrate
```

This will create:
- `admin_content` table (for content management)
- `users` table (for authentication and user data)
- `statistics_items` table (for statistics)

---

## Step 4: Seed Initial Users

Seed the admin users:

```bash
npm run seed
```

This creates:
- `admin@trustedvalley.com` / `Test123456$`
- `superadmin@trustedvalley.com` / `Test123456$`

---

## Step 5: Test the Connection

Start your server:

```bash
npm run dev
```

The server should connect to Supabase successfully. You can test by:
- Making a health check: `curl http://localhost:3000/`
- Registering a user: `POST /api/auth/register`
- Logging in: `POST /api/auth/login`

---

## Differences: Local vs Supabase

| Feature | Local PostgreSQL | Supabase |
|---------|------------------|----------|
| **Location** | Your device | Cloud (Supabase servers) |
| **Access** | Only from your machine | Accessible from anywhere |
| **Backup** | Manual | Automatic backups |
| **SSL** | Optional | Required |
| **Connection** | `localhost:5432` | `db.xxxxx.supabase.co:5432` |
| **Scaling** | Limited by your machine | Auto-scaling |
| **Cost** | Free (local) | Free tier available |

---

## Troubleshooting

### SSL Connection Error
If you see SSL errors, make sure `PGSSLMODE=require` is set in your `.env` file.

### Connection Timeout
- Check your Supabase project is active (not paused)
- Verify the connection string is correct
- Check your firewall/network allows outbound connections

### Migration Errors
- Ensure the database password in the connection string is correct
- Check that your Supabase project has the necessary permissions
- Try running migrations one at a time if needed

### Password in Connection String
The connection string includes your password. Make sure:
- Never commit `.env` to version control
- Use environment variables in production
- Rotate passwords regularly

---

## Security Best Practices

1. **Never commit `.env` to Git** - It's already in `.gitignore`
2. **Use strong passwords** for your Supabase database
3. **Enable Row Level Security (RLS)** in Supabase if needed
4. **Use connection pooling** (Supabase provides this automatically)
5. **Rotate secrets regularly**

---

## Switching Back to Local

If you want to switch back to local PostgreSQL:

```env
DATABASE_URL=postgres://admin@localhost:5432/kafka_backend_db
# Remove or comment out PGSSLMODE for local
# PGSSLMODE=require
```

---

## Next Steps

After setting up Supabase:
1. ✅ Update `.env` with Supabase connection string
2. ✅ Run migrations: `npm run migrate`
3. ✅ Seed users: `npm run seed`
4. ✅ Test the API endpoints
5. ✅ Consider setting up Supabase Row Level Security (RLS) for additional security

---

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- Check your Supabase project dashboard for connection details

