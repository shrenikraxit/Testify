// Handle subject dropdown change event to load topics  ($working 1007)
// used in the upload.html and createTest.html page
document.getElementById('subjectDropdown').addEventListener('change', function () {
    const subjectId = this.value;
    if (subjectId) {
        loadTopics(subjectId); // Load topics for the selected subject
    }
});

function showSpinner() {
    document.getElementById('spinner-modal').style.display = 'flex'; // Show the modal
}

function hideSpinner() {
    document.getElementById('spinner-modal').style.display = 'none'; // Hide the modal
}

var testJSON = []; // Global variable to store the test questions
var Subject = 0
var TOPIC = 0

// Generate button click event
document.getElementById('generateTestBtn').addEventListener('click', generateTest);

// Refactored generateTest function to include validation and confirmation prompt
function generateTest() {
    // Get selected subject and topic
    const subjectDropdown = document.getElementById('subjectDropdown')
    const subject = subjectDropdown.value;
    SUBJECT = subject;
    const subjectName = subjectDropdown.options[subjectDropdown.selectedIndex].text;
    if (!subject || subject === "Subject") {
        alert("Please select a subject to generate the test.");
        return;
    }

    const topicDropdown = document.getElementById('topicDropdown')
    const topic = topicDropdown.value;
    const topicName = topicDropdown.options[topicDropdown.selectedIndex].text;
    const topicDisplay = topic === "all" || !topic ? "All Topics" : topic;
    TOPIC = topic;

    // Get the number of questions for each test type
    const trueFalseQuestions = document.getElementById('trueFalseCheckbox').checked
        ? parseInt(document.getElementById('trueFalseSlider').value)
        : 0;

    const multipleChoiceQuestions = document.getElementById('multipleChoiceCheckbox').checked
        ? parseInt(document.getElementById('multipleChoiceSlider').value)
        : 0;

    const writtenResponseQuestions = document.getElementById('writtenResponseCheckbox').checked
        ? parseInt(document.getElementById('writtenResponseSlider').value)
        : 0;

    // Check if at least one question type is selected with more than 0 questions
    if (
        trueFalseQuestions === 0 &&
        multipleChoiceQuestions === 0 &&
        writtenResponseQuestions === 0
    ) {
        alert("Please select at least one type of question with more than 0 questions.");
        return;
    }

    // Create a summary message for confirmation
    const confirmationMessage = `
        You have selected the following options:
        
        Subject: ${subjectName}
        Topic: ${topicName}
        
        Test Configuration:
        - True/False Questions: ${trueFalseQuestions}
        - Multiple Choice Questions: ${multipleChoiceQuestions}
        - Written Response Questions: ${writtenResponseQuestions}

        Do you want to generate the test with these configurations?
    `;

    // Prompt the user for confirmation before generating the test
    if (confirm(confirmationMessage)) {
        // Create JSON with the selected values
        const testConfig = {
            subject_id: String(subject),
            subject_name: subjectName,
            topic_id: String(topicDisplay),
            topic_name: topicName,
            question_types: {
                true_false: trueFalseQuestions,
                multiple_choice: multipleChoiceQuestions,
                written_response: writtenResponseQuestions
            }
        };

        // Log the configuration and display a message
        console.log("Test Configuration: ", JSON.stringify(testConfig));

        // Call the generate test api with the test configuration and populate the writetest section
        handleTestGeneration(testConfig)
    }
}

//
async function handleTestGeneration(testConfig) {
    try {
        // Wait for the API to return the test JSON
        testJSON = await generateTestAPI(testConfig);

        // Populate the questions and test info on the writetest section
        populateWriteTest(testJSON);
    } catch (error) {
        console.error("Error generating test:", error);
    }
}

