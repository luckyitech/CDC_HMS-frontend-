# CDC Hospital Management System — Frontend

A multi-role Hospital Management System built for the **C Diabetes Centre (CDC)**. It provides dedicated portals for doctors, staff, patients, lab technicians, and administrators, all backed by a shared REST API.

---

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Vite | 7 | Build tool & dev server |
| React Router | v7 | Client-side routing |
| Tailwind CSS | 3 | Utility-first styling |
| Axios | 1 | HTTP client |
| Recharts | 3 | Charts & data visualisation |
| react-hot-toast | 2 | Toast notifications |
| lucide-react | latest | Icon library |
| react-to-print | 3 | Print support |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Backend API running (see `back_end/cdc-hms-api`)

### Installation

```bash
cd front_end/cdc-hms
npm install
```

### Environment Variables

Create a `.env` file in `cdc-hms/`:

```env
VITE_API_URL=http://localhost:3000/api
```

Change the URL to your production API when deploying.

### Development

```bash
npm run dev
```

App runs at `http://localhost:5173` by default.

### Production Build

```bash
npm run build
npm run preview   # preview the built output locally
```

---

## Project Structure

```
src/
├── App.jsx                   # Root component — all routes defined here
├── main.jsx                  # Entry point
│
├── layouts/
│   ├── MainLayout.jsx        # Sidebar + header shell used by all portals
│   └── LoginLayout.jsx       # Minimal layout for login pages
│
├── pages/
│   ├── auth/                 # Login & password pages (public)
│   ├── doctor/               # Doctor portal pages
│   ├── staff/                # Staff portal pages
│   ├── patient/              # Patient portal pages
│   ├── lab/                  # Lab technician portal pages
│   ├── admin/                # Admin portal pages
│   └── shared/               # Pages accessible by multiple roles
│
├── components/
│   ├── shared/               # Reusable UI components (Button, Card, Input, Modal…)
│   ├── doctor/               # Doctor-specific components (forms, modals, charts)
│   └── lab/                  # Lab-specific components
│
├── contexts/                 # React Context — global state per domain
├── services/                 # API service layer (one file per domain)
├── utils/                    # Helper utilities
└── data/
    └── mockData.js           # Static fallback/mock data
```

---

## Portals & Routes

The application is split into five role-based portals. Every portal is wrapped in a `ProtectedRoute` that checks the logged-in user's role and redirects to `/` on mismatch.

### Authentication (public)

| Route | Page |
|---|---|
| `/` | Portal selector / main entry |
| `/login/staff` | Staff login |
| `/login/doctor` | Doctor login |
| `/login/lab` | Lab technician login |
| `/login/patient` | Patient login |
| `/login/admin` | Admin login |
| `/forgot-password` | Forgot password |

---

### Staff Portal `/staff/*`

| Route | Page |
|---|---|
| `/staff/dashboard` | Dashboard overview |
| `/staff/patients` | Patient search |
| `/staff/queue` | Queue management |
| `/staff/triage` | Triage entry |
| `/staff/create-patient` | Register new patient |
| `/staff/patient-profile/:uhid` | Patient profile view |
| `/staff/medical-documents` | Medical documents |
| `/staff/change-password` | Change password |

---

### Doctor Portal `/doctor/*`

| Route | Page |
|---|---|
| `/doctor/dashboard` | Dashboard & queue overview |
| `/doctor/patients` | My patients list |
| `/doctor/patient-profile/:uhid` | Full patient profile |
| `/doctor/consultation/:uhid` | Consultation workflow |
| `/doctor/initial-assessment` | Initial assessment forms |
| `/doctor/prescriptions` | Prescription management |
| `/doctor/physical-exam` | Physical examination |
| `/doctor/glycemic-charts` | Blood sugar charts |
| `/doctor/reports` | Reports |
| `/doctor/medical-documents` | Medical documents |
| `/doctor/change-password` | Change password |

---

### Patient Portal `/patient/*`

| Route | Page |
|---|---|
| `/patient/dashboard` | Personal dashboard |
| `/patient/log-blood-sugar` | Log blood sugar reading |
| `/patient/trends` | View glycemic trends |
| `/patient/profile` | My profile |
| `/patient/prescriptions` | My prescriptions |
| `/patient/book-appointment` | Book an appointment |
| `/patient/upload-results` | Upload test results |
| `/patient/change-password` | Change password |

---

### Lab Portal `/lab/*`

| Route | Page |
|---|---|
| `/lab/dashboard` | Lab dashboard |
| `/lab/pending-tests` | Pending test requests |
| `/lab/enter-results` | Enter test results |
| `/lab/test-history` | Test history |
| `/lab/generate-reports` | Generate lab reports |
| `/lab/critical-alerts` | Critical value alerts |
| `/lab/change-password` | Change password |

---

### Admin Portal `/admin/*`

| Route | Page |
|---|---|
| `/admin/dashboard` | System dashboard |
| `/admin/create-doctor` | Create doctor account |
| `/admin/create-staff` | Create staff account |
| `/admin/create-lab` | Create lab tech account |
| `/admin/create-patient` | Create patient record |
| `/admin/manage-users` | Manage all users |
| `/admin/reports` | System reports |
| `/admin/change-password` | Change password |

