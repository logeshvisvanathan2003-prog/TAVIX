"""Set (or create) the admin login. Run from the backend folder with the venv active:
   set -a; source ../.env; set +a; python reset_admin.py logesh@tavix.in 'NewStrongPassword1'"""
import sys
from models import SessionLocal, User, Base, engine
from main import hash_pw
email, pw = sys.argv[1].lower(), sys.argv[2]
Base.metadata.create_all(engine); db = SessionLocal()
u = db.query(User).filter_by(email=email).first()
if u: u.password_hash, u.role = hash_pw(pw), "admin"
else: db.add(User(name="Logesh Visvanathan", email=email, password_hash=hash_pw(pw), role="admin"))
db.commit(); print("Admin ready:", email)