//Call the generate test api in app.py
async function generateTestAPI(testConfig) {
    showSpinner();
    try {
        const response = await fetch('/generate_test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testConfig),
        });
        hideSpinner();
        if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        // Parse the JSON response
        test_json = await response.json();
        // Debug: log the entire test object
        console.log("Generated Test:", test_json);

        return test_json;

    } catch (error) {
        console.error("Error generating test:", error);
        alert(`Failed to generate test: ${error.message}`);
    }
}


//Toggle create test and write test
function toggleDiv() {
    var createtestdiv = document.getElementById("createtest");
    var writetestdiv = document.getElementById("writetest");

    if (div.style.display === "none") {
        div.style.display = "block";  // Show the div
    } else {
        div.style.display = "none";   // Hide the div
    }
}

// Function to dynamically populate questions and test info
function populateWriteTest(testJSON) {
    // Hide the create test section and show the write test section
    var createtestdiv = document.getElementById("createtest");
    var writetestdiv = document.getElementById("writetest");
    createtestdiv.style.display = "none";
    writetestdiv.style.display = "block";

    // Populate subject and topic info
    const testInfoDiv = document.getElementById('testInfo');
    testInfoDiv.innerHTML = `<strong>Subject:</strong> ${testJSON.subject} <br> <strong>Topic:</strong> ${testJSON.topic}`;

    const questionsContainer = document.getElementById('questionsContainer');
    questionsContainer.innerHTML = ''; // Clear the container

    // Set up the question serial number
    let question_serial_num = 0;

    // Loop through the test questions and create elements for each question
    testJSON.questions.forEach((question, index) => {
        // Create a question container div
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-container';

        // Create a wrapper div for question number and text
        const questionRow = document.createElement('div');
        questionRow.className = 'question-row';

        // Create question serial number
        question_serial_num += 1;
        const questionNum = document.createElement('div');
        questionNum.className = 'question-num';
        questionNum.id = `q${question_serial_num}`;
        questionNum.textContent = `${question_serial_num}`;

        // Create a wrapper div for correct answer
        const answerRow = document.createElement('div');
        answerRow.className = 'answer-row';
        answerRow.id = `ans${question_serial_num}`;

        // Create question title (Test type and Question Text)
        const questionTitleContainer = document.createElement('div');
        questionTitleContainer.className = 'question-content';  // New container for question title and options

        const questionTitle = document.createElement('h4');
        questionTitle.className = 'question-title';
        questionTitle.textContent = `${question.question_text}`;

        // Append question title to its container
        questionTitleContainer.appendChild(questionTitle);

        // Append question number and question title container to the row
        questionRow.appendChild(questionNum);
        questionRow.appendChild(questionTitleContainer);

        // Append the row to the question container
        questionDiv.appendChild(questionRow);

        // Create a list of options (radio buttons)
        const optionsList = document.createElement('div');
        optionsList.className = 'options-list';

        question.options.choices.forEach((choice, optionIndex) => {
            if (choice == "NA") {
                console.log("Option.Choice = NA");
                //Generate a text area here to accept a user provided text of max 500 characters
                const textAreaDiv = document.createElement('div');
                textAreaDiv.className = 'form-group';

                const textAreaLabel = document.createElement('label');
                textAreaLabel.htmlFor = `question_${question_serial_num}_text_area`;
                textAreaLabel.textContent = "Please provide your answer:";

                const textArea = document.createElement('textarea');
                textArea.className = 'form-control';
                textArea.id = `question_${question_serial_num}_text_area`;
                textArea.name = `question_${question_serial_num}_text_area`;
                textArea.rows = 6;
                textArea.maxLength = 1000;
                textArea.placeholder = "Enter your answer here (Max 1000 characters)";

                // Append the label and text area to the div
                textAreaDiv.appendChild(textAreaLabel);
                textAreaDiv.appendChild(textArea);

                // Append the text area div to the options list
                optionsList.appendChild(textAreaDiv);
            } else {
                // Create a radio button for each choice
                const optionDiv = document.createElement('div');
                optionDiv.className = 'form-check';

                const radioButton = document.createElement('input');
                radioButton.className = 'form-check-input';
                radioButton.type = 'radio';
                radioButton.name = `question_${question_serial_num}`;
                radioButton.value = choice;
                radioButton.id = `question_${question_serial_num}_choice_${optionIndex}`;

                const label = document.createElement('label');
                label.className = 'form-check-label';
                label.htmlFor = `question_${question_serial_num}_choice_${optionIndex}`;
                label.textContent = choice;

                // Append radio button and label to option div
                optionDiv.appendChild(radioButton);
                optionDiv.appendChild(label);

                // Append option div to the list of options
                optionsList.appendChild(optionDiv);
            }

        });

        // Append the options list to the question title container
        questionTitleContainer.appendChild(optionsList);

        //Append the answer placeholder
        questionTitleContainer.appendChild(answerRow);

        // Append the question div to the questions container
        questionsContainer.appendChild(questionDiv);
    });
}



