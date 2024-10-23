# app.py
from flask import Flask, request, jsonify, render_template, redirect, url_for, flash, send_from_directory, abort
from sqlalchemy.orm import joinedload
from werkzeug.utils import secure_filename
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, UserMixin, login_user, current_user, logout_user, login_required
import os
import uuid
import random
from dotenv import load_dotenv
from pydantic import BaseModel, ValidationError
from typing import List, Dict, Any
import sys

import easyocr
import ssl
import certifi

import io
from google.cloud import vision
from google.auth import default

import numpy as np
import re
import requests
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
# Import your User model from models.py
from models import db, User, Subject, Topic, PDFDocument, TEXTDocument, YOUTUBEDocument, Test
from ingest_studymaterials import ingest_pdf, ingest_text, summarize_text_from_YT
from create_Test import generate_test_from_RAG, AI_check_answer

# Create the Flask application
def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app_setup.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = './upload'
    app.config['SECRET_KEY'] = 'supersecretkey'  # Replace with a strong key
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "Google Cloud API/testify-438319-48c8d22c1f68.json"
    credentials, project = default()
    print("Debug: Credentials are set up correctly.")
    print(f"Debug: Using project: {project}")

    # Initialize SQLAlchemy
    db.init_app(app)
    #db = SQLAlchemy(app) ?do I need this for login implementation?
    bcrypt = Bcrypt(app)
    login_manager = LoginManager(app)
    login_manager.login_view = 'login'
    
    # Ensure the upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # User loader for Flask-Login
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Routes
    @app.route('/')
    @app.route('/home')
    def home():
        return render_template('home.html')

    # ------------- START: ROUTES for handling the login & registration ------------    
    @app.route('/register', methods=['GET', 'POST'])
    def register():
        if current_user.is_authenticated:
            return redirect(url_for('index'))
        
        if request.method == 'POST':
            username = request.form.get('username')
            email = request.form.get('email')
            password = request.form.get('password')
            hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
            
            # Create new user and save to DB
            user = User(username=username, email=email, password=hashed_password)
            db.session.add(user)
            db.session.commit()
            print(f'Your account has been created! You are now able to log in.', 'success')
            return redirect(url_for('login'))

        return render_template('register.html')

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if current_user.is_authenticated:
            return redirect(url_for('index'))
        
        if request.method == 'POST':
            email = request.form.get('email')
            password = request.form.get('password')
            user = User.query.filter_by(email=email).first()
            
            if user and bcrypt.check_password_hash(user.password, password):
                login_user(user)
                flash('Login successful!', 'success')
                print(f"Login successful")
                return redirect(url_for('index'))
            else:
                print(f'Login unsuccessful. Please check email and password.', 'danger')
        
        return render_template('login.html')

    @app.route('/logout')
    @login_required
    def logout():
        logout_user()
        return redirect(url_for('home'))

    @app.route('/account')
    @login_required
    def account():
        return render_template('account.html')

    # ------------- END: ROUTES for handling the login & registration ------------

    # Root route for index.html - page when the user is logged in($working 1006)
    @app.route("/index")
    def index():
        # Example user; in real applications, replace this with authenticated user
        return render_template("index.html", user_name=current_user.username)

    # Route to render the dashboard page ($working 1006)
    @app.route("/dashboard")
    @login_required
    def dashboard():
        return render_template("dashboard.html")

    # Route to render the practice page ($working 1006)
    @app.route("/practice")
    @login_required
    def practice():
        return render_template("practice.html")

    # Route to render the createTest page 
    @app.route("/createTest")
    @login_required
    def createTest():
        return render_template("createTest.html")

    # Route to render the setup page ($working 1006)
    @app.route("/setup")
    @login_required
    def setup():
        return render_template("setup.html")
    
    # Route to render the setup page ($working 1006)
    @app.route("/library")
    @login_required
    def library():
        return render_template("library.html")
    
    # Route to render the setup page ($working 1006)
    @app.route("/upload")
    @login_required
    def upload():
        return render_template("upload.html")
    

    # Route to get all subjects and their respective topics [used in library.js] ($working 1006)
    @app.route("/get_subjects_and_topics", methods=["GET"])
    @login_required
    def get_subjects_and_topics():
        # Fetch all subjects and their associated topics for the current user
        user = current_user
        subjects = Subject.query.filter_by(user_id=user.id).all()

        # Create a list to hold the subjects with their topics and associated documents
        subject_data = []

        for subject in subjects:
            topics = Topic.query.filter_by(subject_id=subject.id).all()

            topic_list = []
            for topic in topics:
                # Fetch related text documents, PDF documents, and YouTube documents for each topic
                txt_documents = [{"filename": txt_doc.filename, "title": txt_doc.title} for txt_doc in topic.text_documents]
                pdf_documents = [{"filename": pdf_doc.filename, "title": pdf_doc.title} for pdf_doc in topic.pdf_documents]
                youtube_links = [{"filename": yt_doc.filename, "url": yt_doc.url} for yt_doc in topic.yt_documents]

                # Append the topic with associated documents to the topic list
                topic_list.append({
                    "id": topic.id,
                    "name": topic.name,
                    "description": topic.description,
                    "txt_documents": txt_documents,
                    "pdf_documents": pdf_documents,
                    "youtube_links": youtube_links
                })

            # Append subject with its topics to the subject_data list
            subject_data.append({
                "id": subject.id,
                "name": subject.name,
                "topics": topic_list
            })
        # Return the data as JSON
        return jsonify(subject_data), 200

    @app.route('/get_file/<filename>', methods=['GET'])
    @login_required
    def get_file(filename):
        user_id = current_user.id
        # Path to the user's folder where files are stored
        user_folder = os.path.join("upload", str(user_id))
        print(f"Debug: file fetched...", user_id)
        # Check if the file exists
        if os.path.exists(os.path.join(user_folder, filename)):
            # Send the file from the directory
            return send_from_directory(user_folder, filename, as_attachment=False)
        else:
            # Return a 404 if the file doesn't exist
            abort(404, description="File not found")

    # Route to add a new topic for a specific subject [used in library.js] ($workiing 1006)
    @app.route("/add_topic", methods=["POST"])
    @login_required
    def add_topic():
        data = request.get_json()
        subject_id = data.get('subject_id')  # Expecting subject_id in the request
        topic_name = data.get('name')  # Expecting 'name' instead of 'topic'
        topic_description = data.get('description') # Topic description 

        # Validate the input data
        if not subject_id or not topic_name:
            return jsonify({"error": "Subject ID and Topic name are required."}), 400

        # Find the subject by ID
        subject = Subject.query.filter_by(id=subject_id).first()
        if not subject:
            return jsonify({"error": f"Subject with ID '{subject_id}' not found."}), 404

        # Check if the topic already exists for the subject
        existing_topic = Topic.query.filter_by(name=topic_name, subject_id=subject.id).first()
        if existing_topic:
            return jsonify({"error": f"Topic '{topic_name}' already exists for this subject."}), 400

        # Add new topic to the subject
        new_topic = Topic(name=topic_name, subject_id=subject.id, description = topic_description)
        db.session.add(new_topic)
        db.session.commit()

        return jsonify({"message": f"Topic '{topic_name}' added to subject '{subject.name}' successfully.", "topic_id": new_topic.id, "subject_id": new_topic.subject_id}), 200


    # Route to get all subjects for the user [used in index.js and used to populate upload.html and createTest.html] ($working 1007)
    @app.route("/get_subjects", methods=["GET"])
    @login_required
    def get_subjects():
        user = current_user
        # Create a list of dictionaries with each subject's id and name
        subjects = [{"id": subject.id, "name": subject.name} for subject in user.subjects]
        
        # Debugging print statement to verify output
        print(subjects)

        return jsonify(subjects), 200

    # Route to get topics for a specific subject [used in index.js and used to populate upload.html and createTest.html] ($working 1007)
    @app.route("/get_topics/<int:subject_id>", methods=["GET"])
    @login_required
    def get_topics(subject_id):
        user = current_user
        # Find the subject by ID and ensure it belongs to the current user
        subject = Subject.query.filter_by(id=subject_id, user_id=user.id).first()
        if not subject:
            return jsonify({"error": f"Subject with ID {subject_id} not found for this user."}), 404

        # Retrieve topics for the specified subject
        topics = [{"id": topic.id, "name": topic.name} for topic in subject.topics]

        # Debugging print statement to verify output
        print(f"Topics for subject {subject.name}: {topics}")

        return jsonify(topics), 200



    # Route to add a new subject for the user [used in library.js] ($working 1007)
    @app.route("/add_subject", methods=["POST"])
    @login_required
    def add_subject():
        # Safely get the JSON data from the request
        request_data = request.get_json()
        
        # Debugging logs to print the incoming request data
        print(f"Debug: Request data: {request_data}")

        # Check if request body is JSON and contains the 'name' key
        if not request_data or 'name' not in request_data:
            return jsonify({"message": "Invalid request. 'name' key is missing."}), 400

        subject_name = request_data['name']

        # Check if the subject already exists for the user
        user = current_user
        if Subject.query.filter_by(name=subject_name, user_id=user.id).first():
            return jsonify({"message": f"Subject '{subject_name}' already exists."}), 400

        # Create a new subject for the user
        new_subject = Subject(name=subject_name, user_id=user.id)
        db.session.add(new_subject)
        db.session.commit()

        # Return the ID and name of the newly created subject
        return jsonify({
            "message": "Subject added successfully.",
            "subject_id": new_subject.id,  # Include the newly created subject's ID
            "subject_name": new_subject.name
        }), 200

    # Route to remove a subject
    @app.route("/remove_subject", methods=["POST"])
    @login_required
    def remove_subject():
        user = current_user
        subject_name = request.json['subject']
        
        # Find and delete the subject
        subject = Subject.query.filter_by(name=subject_name, user_id=user.id).first()
        if not subject:
            return jsonify({"message": "Subject not found."}), 404
        
        db.session.delete(subject)
        db.session.commit()
        return jsonify({"message": "Subject removed successfully.", "subjects": [subject.name for subject in user.subjects]})

    # Route to upload a PDF ($working 1009)
    @app.route("/upload_pdf", methods=["POST"])
    @login_required
    def upload_pdf():
        # Retrieve the file and form data
        file = request.files.get('pdf')
        title = request.form.get('title')
        subject_id = request.form.get('subject_id')  # Get subject_id from form data
        topic_id = request.form.get('topic_id')      # Get topic_id from form data

        # Validate the subject and topic IDs
        if not subject_id:
            return jsonify({"message": "Subject ID is missing."}), 400
        if not topic_id:
            return jsonify({"message": "Topic ID is missing."}), 400

        # Check if the subject exists for the user
        try:
            user = current_user
            subject = Subject.query.filter_by(id=subject_id, user_id=user.id).one()
        except NoResultFound:
            return jsonify({"message": f"Subject with ID {subject_id} not found for this user."}), 404

        # Check if the topic exists for the given subject
        try:
            topic = Topic.query.filter_by(id=topic_id, subject_id=subject.id).one()
        except NoResultFound:
            return jsonify({"message": f"Topic with ID {topic_id} not found for the subject {subject.name}."}), 404

        # Validate the file
        if not file:
            return jsonify({"message": "No file provided."}), 400

        # Create a secure filename and save the file to a directory based on the user ID
        filename = secure_filename(file.filename)
        upload_directory = os.path.join('upload', str(user.id))
        os.makedirs(upload_directory, exist_ok=True)  # Create directory if it doesn't exist

        file_path = os.path.join(upload_directory, filename)
        file.save(file_path)  # Save the file to the specified path
        print(f"Debug: before inserting the pdf")
        # Create a new PDFDocument entry in the database with file metadata
        new_pdf = PDFDocument(
            filename=filename,
            subject_id=subject.id,
            topic_id=topic.id,  # Associate the PDF with the topic
            user_id=user.id,
            title = title
        )
        db.session.add(new_pdf)
        db.session.commit()
        print(f"Debug: file_path: {file_path}")
        # Call the ingest_studymaterials function here to process the file further
        ingest_pdf(file_path, subjectID = subject.id, topicID = topic.id, userName = user.username)

        return jsonify({"message": "PDF uploaded and stored successfully!"}), 200

    def detect_handwriting(image_path):
        """
        Detects handwriting in the specified image file using Google Cloud Vision API.
        
        :param image_path: Path to the image file.
        :return: Detected text in the image.
        """
        # Initialize the Vision API client
        client = vision.ImageAnnotatorClient()

        # Load the image file
        with io.open(image_path, 'rb') as image_file:
            content = image_file.read()
        
        # Create an image object from the content
        image = vision.Image(content=content)

        # Perform document text detection (handwriting included)
        response = client.document_text_detection(image=image)

        # Check for errors in the response
        if response.error.message:
            raise Exception(f"Error in Vision API: {response.error.message}")

        # Extract the detected text from the response
        detected_text = response.full_text_annotation.text

        return detected_text

    # Route to upload a handwritten notes in an image file ()
    @app.route("/upload_handwrittenNotes", methods=["POST"])
    @login_required
    def convert_handwritten_pdf_to_text():
        try:
            # Step 0: Retrieve the file and form data
            imgfile = request.files.get('imgfile')
            title = request.form.get('title')
            subject_id = request.form.get('subject_id')  # Get subject_id from form data
            topic_id = request.form.get('topic_id')      # Get topic_id from form data
            
            if not imgfile:
                return jsonify({"error": "No file uploaded"}), 400

            # Step 1: Define the upload directory for the user
            upload_directory = os.path.join('upload', str(current_user.id))
            os.makedirs(upload_directory, exist_ok=True)  # Create directory if it doesn't exist
            
            # Step 2: Save the image to the user-specific upload directory
            img_filename = secure_filename(imgfile.filename)
            img_path = os.path.join(upload_directory, img_filename)
            imgfile.save(img_path)  # Save the uploaded image to the file path

            print(f"Debug: Image saved at {img_path}")

            ''' 
            # Step 3: Pass the saved image path to easyocr for text extraction
            try:
                # Initialize EasyOCR reader, make sure models are downloaded and cached
                reader = easyocr.Reader(['en'], gpu=False)  # gpu=False to disable GPU usage
                text_detections = reader.readtext(img_path)

                # Extract the text from detected results
                extracted_text = ""
                for detection in text_detections:
                    extracted_text += detection[1] + "\n"  # Append detected text to string

            except Exception as e:
                return jsonify({"error": f"Failed to extract text: {str(e)}"}), 500

            print(f"Debug: after OCR")
            '''
            # Step 3: Use google cloudvision api to detect handwriting
            extracted_text = detect_handwriting(img_path)
            print(f"Debug: Google OCR: {extracted_text}")

            # Step 4: Save the extracted text to a file
            #rand_file_name = f"{uuid.uuid4()}.txt"
            img_filename_txt = f"{img_filename}.txt"
            text_file_path = os.path.join(upload_directory, img_filename_txt)

            # Save text to file
            with open(text_file_path, 'w', encoding='utf-8') as text_file:
                text_file.write(extracted_text)

            print(f"Debug: Text saved at {text_file_path}")
            
            # Create a new TEXTDocument entry in the database with file metadata
            new_text = TEXTDocument(
                filename=img_filename,
                subject_id=subject_id,
                topic_id=topic_id,  # Associate the text with the topic
                user_id=current_user.id,
                title = title
            )
            db.session.add(new_text)
            db.session.commit()
            print(f"Debug: file_path: {text_file_path}")

            # Step 5: Call the ingest_studymaterials function here to process the file further
            ingest_text(text_file_path, subjectID=subject_id, topicID=topic_id, userName=current_user.username)

            print(f"Text successfully extracted and saved to {text_file_path}")
            return jsonify({"message": "Text successfully extracted", "file_path": text_file_path}), 200

        except Exception as e:
            # Catch any unexpected errors and return a 500 response
            print(f"Unexpected error occurred: {str(e)}")
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500



    # Route to upload a PDF ($working 1015))
    @app.route("/upload_text", methods=["POST"])
    @login_required
    def upload_text():
        # Access the JSON data from the request body
        data = request.get_json()

        # Retrieve the values for text, subjectId, and topicId
        title =data.get('title') # Retrieve the title 
        text = data.get('text') # Retrieve the text
        subject_id = data.get('subjectId')
        topic_id = data.get('topicId')

        # Validate the subject and topic IDs
        if not subject_id:
            return jsonify({"message": "Subject ID is missing."}), 400
        if not topic_id:
            return jsonify({"message": "Topic ID is missing."}), 400

        # Check if the subject exists for the user
        try:
            user = current_user
            subject = Subject.query.filter_by(id=subject_id, user_id=user.id).one()
        except NoResultFound:
            return jsonify({"message": f"Subject with ID {subject_id} not found for this user."}), 404

        # Check if the topic exists for the given subject
        try:
            topic = Topic.query.filter_by(id=topic_id, subject_id=subject.id).one()
        except NoResultFound:
            return jsonify({"message": f"Topic with ID {topic_id} not found for the subject {subject.name}."}), 404

        # Create a secure filename and save the file to a directory based on the user ID
        # Generate random file name
        file_name = f"{uuid.uuid4()}.txt"
        upload_directory = os.path.join('upload', str(user.id))
        os.makedirs(upload_directory, exist_ok=True)  # Create directory if it doesn't exist

        file_path = os.path.join(upload_directory, file_name)
        # Save text to file
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(text)

        print(f"File saved at {file_path}")

        # Create a new TEXTDocument entry in the database with file metadata
        new_text = TEXTDocument(
            filename=file_name,
            subject_id=subject.id,
            topic_id=topic.id,  # Associate the PDF with the topic
            user_id=user.id,
            title = title
        )
        db.session.add(new_text)
        db.session.commit()
        print(f"Debug: file_path: {file_path}")

        # Call the ingest_studymaterials function here to process the file further
        ingest_text(file_path, subjectID = subject.id, topicID = topic.id, userName = user.username)

        return jsonify({"message": "TEXT uploaded and stored successfully!"}), 200

