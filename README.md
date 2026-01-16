# Raptor Vending Installation Portal

A React-based installation progress tracking application for property managers to monitor Smart Fridge + Smart Cooker infrastructure installations.

**Live URL:** https://portal.raptor-vending.com

## Overview

This portal allows property managers to track the progress of their Raptor Vending equipment installations through an 8-phase timeline.

## Features

- **Public Project Pages** - Shareable progress pages for property managers
- **Property Manager Portal** - Multi-property dashboard for PMs with multiple locations
- **Admin Dashboard** - Full control over projects, phases, tasks, and equipment
- **Preview Mode** - Internal preview of all projects for Raptor staff
- **Automated Email Reminders** - Weekly reminder emails for incomplete tasks
- **Delivery Notifications** - Automated emails when equipment ships
- **Speed Test Warnings** - Alerts when network speeds are below 10Mbps
- **QR Code Sharing** - "Send to Phone" feature for mobile access

## Tech Stack

- **Frontend:** React (Create React App)
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Email:** Mailgun
- **SMS:** HighLevel API (A2P validated)
- **Storage:** Supabase Storage (for documents and images)

## Installation Timeline Phases

1. **Site Assessment & Planning** - Site survey, measurements, cellular signal verification, speed tests
2. **Contract Signature** - Agreement execution and documentation
3. **Employee Preference Survey** - Snack and meal customization survey distribution
4. **Electrical & Networking Preparation** - Infrastructure requirements and property coordination
5. **Building Access & Coordination** - COI documentation, building access requirements
6. **Equipment Ordering & Delivery** - Enclosure selection, equipment ordering, delivery tracking
7. **System Installation & Integration** - Equipment installation and setup
8. **Testing, Stocking & Launch** - Final testing, initial stocking, go-live

## Database Schema

### Core Tables

- **property_managers** - PM contact info (name, email, company)
- **properties** - Buildings/properties linked to PMs
- **locations** - Specific locations within properties (floor, room)
- **projects** - Installation projects linked to locations
- **phases** - Timeline phases for each project
- **tasks** - Individual tasks within phases
- **equipment** - Equipment items for each project
- **global_documents** - Shared documents across all projects
- **email_templates** - Configurable email templates with CC lists

### Key Project Fields

- `public_token` - Unique token for public access URL
- `survey_token` - Trackable survey link token
- `email_reminders_enabled` - Toggle for automated reminders
- `reminder_email` - Override email for reminders (optional)

## Task Types

Tasks use label prefixes to determine their behavior and UI:

| Prefix | Description | UI Behavior |
|--------|-------------|-------------|
| `[PM]` | Property manager task | Checkbox, PM can complete |
| `[PM-TEXT]` | PM task with text input | COI address form fields |
| `[PM-DATE]` | PM task with date picker | Date selection for scheduling |
| `[ADMIN-DATE]` | Admin-only date task | Date picker in admin only |
| `[ADMIN-SPEED]` | Speed test results | Upload/download speed inputs with warning if <10Mbps |
| `[ADMIN-ENCLOSURE]` | Enclosure selection | Type (custom/wrap) and color selection |
| `[ADMIN-EQUIPMENT]` | Equipment quantities | Quantity inputs for equipment |
| `[ADMIN-DELIVERY]` | Delivery tracking | Multiple deliveries with carrier, tracking, date |
| `[ADMIN-DOC]` | Document upload | File upload when task is completed |

## API Endpoints (Vercel Serverless Functions)

### `/api/send-reminders`
Sends weekly email reminders to PMs with incomplete tasks.
- Triggered by Vercel Cron or manual POST
- Respects `email_reminders_enabled` flag
- 24-hour cooldown between reminders per project

### `/api/send-delivery-notification`
Sends email notification when equipment ships.
- Triggered automatically when delivery info is saved
- Includes tracking number, carrier, and expected date

### `/api/send-sms`
Sends SMS via HighLevel API.
- Used for "Send to Phone" feature
- Requires A2P validated phone number

## Key Features

### Public Project Page (`/project/:token`)
- Progress timeline with expandable phases
- Task completion status
- Equipment list
- Speed test results with warnings
- Enclosure type display with "what's this?" modal
- Delivery tracking information
- Document downloads

### Property Manager Portal (`/pm/:email`)
- Dashboard for PMs with multiple properties
- Task completion for PM-assigned tasks
- COI address entry
- Survey link sharing
- Mobile-optimized with sticky header/footer

### Admin Dashboard (`/admin`)
- Project management (create, edit, delete)
- Phase and task management
- Equipment tracking
- Document uploads
- Email template configuration
- Activity logging
- Preview mode for all projects

### Preview Page (`/preview`)
- Internal preview of all projects
- Property selector sidebar
- "Send to Phone" QR code feature
- Mobile-responsive design

## Environment Variables

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_ADMIN_PASSWORD=your-admin-password

# Vercel serverless functions
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=reminders.raptor-vending.com
HIGHLEVEL_API_KEY=your-highlevel-key
HIGHLEVEL_LOCATION_ID=your-location-id
CRON_SECRET=your-cron-secret
PORTAL_URL=https://portal.raptor-vending.com
```

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Deployment

The app is deployed to Vercel with automatic deployments on push to `main`.

```bash
# Deploy to Vercel
vercel --prod
```

### Vercel Cron Configuration

Email reminders are scheduled via `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/send-reminders",
    "schedule": "0 14 * * 1,3,5"
  }]
}
```

This runs reminders at 9 AM CT on Monday, Wednesday, and Friday.

## Project Structure

```
raptor-portal/
├── api/                    # Vercel serverless functions
│   ├── send-reminders.js
│   ├── send-delivery-notification.js
│   └── send-sms.js
├── public/
│   ├── logo-light.png      # White logo (dark backgrounds)
│   ├── logo-dark.png       # Dark logo (light backgrounds)
│   └── index.html
├── src/
│   ├── App.js              # Main app with all page components
│   ├── Admin.js            # Admin dashboard component
│   ├── supabaseClient.js   # Database client and queries
│   ├── index.css           # All styles
│   └── index.js            # Entry point
├── vercel.json             # Vercel config and cron jobs
└── package.json
```

## Brand Colors

- **Primary Orange:** #FF580F / #FF6B00
- **Primary Black:** #202020
- **Success Green:** #4CAF50
- **Warning Red:** #C62828
- **Background Light:** #f5f5f5

## URLs

| Page | URL | Description |
|------|-----|-------------|
| Production | https://portal.raptor-vending.com | Main site |
| Public Project | `/project/{token}` | Single project view for sharing |
| PM Portal | `/pm/{email}` | Property manager dashboard (all their projects) |
| Preview | `/preview` | Internal preview of all projects (Raptor staff) |
| Admin | `/admin` | Admin dashboard |
| Survey | `/survey/{token}` | Trackable survey redirect |

### Property Manager Portal

Property managers can access their personalized dashboard at:
```
https://portal.raptor-vending.com/pm/{their-email}
```

Example: `https://portal.raptor-vending.com/pm/john@propertymanager.com`

This shows all projects associated with properties managed by that email address, with:
- Progress overview for each location
- Ability to complete PM-assigned tasks
- COI address entry forms
- Survey link sharing
- Mobile-optimized interface with sticky header/footer

---

**Raptor Vending** - Hot, Gourmet Food for Modern Workplaces
