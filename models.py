from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON  # Import JSON type for storing mixed content if needed

# Initialize the SQLAlchemy instance
db = SQLAlchemy()

# Define a TestType enumeration for different types of tests
from enum import Enum

class TestType(Enum):
    TRUE_FALSE = 'True/False'
    MULTIPLE_CHOICE = 'Multiple Choice'
    MATCHING = 'Matching'
    WRITTEN = 'Written'
    MIXED = 'Mixed'

# User table to store user information
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), nullable=False, unique=True)
    email = db.Column(db.String(100), nullable=False, unique=True)
    password = db.Column(db.String(60), nullable=False)
    # Relationships to subjects, PDFs, and web links
    subjects = db.relationship('Subject', backref='user', lazy=True, cascade="all, delete-orphan")
    pdf_documents = db.relationship('PDFDocument', backref='user', lazy=True, cascade="all, delete-orphan")
    text_documents = db.relationship('TEXTDocument', backref='user', lazy=True, cascade="all, delete-orphan")
    yt_documents = db.relationship('YOUTUBEDocument', backref='user', lazy=True, cascade="all, delete-orphan")

# Subject table to store subjects associated with the user
class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Link subject to a user
    # Relationship with the Topic model
    topics = db.relationship('Topic', back_populates='subject', cascade="all, delete-orphan")

# Topic table to store topics within subjects
class Topic(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)  # Link topic to a subject
    # Relationship back to the Subject model
    subject = db.relationship('Subject', back_populates='topics')
    # Relationships to PDFs and Web Links
    pdf_documents = db.relationship('PDFDocument', back_populates='topic', cascade="all, delete-orphan")
    text_documents = db.relationship('TEXTDocument', back_populates='topic', cascade="all, delete-orphan")
    yt_documents = db.relationship('YOUTUBEDocument', back_populates='topic', cascade="all, delete-orphan")

# Table to store PDF documents and their tags
class PDFDocument(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200), nullable=False)
    title=db.Column(db.String(200), nullable=False)
    # Foreign Keys linking PDFs to subjects, topics, and users
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    topic_id = db.Column(db.Integer, db.ForeignKey('topic.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    # Relationships to Subject, Topic, and User
    subject = db.relationship('Subject', backref='pdf_documents')
    topic = db.relationship('Topic', back_populates='pdf_documents')

# Table to store TEXT documents and their tags
class TEXTDocument(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200), nullable=False)
    title=db.Column(db.String(200), nullable=False)
    # Foreign Keys linking PDFs to subjects, topics, and users
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    topic_id = db.Column(db.Integer, db.ForeignKey('topic.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    # Relationships to Subject, Topic, and User
    subject = db.relationship('Subject', backref='text_documents')
    topic = db.relationship('Topic', back_populates='text_documents')

# Table to store YOUTUBE documents and their tags
class YOUTUBEDocument(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200), nullable=False)
    thumbnail_filename = db.Column(db.String(200), nullable=True)
    url = db.Column(db.String(400), nullable=False)
    # Foreign Keys linking PDFs to subjects, topics, and users
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    topic_id = db.Column(db.Integer, db.ForeignKey('topic.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    # Relationships to Subject, Topic, and User
    subject = db.relationship('Subject', backref='yt_documents')
    topic = db.relationship('Topic', back_populates='yt_documents')

# Test table to store information about tests taken by users
class Test(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # Name or title of the test
    description = db.Column(db.Text, nullable=True)   # Optional description of the test
    date_taken = db.Column(db.DateTime, default=datetime.now)  # Timestamp of when the test was taken
    score = db.Column(db.Integer, nullable=False)  # Score obtained in the test
    maxscore = db.Column(db.Integer, nullable=False)  # Score obtained in the test

    # Foreign Keys linking tests to users, subjects, and topics
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Reference to the user who took the test
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)  # Reference to the related subject
    topic_id = db.Column(db.Integer, db.ForeignKey('topic.id'), nullable=False)  # Reference to the related topic

    # Relationships to the User, Subject, and Topic tables
    user = db.relationship('User', backref='tests')
    subject = db.relationship('Subject', backref='tests')
    topic = db.relationship('Topic', backref='tests')

