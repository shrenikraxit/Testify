async function generateTest() {
    const subject = document.getElementById('test-subject').value;
    const numQuestions = document.getElementById('num-questions').value;
    const difficulty = document.getElementById('difficulty').value;

    const response = await fetch('/generate_test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            subject: subject,
            num_questions: parseInt(numQuestions, 10),
            difficulty: difficulty
        })
    });

    if (response.ok) {
        const data = await response.json();
        displayTest(data.test);
    } else {
        alert("Failed to generate test. Please try again.");
    }
}

function displayTest(testContent) {
    const testContainer = document.getElementById('test-container');
    testContainer.innerHTML = "<h2>Generated Test</h2>";
    const questions = JSON.parse(testContent);

    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.classList.add('question-block');
        questionDiv.innerHTML = `
            <h4>Question ${index + 1}: ${question.question}</h4>
            <ul>
                ${question.options.map(option => `<li>${option}</li>`).join('')}
            </ul>
        `;
        testContainer.appendChild(questionDiv);
    });
}