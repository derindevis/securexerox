import sys
import os
import argparse

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash

def create_operator(email: str, password: str, name: str):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email.lower()).first()
        if existing:
            print(f"Error: User with email '{email}' already exists.")
            sys.exit(1)
        
        user = User(
            email=email.lower().strip(),
            password_hash=get_password_hash(password),
            name=name.strip(),
            role="shop",
            is_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Successfully created print operator account: {user.email} (ID: {user.id})")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a Print Operator (Shop Admin) account.")
    parser.add_argument("--email", required=True, help="Operator Email Address")
    parser.add_argument("--password", required=True, help="Operator Password")
    parser.add_argument("--name", default="Print Operator", help="Operator Name")
    args = parser.parse_args()

    create_operator(args.email, args.password, args.name)
