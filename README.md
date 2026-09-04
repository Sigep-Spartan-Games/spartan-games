# Spartan Games

<div align="center">
  <h3>SigEp Competition Tracking & Gamification</h3>
  <p>Track activities, compete on leaderboards, and manage your chapter's fitness journey.</p>
</div>

---

## 📖 Project Overview

**Spartan Games** is a web application designed to gamify fraternity activities. Members can log activities (running, lifting, sports, etc.) to earn points for their teams. The application features request-time leaderboards, weekly competition cycles, and administrative tools for managing the season.

### Key Features

- **Activity Tracking**: Users can submit proof of activities to earn points based on predefined scoring rules.
- **Leaderboards**: View request-time team rankings, weekly progress, and season totals.
- **Team Management**: Organize members into teams for group competition.
- **Admin Dashboard**:
  - Review/edit/delete submissions and approve/reject member edit requests.
  - Manage scoring rules and activity types.
  - Finalize weekly scores and reset cycles.
  - View historical data and export reports.
- **Authentication**: Secure login via Supabase Auth.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router; current lockfile resolves 16.1.4)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage, RLS, functions, triggers)
- **Deployment**: [Vercel](https://vercel.com/)
- **Email**: [Nodemailer](https://nodemailer.com/) (for notifications)

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) v20.9.0 or higher
- [npm](https://www.npmjs.com/) (`package-lock.json` is authoritative)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Sigep-Spartan-Games/spartan-games.git
   cd spartan-games
   ```

2. **Install dependencies:**

   ```bash
   npm ci
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory. The complete, feature-specific catalog is in [`ai-docs/ENVIRONMENT_VARIABLES.md`](./ai-docs/ENVIRONMENT_VARIABLES.md).

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
- `supabase/`: Partial database migrations; the baseline schema and critical function/trigger definitions are currently missing.

## 🤖 Developer and AI Documentation

Start with [`ai-docs/README.md`](./ai-docs/README.md). It provides a task-based reading map, identifies which database behavior is not versioned in this repository, and links the feature-change and verification checklists.

## 🚢 Deployment

The easiest way to deploy allows for seamless integration with Vercel.

1. Push your code to a GitHub repository.
2. Import the project into Vercel.
3. Add the **Environment Variables** listed above in the Vercel project settings.
4. Deploy!

## 🔐 Admin Access

To access the admin dashboard (`/admin`), a user must have `is_admin = true` in the `profiles` table. Keep page/action guards and Row Level Security (RLS) policies aligned; see the authorization documentation for the current exceptions.

## 📜 License

This project is for internal use by the fraternity chapter.
