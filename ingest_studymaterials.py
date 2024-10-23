from langchain_community.embeddings import OpenAIEmbeddings
from langchain.schema import Document
from langchain_community.document_loaders import PyPDFLoader
from langchain.document_loaders import TextLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain_community.vectorstores import Chroma
from pydantic_settings import BaseSettings
from flask_login import current_user, login_required
from flask import jsonify
import uuid
import os
import chromadb
import openai 
from openai import OpenAI
from dotenv import load_dotenv
import shutil

# Configuration for ChromaDB with persistence settings
CHROMA_PATH = "./chroma_db"  # Directory for persistent storage
EMBEDDING_MODEL = "text-embedding-ada-002"  # OpenAI embedding model name

# Initialize the ChromaDB client with the persistence directory
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

# Set your OpenAI API key here 
load_dotenv()
API_KEY = os.getenv('OPENAI_API_KEY')

def main():
    ingest_text()

def ingest_text(file_path, subjectID, topicID, userName):
    chunks = load_and_split_text(file_path)
    print(f"number of chunks: {len(chunks)}")
    text_save_to_chroma(chunks, subjectID, topicID, userName)

def load_and_split_text(text_file_path):
    try:
        # Load the PDF using the loader
        print(f"Debug: Attempting to load the text file from {text_file_path}")
        # Load the text file into a document format
        loader = TextLoader(text_file_path)
        documents = loader.load()

        # Split the document into smaller chunks for embedding
        text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=100)  # Customize chunk size if needed
        chunks = text_splitter.split_documents(documents)

        return chunks

    except FileNotFoundError:
        print(f"Error: The file {text_file_path} was not found. Please check the path.")
        return []

    except Exception as e:
        print(f"Error: An unexpected error occurred while loading the PDF - {str(e)}")
        return []

#Save text to chroma 
def text_save_to_chroma(chunks,subject_id, topic_id, userName):
    print(f"Debug: subject id: {subject_id}, topic id: {topic_id}, username: {userName}")
    existing_collections = chroma_client.list_collections() # List all collections in ChromaDB
    print(f"Debug: existing_collections: {existing_collections}")
    collection_name_to_check = userName # Define the collection name you want to check

    # Check if the collection name exists in the list of collections
    collection_exists = any(collection.name == collection_name_to_check for collection in existing_collections)
    print(f"Debug: Collection exist? {collection_exists}")
    if collection_exists:
        print(f"Debug: Collection '{collection_name_to_check}' already exists.")
        collection = chroma_client.get_collection(name=userName)
    else:
        print(f"Debug: Collection '{collection_name_to_check}' does not exist.")
        collection = chroma_client.create_collection(name=userName)
    
    # Reuse the same embedding model and Chroma client for all operations
    embedding_model = OpenAIEmbeddings(model=EMBEDDING_MODEL)
    # Initialize Chroma with OpenAI embeddings and connect to the collection
    vectorstore = Chroma(
        collection_name=userName,
        embedding_function=embedding_model,
        persist_directory=CHROMA_PATH  # Optional: Specify a directory to store embeddings
    )

    # Add documents (chunks) with metadata to ChromaDB collection
    ids = [str(uuid.uuid4()) for _ in range(len(chunks))]  # Generate unique IDs for each chunk
    # Generate metadata for each chunk, ensuring there is one metadata dictionary per chunk
    metadatas = [{"subject_id": subject_id, "topic_id": topic_id} for _ in range(len(chunks))]
    contents = [chunk.page_content for chunk in chunks]  # Extract content from each chunk

    print(f"Debug: Generated IDs: {len(ids)}")
    print(f"Debug: Generated metadata: {len(metadatas)}")

    # Add documents along with metadata and generated IDs to ChromaDB
    vectorstore.add_texts(
        texts=contents,  # List of document content
        metadatas=metadatas,
        ids=ids  # List of unique IDs
    )



def ingest_pdf(file_path, subjectID, topicID, userName):
    chunks = load_and_split_pdf(file_path)
    print(f"number of chunks: {len(chunks)}")
    pdf_save_to_chroma(chunks, subjectID, topicID, userName)