---

## State Management

Global state is managed via 10 React Contexts, all provided at the app root:

| Context | Manages |
|---|---|
| `UserContext` | Logged-in user session |
| `PatientContext` | Patient records |
| `QueueContext` | Queue entries + real-time SSE updates |
| `PrescriptionContext` | Prescriptions |
| `InitialAssessmentContext` | Initial assessments |
| `PhysicalExamContext` | Physical examination data |
| `ConsultationNotesContext` | Consultation notes |
| `TreatmentPlanContext` | Treatment plans |
| `LabContext` | Lab test requests & results |
| `AppointmentContext` | Appointments |

---

## API Service Layer

All backend communication goes through `src/services/`. Each file maps to one domain:

```
services/
├── api.js                    # Axios instance + auth interceptors
├── authService.js            # Login, logout, password management
├── patientService.js         # Patient CRUD
├── queueService.js           # Queue operations
├── prescriptionService.js    # Prescriptions
├── assessmentService.js      # Initial assessments
├── physicalExamService.js    # Physical examinations
├── consultationNotesService.js
├── treatmentPlanService.js
├── labService.js             # Lab tests & results
├── appointmentService.js
└── documentService.js        # Medical document upload & retrieval
```

`api.js` handles:
- Attaching the JWT Bearer token to every request from `sessionStorage`
- Silently cancelling requests made before login (no 401 console noise)
- Auto-redirecting to `/` on 401 (expired/invalid token)

---

## Authentication & Security

- JWT tokens are stored in **`sessionStorage`** (per-tab, not shared across tabs)
- `ProtectedRoute` enforces role-based access — wrong role redirects to `/`
- Unauthenticated API calls are cancelled client-side before reaching the server
- Session ends when the browser tab is closed

---

## Real-Time Updates

The queue uses **Server-Sent Events (SSE)** for live updates across browser tabs.

- `QueueContext` opens an `EventSource` connection to `GET /api/sse`
- The backend broadcasts a `queue_updated` event after every queue mutation (add / update / remove / call next)
- `QueueContext` re-fetches the queue on each event — staff and doctors see changes instantly without refreshing

---

## Default Test Credentials

These accounts are seeded in the development database:

| Role | Email | Password |
|---|---|---|
| Doctor | ahmed.hassan@cdc.com | password123 |
| Staff | staff@cdc.com | password123 |
| Patient | patient@cdc.com | password123 |
| Lab Tech | lab@cdc.com | password123 |
| Admin | admin@cdc.com | password123 |

---

## Available Scripts

```bash
npm run dev       # Start dev server with HMR
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

---

## Production Deployment

This guide documents how the CDC HMS frontend is deployed on the Host Africa VPS (Ubuntu 24.04, IP `102.68.87.18`).

### Server Requirements

- Node.js 20+ (for building on the server)
- Nginx (to serve the static files)

### 1. Clone the Repository on the Server

```bash
cd /var/www/cdc
git clone https://github.com/luckyitech/CDC_HMS-frontend-.git frontend-repo
cd frontend-repo/cdc-hms
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create the Production Environment File

Create a `.env.production` file inside `cdc-hms/`. This file is read automatically by Vite when building for production:

```bash
echo "VITE_API_URL=https://api.cdiabetescentre.com/api" > .env.production
```

> **Important:** The URL must end with `/api`. The frontend appends paths like `/auth/login` and `/users/doctors` directly to this base URL. Without `/api`, all API calls will return 404.
>
> This file only needs to be created once. It stays on the server permanently and is not tracked by git (it is listed in `.gitignore`).

### 4. Build for Production

```bash
npm run build
```

This reads `.env.production` automatically and generates a `dist/` folder with the compiled static files.

### 5. Copy to Nginx Web Root

```bash
mkdir -p /var/www/cdc/web
cp -r dist/* /var/www/cdc/web/
```

### 6. Configure Nginx

```bash
nano /etc/nginx/sites-available/cdiabetescentre
```

Add the frontend server block:

```nginx
server {
    listen 80;
    server_name cdiabetescentre.com www.cdiabetescentre.com;
    root /var/www/cdc/web;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

> The `try_files ... /index.html` rule is essential for React Router — it ensures all routes (e.g. `/doctor/dashboard`) serve `index.html` and let the frontend handle routing.

Enable and reload:

```bash
ln -s /etc/nginx/sites-available/cdiabetescentre /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 7. DNS

On your domain registrar (one.com), add A records:

| Type | Name | Value |
|------|------|-------|
| A | @ | 102.68.87.18 |
| A | www | 102.68.87.18 |

### Updating the Frontend

Whenever you push new code to GitHub, deploy it on the server by running:

```bash
cd /var/www/cdc/frontend-repo
git pull origin main
cd cdc-hms
npm run build
rm -rf /var/www/cdc/web/*
cp -r dist/* /var/www/cdc/web/
```

> No need to recreate `.env.production` — it stays on the server permanently. Just pull, build, and copy.
>
> **Important:** Always run `git pull` from the repo root (`frontend-repo/`), not from inside `cdc-hms/`. Always clear the web directory with `rm -rf` before copying to prevent stale chunk files from causing MIME errors.
