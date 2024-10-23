# query_vectorstore.py
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
import chromadb
from chromadb.config import Settings

# Configuration and global settings for ChromaDB persistence
CHROMA_DB_PATH = "./chroma_db"  # Directory for ChromaDB storage
EMBEDDING_MODEL = "text-embedding-ada-002"  # OpenAI embedding model name

# Initialize the ChromaDB client with the persistence directory
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)

# Reuse the persistent collection for querying
def query_subject(subject_name, query_text):
    embedding_model = OpenAIEmbeddings(model=EMBEDDING_MODEL)
    vector_store = Chroma(
        collection_name=subject_name,  # Collection name should be consistent with your subject
        embedding_function=embedding_model,
        client=chroma_client,
        persist_directory=CHROMA_DB_PATH # add persist_directory to Chroma
    )

    # Perform similarity search
    results = vector_store.similarity_search(query_text)
    return results

# Example usage: Query the stored data
result = query_subject("us-history", "Who was the first woman elected to the U.S. Senate from Arkansas?")
print(result)