def load_and_split_pdf(pdf_file_path):
    try:
        # Load the PDF using the loader
        print(f"Debug: Attempting to load the PDF file from {pdf_file_path}")
        loader = PyPDFLoader(pdf_file_path)

        # Load and split the PDF into pages
        pages = loader.load_and_split()
        print(f"Debug: Successfully loaded {len(pages)} pages from the PDF file.")
        
        if len(pages) == 0:
            print("Error: No pages were found in the PDF. Please check the PDF file.")
            return []

        # Split the text into smaller chunks for embeddings
        text_splitter = CharacterTextSplitter(chunk_size=5000, chunk_overlap=500)
        chunks = text_splitter.split_documents(pages)
        print(f"Debug: Successfully split the PDF into {len(chunks)} chunks.")

        return chunks

    except FileNotFoundError:
        print(f"Error: The file {pdf_file_path} was not found. Please check the path.")
        return []

    except Exception as e:
        print(f"Error: An unexpected error occurred while loading the PDF - {str(e)}")
        return []


#pdf file saved to chromaDB
def pdf_save_to_chroma(chunks, subject_id, topic_id, userName):
    print(f"Debug: subject id: {subject_id}, topic id: {topic_id}, username: {userName}")
    existing_collections = chroma_client.list_collections() # List all collections in ChromaDB
    print(f"Debug: existing_collections: {existing_collections}")
    collection_name_to_check = userName # Define the collection name you want to check

    # Check if the collection name exists in the list of collections
    collection_exists = any(collection.name == collection_name_to_check for collection in existing_collections)
    print(f"Debug: Collection exist? {collection_exists}")
    if collection_exists:
        print(f"Debug: Collection '{collection_name_to_check}' already exists.")
        collection = chroma_client.get_collection(name=userName)
    else:
        print(f"Debug: Collection '{collection_name_to_check}' does not exist.")
        collection = chroma_client.create_collection(name=userName)
    
    # Reuse the same embedding model and Chroma client for all operations
    embedding_model = OpenAIEmbeddings(model=EMBEDDING_MODEL)
    # Initialize Chroma with OpenAI embeddings and connect to the collection
    vectorstore = Chroma(
        collection_name=userName,
        embedding_function=embedding_model,
        persist_directory=CHROMA_PATH  # Optional: Specify a directory to store embeddings
    )

    # Check that each chunk has a valid page_content property and extract the text
    texts = [chunk.page_content for chunk in chunks if hasattr(chunk, 'page_content')]
    print(f"Debug: Extracted texts: {len(texts)}")
    ids = [f"doc_{i}" for i in range(len(chunks))] # Generate unique IDs for each chunk based on its index
    # Generate metadata for each chunk, ensuring there is one metadata dictionary per chunk
    metadatas = [{"subject_id": subject_id, "topic_id": topic_id} for _ in range(len(chunks))]
    print(f"Debug: Generated IDs: {len(ids)}")
    print(f"Debug: Generated metadata: {len(metadatas)}")

    # Add documents along with metadata and generated IDs to ChromaDB
    vectorstore.add_texts(
        texts=texts,  # List of document content
        metadatas=metadatas,
        ids=ids  # List of unique IDs
    )

#youtube video extraction function  
def summarize_text_from_YT(text, lang='en'):
    
    client = OpenAI(api_key=API_KEY)
        
    prompt = f"""
    The following text is in its original language. Provide the output in this language: {lang}. 
    Format the output as follows:
        
    Summary:
    Medium size summary of the video with all important points. This summary will be proportionate to the length of the video.
        
    Key Takeaways:
    succinct bullet point list of key takeaways that will help a student to prepare for the exam
        
    input text: {text}
    """
        
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="gpt-3.5-turbo",
        #model="gpt-4-turbo", # better performance, slower inference
    )
        
    summary_text = response.to_dict()['choices'][0]['message']['content']
    return summary_text



if __name__ == "__main__":
    main()    


# Example usage
#ingest_studymaterialPDF(, 1, 1, 1)
