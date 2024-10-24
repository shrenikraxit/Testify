Homepage:</br>
<img width="800" alt="image" src="https://github.com/user-attachments/assets/e17cc961-c771-40b7-a60d-b9c7604df0e8">

Library:
<img width="1728" alt="image" src="https://github.com/user-attachments/assets/e6266f9b-796d-4996-9684-d126d6f69026">

Upload study materials:
<img width="1561" alt="image" src="https://github.com/user-attachments/assets/6c2304c0-9ffb-4cac-aece-700539095a37">

Create test:
<img width="1338" alt="image" src="https://github.com/user-attachments/assets/d0ca7149-9e13-4b92-b5b3-e4f554bbc272">

Test: 
<img width="1717" alt="image" src="https://github.com/user-attachments/assets/a8bd6891-59ac-4d66-8f92-96e8aba2326d">

Test grading with AI checking written response questions:
<img width="1721" alt="image" src="https://github.com/user-attachments/assets/976d6331-9d1f-42fc-8171-82227f9e63e3">

Performance Dashboard:
<img width="1709" alt="image" src="https://github.com/user-attachments/assets/abb41707-a1b4-46b6-a808-5bb3f7f2f644">



Testify delivers an engaging user experience built with HTML5, JavaScript/jquery, CSS, Bootstrap and font awesome libraries; 
Supported by Python, Flask and SQLLite in the backend. 

For processing the hand written notes, it uses the optical character recognition (OCR) technique with Google Cloud Vision API. And for processing the youtube videos, it uses Google YouTube API.

Testify uses various AI technologies to deliver the service. It leverages the RAG (Retrieve - Augment - Generate) technique to build the knowledge base for the student/user. The application uses Open AI embeddings to convert the study materials to vectors, and store them in the ChromaDB collection and vector store for retrieval. Testify uses LangChain prompt piping to generate the customized tests from the uploaded study materials passed as context to the large language model Open AI GPT-4O invokes as API. Thus the tests are generated only from the student supplied study materials, and remove the AI hallucination completely. FInally it invokes the Open AI API to grade the test.

Testify runs from a virtual environment in my local machine, and can be hosted in any cloud as a web application, with the requirements.txt

Backend communication:
![image](https://github.com/user-attachments/assets/371b2a01-b355-4db7-9e51-d5d9d2ea7645)

Experience Layer:
![image](https://github.com/user-attachments/assets/0f22db02-affb-483d-844b-750e7961963c)

