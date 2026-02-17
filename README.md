# Spartan Games

<div align="center">
  <h3>Inter-Fraternity Competition Tracking & Gamification</h3>
  <p>Track activities, compete on leaderboards, and manage your chapter's fitness journey.</p>
</div>

---

## 📖 Project Overview

**Spartan Games** is a web application designed to gamify fraternity activities. Members can log activities (running, lifting, sports, etc.) to earn points for themselves and their teams. The application features real-time leaderboards, weekly competition cycles, and comprehensive administrative tools for managing the season.

### Key Features

- **Activity Tracking**: Users can submit proof of activities to earn points based on predefined scoring rules.
- **Real-time Leaderboards**: View individual and team rankings that update instantly.
- **Team Management**: Organize members into teams for group competition.
- **Admin Dashboard**:
  - Review and approve/reject submissions.
  - Manage scoring rules and activity types.
  - Finalize weekly scores and reset cycles.
  - View historical data and export reports.
- **Authentication**: Secure login via Supabase Auth.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage, Realtime)
- **Deployment**: [Vercel](https://vercel.com/)
- **Email**: [Nodemailer](https://nodemailer.com/) (for notifications)

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/spartan-games.git
   cd spartan-games
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add the following variables.

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

   # App Configuration
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   # Email Configuration (SMTP) - Optional for local dev unless testing emails
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   SMTP_FROM=sigep.spartangames@gmail.com

   # Cron / Admin Secrets
   CRON_SECRET=your_secret_token_for_cron_jobs
   ```

4. **Run the Development Server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Project Structure

- `app/`: Next.js App Router pages and layouts.
  - `admin/`: Admin dashboard routes (protected).
  - `submit/`: Activity submission page.
  - `api/`: API routes and cron jobs.
- `components/`: Reusable UI components (buttons, cards, inputs).
- `lib/`: Utility functions, Supabase client setup, and types.
- `supabase/`: Database migrations and types.

## 🚢 Deployment

The easiest way to deploy allows for seamless integration with Vercel.

1. Push your code to a GitHub repository.
2. Import the project into Vercel.
3. Add the **Environment Variables** listed above in the Vercel project settings.
4. Deploy!

## 🔐 Admin Access

To access the admin dashboard (`/admin`), a user must have the appropriate role or permissions set in the `users` table in Supabase. Ensure your Row Level Security (RLS) policies are correctly configured to protect these routes.

## 📜 License

This project is for internal use by the fraternity chapter.
