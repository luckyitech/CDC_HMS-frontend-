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
