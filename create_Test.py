from pydantic import BaseModel
from langchain import LLMChain, PromptTemplate
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OpenAIEmbeddings
from langchain.schema import AIMessage
from typing import List, Dict, Any
from flask_login import current_user, login_required
from flask import jsonify
from langchain.chat_models import ChatOpenAI # import ChatOpenAI instead of OpenAI
import chromadb
import random, json
import openai 
from openai import OpenAI
from prompts import prompts

# Load your environment variables (for OpenAI API key)
import os
from dotenv import load_dotenv
load_dotenv()

# OpenAI API Key
API_KEY = os.getenv('OPENAI_API_KEY')

# Constants
CHROMA_PATH = "./chroma_db"
EMBEDDING_MODEL = "text-embedding-ada-002"

# Initialize ChromaDB client
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
embedding_model = OpenAIEmbeddings(model=EMBEDDING_MODEL)

# Input model for the test generation request
class TestConfigUpdated(BaseModel): 
    user_name: str
    subject_id: str
    topic_id: str
    question_types: Dict[str, int]  # {"True/False": 5, "Multiple Choice": 3, "Matching": 2, "Written Responses": 2}

# Initialize Chroma vector store
def get_chroma_vectorstore(user_name):
    print(f"Debug: inside get_chroma_vectorstore {user_name}")
    return Chroma(collection_name=user_name, embedding_function=embedding_model, persist_directory=CHROMA_PATH)

# Function to generate a question based on document content and question type
def generate_question(content: str, question_type: str, question_counter: int):
    try:
        # Debug: Print the input arguments
        #print(f"Debug: Generating question of type '{question_type}' for content: {content[:20]}...")  # Print only the first 10 characters of content
        
        # Debug: Check if the question_type exists in prompts
        if question_type not in prompts:
            print(f"Error: Question type '{question_type}' not found in prompts.")
            raise ValueError(f"Invalid question type: {question_type}")

        # Debug: Print the template being used
        prompt_template = prompts[question_type]
        #print(f"Debug: Using prompt template: {prompt_template}")

        # Create the prompt and the chain
        prompt = PromptTemplate(template=prompt_template, input_variables=["content", "id"])
        #prompt = PromptTemplate(template=prompt_template, input_variables="content"])
        #print(f"Debug: Using prompt: {prompt.format(content=content)}")
        # Create an instance of OpenAI LLM
        llm = ChatOpenAI(model="gpt-4") 
        # Use the new RunnableSequence (replace LLMChain)
        pipeline = prompt | llm

        # Debug: Check the constructed chain and the content being passed
        #print(f"Debug: Running pipeline with content: {content[:20]}...")  # Print only the first 10 characters

        # Run the pipeline and return the result
        result = pipeline.invoke({"content": content, "id": question_counter})

        # Debug: Print the generated question
        print(f"Debug: Generated question: {result.content}")

        return result

    except Exception as e:
        # Print the error message if something goes wrong
        print(f"Error in generate_question: {e}")
        raise