# Route to upload a youtube video ()
    @app.route("/upload_youtubeVideo", methods=["POST"])
    @login_required
    def upload_youtubevideo():
        # Access the JSON data from the request body
        data = request.get_json()

        # Retrieve the values for text, subjectId, and topicId
        youtubeLink = data.get('url') # Retrieve the text
        subject_id = data.get('subjectId')
        topic_id = data.get('topicId')

        print(f"YT Link: {youtubeLink}, Subject: {subject_id}, Topic: {topic_id}")

        # Validate the subject and topic IDs
        if not subject_id:
            return jsonify({"message": "Subject ID is missing."}), 400
        if not topic_id:
            return jsonify({"message": "Topic ID is missing."}), 400

        # Check if the subject exists for the user
        try:
            user = current_user
            subject = Subject.query.filter_by(id=subject_id, user_id=user.id).one()
        except NoResultFound:
            return jsonify({"message": f"Subject with ID {subject_id} not found for this user."}), 404

        # Check if the topic exists for the given subject
        try:
            topic = Topic.query.filter_by(id=topic_id, subject_id=subject.id).one()
        except NoResultFound:
            return jsonify({"message": f"Topic with ID {topic_id} not found for the subject {subject.name}."}), 404


        # Generate random file name
        rand_file_name = f"{uuid.uuid4()}"
        file_name = rand_file_name + ".yt"
        thumbnail_name = rand_file_name + ".jpg"
        upload_directory = os.path.join('upload', str(user.id))
        os.makedirs(upload_directory, exist_ok=True)  # Create directory if it doesn't exist
        file_path = os.path.join(upload_directory, file_name)
        thumbnail_path = os.path.join(upload_directory, thumbnail_name)

        #Get the video
        video_id = extract_video_id(youtubeLink)
        download_thumbnail(video_id,thumbnail_path)
        transcript = get_transcript(video_id)
        video_summary = summarize_text_from_YT(transcript, lang='en')
        print(f"Transcript: {transcript}")
        print(f"Video Summary: {video_summary}")
        #video_summary = transcript

        # Save text to file
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(video_summary)

        print(f"File saved at {file_path}")

        # Create a new TEXTDocument entry in the database with file metadata
        new_yt = YOUTUBEDocument(
            filename=file_name,
            thumbnail_filename = thumbnail_name,
            subject_id=subject.id,
            topic_id=topic.id,  # Associate the PDF with the topic
            user_id=user.id,
            url = youtubeLink
        )
        db.session.add(new_yt)
        db.session.commit()
        print(f"Debug: file_path: {file_path}")

        # Call the ingest_studymaterials function here to process the file further
        ingest_text(file_path, subjectID = subject.id, topicID = topic.id, userName = user.username)
        print(f"Debug: Video Summary: {video_summary}")

        return jsonify({"message": "TEXT uploaded and stored successfully!"}), 200

    #youtube video extraction function
    def extract_video_id(url):
        match = re.search(r"v=([a-zA-Z0-9_-]+)", url)
        if match:
            print(f"Debug: Video ID: {match.group(1)}")
            return match.group(1)
        else:
            raise ValueError("Invalid YouTube URL")
    
    #youtube video extraction function    
    def extract_metadata(url):
        r = requests.get(url)
        soup = BeautifulSoup(r.text, features="html.parser")
        title = soup.find("title").text
        channel = soup.find("link", itemprop="name")['content']
        return title, channel
    
    #youtube video extraction function    
    def download_thumbnail(video_id, path):
        image_url = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        img_data = requests.get(image_url).content
        print(f"Debug: Thumbnail ID: {path}")
        with open(path, 'wb') as handler:
            handler.write(img_data)

    #youtube video extraction function    
    def get_transcript(video_id):
        transcript_raw = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
        transcript_full = ' '.join([i['text'] for i in transcript_raw])
        print(f"Debug: transcript received")
        return transcript_full
    

    # Route to get all PDFs with error handling
    @app.route("/get_pdfs", methods=["GET"])
    @login_required
    def get_pdfs():
        try:
            # Retrieve all PDFs associated with the user
            user = current_user
            pdfs = PDFDocument.query.filter_by(user_id=user.id).all()

            # Check if PDFs were found
            if not pdfs:
                return jsonify({"message": "No PDFs found for this user."}), 200

            # Prepare a list of dictionaries representing each PDF (include the subject name)
            pdf_list = [
                {
                    "id": pdf.id,
                    "filename": pdf.filename,
                    "subject_name": pdf.subject.name if pdf.subject else "Unknown",  # Access subject.name through the relationship
                    "user_id": pdf.user_id,
                    "subject_id": pdf.subject_id
                }
                for pdf in pdfs
            ]

            # Return the list of PDFs as JSON
            return jsonify(pdf_list), 200

        except Exception as e:
            # Log the error for debugging purposes
            print(f"An error occurred while retrieving PDFs: {str(e)}")
            return jsonify({"error": f"An error occurred while retrieving PDFs: {str(e)}"}), 500
  
    #Route to delete the topic and associated documents from storage and database with error handling
    #$$ This doesn't delete documents from the ChromaDB yet
    @app.route('/delete_topic/<int:topic_id>', methods=['DELETE'])
    @login_required
    def delete_topic(topic_id):
        # Find the topic by ID
        topic = Topic.query.filter_by(id=topic_id).first()

        if not topic:
            abort(404, description="Topic not found")

        # Delete associated PDF documents from storage and database
        for pdf in topic.pdf_documents:
            file_path = os.path.join('upload', str(current_user.id), pdf.filename)
            if os.path.exists(file_path):
                os.remove(file_path)  # Remove the file from storage
            db.session.delete(pdf)  # Remove the record from the database

        # Delete associated text documents from storage and database
        for text in topic.text_documents:
            file_path = os.path.join('upload', str(current_user.id), text.filename)
            if os.path.exists(file_path):
                os.remove(file_path)  # Remove the file from storage
            db.session.delete(text)  # Remove the record from the database

        # Delete associated YouTube documents from the database
        for yt in topic.yt_documents:
            db.session.delete(yt)  # Remove the record from the database

        # Delete associated tests from the database
        tests = Test.query.filter_by(topic_id=topic.id).all()
        for test in tests:
            db.session.delete(test)  # Remove the test record from the database

        # Finally, delete the topic itself
        db.session.delete(topic)
        db.session.commit()

        return jsonify({"message": "Topic and all associated materials deleted successfully"}), 200

    # ============ Generate Test functions ============
    # Define the input JSON structure using Pydantic's BaseModel
    class TestConfig(BaseModel):
        subject_id: str
        subject_name: str
        topic_id: str
        topic_name: str
        question_types: Dict[str, int]  # Example: {"True/False": 5, "Multiple Choice": 3, "Matching": 2, "Written Responses": 2}

    # Define the output JSON structure, which includes the user_name
    class TestConfigUpdated(BaseModel):
        user_name: str
        subject_id: str
        subject_name: str
        topic_id: str
        topic_name: str
        question_types: Dict[str, int]

    #generate test page ($working 1015)
    @app.post("/generate_test")
    #@login_required
    def create_test():
        try:
            # Parse the incoming JSON request body
            input_data = request.get_json()
            print(f"Debug: Input to Generate Test: {input_data}")
            # Use Pydantic to validate the input data (TestRequest model)
            input_json = TestConfig(**input_data)

            # Prepare the output JSON by adding the user_name
            updatedConfig_json = TestConfigUpdated(
                user_name=current_user.username,  # Get current user's username
                subject_id=input_json.subject_id,
                subject_name=input_json.subject_name,
                topic_id=input_json.topic_id,
                topic_name=input_json.topic_name,
                question_types=input_json.question_types
            )

            # Call the RAG function to generate the test, this function is in create_test.py
            print(f"Debug: before calling the RAG function")
            test = generate_test_from_RAG(updatedConfig_json, current_user.id)

            # Return the generated test
            return jsonify(test), 200

        except ValidationError as e:
            # Handle validation errors from Pydantic
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            # Handle any other errors
            return jsonify({"error": "Failed to generate test", "details": str(e)}), 500
    
    #Route to check the written responses
    @app.route('/evaluate_answer', methods=['POST'])
    def evaluate_answer():
        data = request.json
        user_answer = data.get('user_answer')
        salient_points = data.get('salient_points')

        # Call OpenAI API to compare user's answer with salient points
        evaluation = AI_check_answer(user_answer, salient_points)
        print(f"Debug: evaluation of the written response: {evaluation}")
        return jsonify({"evaluation": evaluation})
        
    
    # Route to update the Test (statistics) table
    @app.route("/update_test", methods=["POST"])
    @login_required
    def update_test():
        try:
            user=current_user
            # Access the JSON data from the request body
            data = request.get_json()
            print(f"Data {data}")

            # Retrieve the values for text, subjectId, and topicId
            score = data.get('score') # Retrieve the text
            maxscore = data.get('maxscore')
            date_taken = data.get('date_taken')
            subject_id = data.get('subject_id')
            topic_id= data.get('topic_id')
            testname = f"{uuid.uuid4()}.test"
            print(f"ready to insert in the DB. Score {score} - date_taken {date_taken}")
            # Create a new TEXTDocument entry in the database with file metadata
            new_test = Test(
                name = testname,
                #description = "NA",
                #date_taken = date_taken,  # Timestamp of when the test was taken
                score = score,  # Score obtained in the test
                maxscore = maxscore,  # Score obtained in the test
                subject_id =subject_id,  # Reference to the related subject
                topic_id = topic_id, # Reference to the related topic
                user_id=user.id
            )
            db.session.add(new_test)
            db.session.commit()
            return jsonify("Success"), 200
        except ValidationError as e:
            # Handle validation errors from Pydantic
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            # Handle any other errors
            return jsonify({"error": "Failed to generate test", "details": str(e)}), 500
        
    # ============= DASHBOARD ==============
    # Route to get all tests with error handling
    @app.route("/get_tests", methods=["GET"])
    @login_required
    def get_tests():
        try:
            print(f"Debug: fetching all tests for this user {current_user}")
            # Retrieve all PDFs associated with the user
            user = current_user
            #tests = Test.query.filter_by(user_id=user.id).all()
            # Query to get the tests along with the associated subject and topic names
            tests = (
                db.session.query(Test)
                .join(Subject, Test.subject_id == Subject.id)
                .join(Topic, Test.topic_id == Topic.id)
                .filter(Test.user_id == user.id)
                .options(joinedload(Test.subject), joinedload(Test.topic))  # Load related data
                .all()
            )

            # Check if PDFs were found
            if not tests:
                return jsonify({"message": "No Tests found for this user."}), 200

            # Process the output to include subject name and topic name
            tests_taken_list = [{
                "id": test.id,
                "name": test.name,
                "description": test.description,
                "date_taken": test.date_taken,
                "score": test.score,
                "maxscore": test.maxscore,
                "user_id": test.user_id,
                "subject_id": test.subject_id,
                "subject_name": test.subject.name,  # Get the subject name
                "topic_id": test.topic_id,
                "topic_name": test.topic.name  # Get the topic name
            } for test in tests]

            # Return the list of PDFs as JSON
            return jsonify(tests_taken_list), 200

        except Exception as e:
            # Log the error for debugging purposes
            print(f"An error occurred while retrieving Tests: {str(e)}")
            return jsonify({"error": f"An error occurred while retrieving Tests: {str(e)}"}), 500
  


    return app

# Run the application
if __name__ == "__main__":
    app = create_app()
    app.run(host='0.0.0.0', port=8000, debug=True)
