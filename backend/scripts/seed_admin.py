#!/usr/bin/env python3
import argparse
import os
import sys
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Insert or update an admin user directly in DB.")
    parser.add_argument("--email", required=True, help="Admin email")
    parser.add_argument("--password", required=True, help="Admin password")
    parser.add_argument("--name", default="System Admin", help="Admin display name")
    parser.add_argument(
        "--role",
        default="admin",
        choices=["super_admin", "admin", "staff"],
        help="User role",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    project_root = Path(__file__).resolve().parent.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

    import django  # noqa: PLC0415

    django.setup()

    from apps.user_management.infrastructure.models import User  # noqa: PLC0415

    user, created = User.objects.get_or_create(
        email=args.email,
        defaults={
            "name": args.name,
            "role": args.role,
            "is_active": True,
            "is_superuser": args.role == "super_admin",
        },
    )

    user.name = args.name
    user.role = args.role
    user.is_active = True
    user.is_superuser = args.role == "super_admin"
    user.set_password(args.password)
    user.save()

    action = "created" if created else "updated"
    print(f"User {action}: email={user.email}, role={user.role}, id={user.id}")


if __name__ == "__main__":
    main()