# Main function to generate the test
def generate_test_from_RAG(request: TestConfigUpdated, userID):
    # Step 0: print the json received
    print(f"Debug: TestConfigUpdated received: {request}, user_name: {request.user_name}, subject: {request.subject_id}, topic: {request.topic_id}")
    # Step 1: Retrieve the user's collection
    try:
        collection = chroma_client.get_collection(name=request.user_name)
    except Exception as e:
        return jsonify({"error":f"User collection not found: {e}" }), 404

    # Step 2: Query the ChromaDB based on the user name
    vectorstore = get_chroma_vectorstore(request.user_name)
    print(f"Debug: after vectorstore")

    # Using filters to retrieve documents based on subject and topic
    try:
        subject = int(request.subject_id)
        topic = int(request.topic_id)
        print(f"Debug: Subject ID is of: {type(subject)}, Topic ID is of: {type(topic)}")
        
        # Step 1: Search by subject_id only
        subject_results = vectorstore.similarity_search(
            query="Retrieve all documents",
            k=100,  # Assuming you'll retrieve up to 100 documents
            filter={"subject_id": subject}
        )
        # Step 2: Manually filter the results by topic_id
        filtered_results = [result for result in subject_results if result.metadata.get('topic_id') == topic]
    
        print(f"Debug: After similarity search, results found {len(filtered_results)}")
        #print(f"Debug: After similarity search, results found {filtered_results}")
        if not filtered_results:
            return jsonify({"error":f"No documents found for the given subject and topic." }), 404
        

    except Exception as e:
        print(f"Error during similarity search: {str(e)}")
        return {"error": f"Similarity search failed: {str(e)}"}, 500

    # Step 3: Generate the requested number of questions for each type
    ai_message_contents = []  # Initialize the list to store generated questions

    # Loop through each question type and its respective number of questions
    for question_type, num_questions in request.question_types.items():
        if num_questions > 0:  # Only proceed if num_questions is greater than 0
            print(f"Debug: Processing {num_questions} questions for type: {question_type}")

            # Initialize a counter to track how many valid questions have been generated
            generated_questions = 0
            total_content_items = len(filtered_results)
            
            # Keep generating questions until we hit the required number
            i = 0  # Iterator over filtered results
            while generated_questions < num_questions:
                # Choose the next document snippet, loop over if necessary
                content = filtered_results[random.randint(i+1, total_content_items)].page_content

                # Set a minimum content length threshold
                min_content_length = 100  # Adjust this value as needed (in characters)
                
                # Skip if the content is too short
                if len(content) < min_content_length:
                    print(f"Debug: Skipping content because it's too short (length: {len(content)} characters)")
                    i += 1  # Move to the next content
                    continue  # Skip to the next iteration if the content is too short

                print(f"Debug: Generating question {generated_questions + 1} for {question_type}")

                # Call your function to generate the question based on the content and question type
                question = generate_question(content, question_type, question_counter = (generated_questions + 1))

                # Append the generated question and metadata to the questions list
                ai_message_contents.append(question)
                print(f"Debug: ai_message_contents {ai_message_contents}")

                # Increment both the valid question count and the content index
                generated_questions += 1
                i += 1

    # Step 4: Return the generated questions in a JSON response
    questions = []
    # Loop through each element in the questions array
    for message in ai_message_contents:
        # Check if the current element is an instance of AIMessage
        if isinstance(message, AIMessage):
            # Append the content of the AIMessage to the list 
                if isinstance(message.content, str):
                    try:
                        # Parse the string into a Python dictionary
                        print(f"Debug: message.content is a string")
                        parsed_question = json.loads(message.content)

                        # Append the parsed dictionary to the list
                        questions.append(parsed_question)
                    except json.JSONDecodeError as e:
                        # Handle JSON parsing error
                        print(f"Failed to parse JSON: {e}")
                else:
                    # If it's already a dictionary, append it directly
                    questions.append(message.content)

    # Print all the extracted AIMessage content
    #for content in questions:
        #print(content)        
    print(f"Debug $$$ - {questions}")

    print(f"Debug: Subject Name {request.subject_name}")
    print(f"Debug: Topic Name {request.topic_name}")
    #Step5: Return the test json
    # Initialize the test JSON structure
    test_json = {
        "subject": request.subject_name,
        "topic": request.topic_name,
        "questions": questions
    }
    
    # Return the complete test JSON
    print(f"Debug $$$ - {test_json}")
    return test_json
    
    #print(f"Debug: Response from generate_test {questions}")

def AI_check_answer (user_answer, salient_points):
    client = OpenAI(api_key=API_KEY)
    # Call OpenAI API to compare user's answer with salient points
    try:
        prompt=f"Evaluate the following answer against the salient points: {salient_points}\n\nUser answer: {user_answer}\n\nIs the answer correct? Respond with Correct or Incorrect and explain briefly."

        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="gpt-4-turbo",
            max_tokens=100
            #model="gpt-4-turbo", # better performance, slower inference
        )
        
        evaluation = response.to_dict()['choices'][0]['message']['content']
        print(f"Debug: evaluation of the written response: {evaluation}")
        return evaluation  # Return the evaluation text
    except Exception as e:
        return str(e)  # Return the error as a string, not a JSON response