// Test submit and evaluation
document.getElementById('testForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    // Extract selected answers
    let question_serial_num = 0;
    let score = 0;
    let maxscore = 0;

    for (const question of testJSON.questions) {
        question_serial_num += 1;
        maxscore += question.points;

        if (question.test_type === "written_response") {
            // Get the user-provided answer
            const userAnswer = document.getElementById(`question_${question_serial_num}_text_area`).value;

            // Call Flask API to evaluate the answer using OpenAI
            try {
                const response = await fetch('/evaluate_answer', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_answer: userAnswer,
                        salient_points: question.salient_points
                    })
                });

                const result = await response.json();
                const evaluation = result.evaluation;

                // Check if the answer is correct based on OpenAI's response
                if (evaluation.includes("Correct")) {
                    score += question.points;
                    document.getElementById(`q${question_serial_num}`).className = 'correct question-num';
                } else {
                    document.getElementById(`q${question_serial_num}`).className = 'incorrect question-num';
                    document.getElementById(`ans${question_serial_num}`).innerText = `${evaluation} <\br> ${question.salient_points}`;
                }
            } catch (error) {
                console.error('Error evaluating written response:', error);
            }

        } else {
            // Handle multiple-choice questions
            const selectedOption = document.querySelector(`input[name="question_${question_serial_num}"]:checked`);
            if (selectedOption && question.options.correct_answer === selectedOption.value) {
                console.log("Correct answer for Q#", question_serial_num);
                score += question.points;
                // Turn the question_num to green
                document.getElementById(`q${question_serial_num}`).className = 'correct question-num';
            } else {
                console.log("Incorrect answer for Q#", question_serial_num);
                // Turn the question_num to red
                document.getElementById(`q${question_serial_num}`).className = 'incorrect question-num';
                document.getElementById(`ans${question_serial_num}`).innerText = `The correct answer is: ${question.options.correct_answer}`;
            }
        }
    }

    document.getElementById('result-summary').innerHTML = `<strong> Your score: ${score} out of ${maxscore} </strong> <br> <strong>${((score / maxscore) * 100).toFixed(2)}%</strong>`;
    document.getElementById('result-container').style.display = 'block';
    document.getElementById('submitbtn').style.display = 'none';

    // Function to save the test details in the database
    const testDetails = {
        score: score,
        maxscore: maxscore,
        date_taken: getCurrentSQLiteTimestamp(),
        subject_id: SUBJECT,
        topic_id: TOPIC
    };
    console.log("testDetails: ", testDetails);
    updateTest(testDetails);
});





//Call the update test table api in app.py
async function updateTest(testDetails) {
    try {
        const response = await fetch('/update_test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testDetails),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }
        console.log("Test table is updated");

    } catch (error) {
        console.error("Error updating test table:", error);
        alert(`Failed to update test table: ${error.message}`);
    }
}

//Time Stamp for updating the test table
function getCurrentSQLiteTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');  // Months are 0-based, so +1
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    // Combine into SQLite-compatible DATETIME string
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}