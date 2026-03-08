# Therapy Center Frontend (Mock-Driven)

React + TypeScript frontend with modular architecture and mocked API adapter.

## Features Implemented
- JWT login + refresh workflow (mocked)
- Role-based routing and dynamic sidebar
- Dashboards by role
- Patient enrollment with file upload validation and preview
- Therapist enrollment with availability modeling
- FullCalendar scheduling with drag-and-drop rescheduling
- Double-booking prevention UX via API conflict responses
- Sessions and assessments views
- Billing with payment method tracking and audit list
- React Query integration with optimistic updates on rescheduling
- Toast notifications for all mutations

## Run
```bash
cd frontend
npm install
npm run dev
```

Demo accounts:
- `admin@therapy.local / admin123`
- `reception@therapy.local / reception123`
- `therapist@therapy.local / therapist123`
- `cashier@therapy.local / cashier123`
