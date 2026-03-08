# Backend (Django + DRF)

This backend is separated from frontend and currently implements **User Management** with:

- Clean Architecture layering (`domain`, `application`, `infrastructure`, `presentation`)
- Unit of Work pattern (`DjangoUnitOfWork`)
- PostgreSQL configuration
- Custom user model with roles: `super_admin`, `admin`, `staff`
- JWT access/refresh authentication with token middleware

## Structure

```text
backend/
  config/
  apps/
    user_management/
      domain/
      application/
      infrastructure/
      presentation/
      migrations/
  tests/
```

## Setup

1. Create and activate virtualenv
2. Install deps

```bash
cd backend
pip install -r requirements.txt
```

3. Configure environment

```bash
cp .env.example .env
```

4. Run migrations

```bash
python manage.py migrate
```

5. Create super admin

```bash
python manage.py createsuperuser
```

6. Run server

```bash
python manage.py runserver
```

## Docker

Run from repository root:

```bash
docker compose up --build
```

- Frontend: `http://localhost:5174`
- Backend API from host: `http://localhost:8010/api/v1`
- Backend API inside Docker network: `http://backend:8000/api/v1`

## API

Base: `/api/v1`

- `POST /auth/login/`
- `POST /auth/refresh/`
- `GET /auth/me/`
- `GET /users/`
- `POST /users/`
- `GET /users/{id}/`
- `PUT /users/{id}/`
- `DELETE /users/{id}/`

Permission policy:
- `super_admin`: manage all users
- `admin`: manage non-super_admin users
- `staff`: no user-management access
