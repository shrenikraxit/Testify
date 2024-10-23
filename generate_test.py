# generate_test.py
from langchain_community.vectorstores import Chroma # import Chroma from langchain.vectorstores
from pydantic_settings import BaseSettings
from langchain_community.embeddings import OpenAIEmbeddings
import os
import chromadb
from langchain_community.chat_models import ChatOpenAI # import ChatOpenAI instead of OpenAI
from langchain.prompts import PromptTemplate # For prompts
from langchain_core.runnables import RunnablePassthrough, RunnableParallel
from langchain_core.output_parsers import StrOutputParser

import random
import openai 
from dotenv import load_dotenv



# Configuration and initialization
CHROMA_DB_PATH = "./chroma_db"
EMBEDDING_MODEL = "text-embedding-ada-002"

# Initialize ChromaDB client
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)

# Initialize Chroma vector store and retriever
embedding_model = OpenAIEmbeddings(model=EMBEDDING_MODEL)
collection = chroma_client.get_collection(name=user_id)
vectorstore = Chroma(
    collection_name=user_id,
    embedding_function=embedding_model,
    persist_directory=CHROMA_DB_PATH  # Optional: Specify a directory to store embeddings
)
#retriever = vectorstore.as_retriever()

# Initialize RAG components
API_KEY = os.getenv('OPENAI_API_KEY')
llm = ChatOpenAI(model="gpt-4", api_key=API_KEY)  # Use ChatOpenAI for chat models

def generate_test(subject_id, topic_id, user_id, num_questions=5, difficulty="medium"):
    # Retrieve relevant documents from ChromaDB
    query="Extract all documents"
    if topic_id == "ALL":
        retrieved = vectorstore.similarity_search(
            query=query,
            filter={"subject_id": subject_id}  # Filter by subject_id
        )
    else:
        print("Debug: topic:", topic_id)
        retrieved = vectorstore.similarity_search(
        query = query,
        #filter={"subject_id": subject_id, "topic_id": topic_id}  # Filter by both subject_id and topic_id
        filter={"subject_id": subject_id}  # Filter by subject_id
    )

    print(f"Number of relevant documents retrieved: {len(retrieved)}")
    if len(retrieved) == 0:
      print("No relevant documents found. Ensure the database is populated and the query is correct.")

    question_template = """
    you are a high school teacher with 25+ years of experience and generate questions for students to take a test, based on the context given to you only.
    You don't make things up.
    context:{context}
    question:{question}
    """
    
    prompt = PromptTemplate.from_template(template=question_template)
    #print(prompt.format(context = ' Here is the context to use', question = ' Answer this question based on the context'))
    #result = RunnableParallel(context= retrieved,question = RunnablePassthrough())
    result = retrieved
    parser = StrOutputParser()
    chain = result | prompt | llm | parser
    chain.invoke('Generate {num_questions} true/false questions, with {difficulty} difficulties')

'''
    # Generate questions using the retrieved information
    combined_text = " ".join([doc.page_content for doc in relevant_docs])
    if not combined_text.strip():
       raise ValueError("No content found in the retrieved documents. Cannot generate questions without content.")

    prompt = f"Generate {num_questions} {difficulty} multiple-choice questions from the following content"
    messages = [HumanMessage(content=prompt)] # create a HumanMessage object with the prompt as content
    response = llm(messages) # pass the list of messages to the llm
    return response
'''
    
# Example usage
print(generate_test(1,1,"shrenik3", 5, "hard"))