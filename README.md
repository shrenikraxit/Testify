Testify delivers an engaging user experience built with HTML5, JavaScript/jquery, CSS, Bootstrap and font awesome libraries; supported by Python, Flask and SQLLite in the backend. For processing the hand written notes, it uses the optical character recognition (OCR) technique with Google Cloud Vision API. And for processing the youtube videos, it uses Google YouTube API.
Testify uses various AI technologies to deliver the service. It leverages the RAG (Retrieve - Augment - Generate) technique to build the knowledge base for the student/user. The application uses Open AI embeddings to convert the study materials to vectors, and store them in the ChromaDB collection and vector store for retrieval. Testify uses LangChain prompt piping to generate the customized tests from the uploaded study materials passed as context to the large language model Open AI GPT-4O invokes as API. Thus the tests are generated only from the student supplied study materials, and remove the AI hallucination completely. FInally it invokes the Open AI API to grade the test.
Testify runs from a virtual environment in my local machine, and can be hosted in any cloud as a web application.
