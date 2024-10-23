# setup_db.py
from app import create_app
from models import db

# Create the Flask application
app = create_app()

# Initialize the database
with app.app_context():
    db.create_all()
    print("Database tables created successfully!")
