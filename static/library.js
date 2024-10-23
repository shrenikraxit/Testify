document.addEventListener('DOMContentLoaded', loadSubjectsinLibrary(1))


//Code for opening the file content in another tab
function openFile(filename) {
    console.log("openFile", filename);
    if (filename) {
        // Make a GET request to the Flask server to fetch the file
        const fileUrl = `/get_file/${filename}`;

        // Open the file in a new tab
        window.open(fileUrl, '_blank');
    }
}
//
async function get_test_stat() {
    const Data = await fetchUserTests();
    // Check if Data is empty or undefined/null
    if (Data && Data.length > 0) {
        console.log("Num of User Tests:", Data.length);

        const userId = Data[0].user_id; // Populate userId
        return Data;
    }
    // Return 0 if Data is empty or undefined
    return 0;
}


// Load subjects and topics dynamically from the backend
async function loadSubjectsinLibrary(activeindex) {
    var stat_data;
    try {
        if (typeof stat_data === 'undefined') {
            console.log('No performance stat for the user!');
        } else {

        }
        if (!stat_data) {
            stat_data = await get_test_stat();
            console.log("Stat Data", stat_data);
        }

        const response = await fetch('/get_subjects_and_topics');
        if (response.ok) {
            const subjects = await response.json();
            console.log("Response json", subjects);
            const subjectTabs = document.getElementById('subjectTabs');
            const subjectTabsContent = document.getElementById('subjectTabsContent');

            // Clear existing content
            subjectTabs.innerHTML = '';
            subjectTabsContent.innerHTML = '';
            var AverageScoreForSubject, scoreDisplay;
            // Iterate through each subject and create a tab and content pane
            subjects.forEach((subject) => {
                // Determine if this subject should be active based on activeindex
                console.log("Active Tab Index: ", activeindex);
                const isActive = subject.id === activeindex;
                //$Calculate the average score for the subject
                if (stat_data != 0) {
                    AverageScoreForSubject = calculateAverageScoreForSubject(stat_data, subject.id);
                }
                if (isNaN(AverageScoreForSubject)) {
                    scoreDisplay = 'No test taken';  // Show this text if no valid score
                } else {
                    scoreDisplay = `${AverageScoreForSubject}%`;  // Show the percentage if the score is valid
                }
                console.log("scoreDisplay", scoreDisplay);
                // Create a new tab for the subject
                const tabItem = document.createElement('li');
                tabItem.className = 'nav-item';
                tabItem.innerHTML = `
                           <a class="nav-link ${isActive ? 'active' : ''}" id="${subject.name}-tab" data-toggle="tab" href="#${subject.name}" role="tab">
                               ${subject.name}
                           </a>
                       `;
                subjectTabs.appendChild(tabItem);
                //console.log("tab created for", subject.name);
                // Create a new tab pane for the subject
                const tabPane = document.createElement('div');
                tabPane.className = `tab-pane fade ${isActive ? 'show active' : ''}`;
                tabPane.id = subject.name;
                tabPane.innerHTML = `
                <div class="topic-section">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4>${subject.name} Topics</h4>
                        <!-- Progress bar for average score -->
                        <div class="progress-container">
                            <strong>${scoreDisplay}</strong>
                            <div class="progress">
                                <div class="progress-bar" role="progressbar" style="width: ${AverageScoreForSubject}%;" aria-valuenow="${AverageScoreForSubject}" aria-valuemin="0" aria-valuemax="100"></div>
                            </div>
                        </div>
                        <button class="btn btn-primary add-topic-btn" data-subject-id="${subject.id}" onclick="openAddTopicModal(${subject.id})">Add Topic</button>
                    </div>
                    <div id="${subject.name}Topics" class="topics-container">
                        <!-- Topics will be loaded here -->
                    </div>
                </div>
                `;
                subjectTabsContent.appendChild(tabPane);
                //console.log("Before loading the topics...");
                // Load topics for each subject
                loadTopics(subject.name, subject.id, subject.topics, stat_data);
            });

            // Add a + button to add new subjects
            const addTabButton = document.createElement('li');
            addTabButton.className = 'nav-item';
            addTabButton.innerHTML = `
                       <button class="add-subject-btn" data-toggle="modal" data-target="#addSubjectModal" onclick="openAddSubjectModal()">+</button>
                   `;
            subjectTabs.appendChild(addTabButton);
        } else {
            console.error('Failed to load subjects:', response.statusText);
        }
    } catch (error) {
        console.error('Error occurred while loading subjects:', error);
    }
}

// Helper function to truncate file names if too long
function truncateFileName(fileName) {
    const maxLength = 15;
    if (fileName.length > maxLength) {
        return fileName.substring(0, maxLength) + '...';
    }
    return fileName;
}

// Function to load topics for a specific subject
function loadTopics(subjectName, subjectid, topics, testData) {
    const topicContainer = document.getElementById(`${subjectName}Topics`);
    if (!topicContainer) return;
    topicContainer.innerHTML = '';
    var AverageScoreForTopic, scoreClass;

    topics.forEach(topic => {
        const topicCard = document.createElement('div');
        topicCard.className = 'topic-card';

        if (testData != 0) {
            // Calculate the average score for this topic
            AverageScoreForTopic = calculateAverageScoreForTopic(testData, topic.id);
        }
        if (isNaN(AverageScoreForTopic)) {
            scoreDisplay = 'No test taken';  // Show this text if no valid score
        } else {
            scoreDisplay = `${AverageScoreForTopic}%`;  // Show the percentage if the score is valid
            // Check if AverageScoreForTopic is a number and apply color-coding logic
            scoreClass = isNaN(AverageScoreForTopic) ? 'na' : AverageScoreForTopic < 60 ? 'low' : AverageScoreForTopic < 80 ? 'medium' : 'high';
        }

        let materialsHTML = '';

        // Add text documents (only if array exists and is not empty)
        if (topic.txt_documents && topic.txt_documents.length > 0) {
            topic.txt_documents.forEach(doc => {
                materialsHTML += `
                    <div class="material-item">
                        <i class="fas fa-file-alt"></i>
                        <a class="file-link" datafilename="${doc.filename}" target="_blank" onclick="openFile('${doc.filename}')">${truncateFileName(doc.title)}</a>
                    </div>
                `;
            });
        }

        // Add PDF documents (only if array exists and is not empty)
        if (topic.pdf_documents && topic.pdf_documents.length > 0) {
            topic.pdf_documents.forEach(doc => {
                materialsHTML += `
                    <div class="material-item">
                        <i class="fas fa-file-pdf"></i>
                        <a class="file-link" datafilename="${doc.filename}" target="_blank" onclick="openFile('${doc.filename}')">${truncateFileName(doc.title)}</a>
                    </div>
                `;
            });
        }

        // Add YouTube videos (only if array exists and is not empty)
        if (topic.youtube_links && topic.youtube_links.length > 0) {
            topic.youtube_links.forEach(video => {
                materialsHTML += `
                    <div class="material-item">
                        <i class="fab fa-youtube"></i>
                        <a class="file-link" href="${video.url}" datafilename="${video.filename}" target="_blank">${truncateFileName(video.url)}</a>
                    </div>
                `;
            });
        }

        // Check if there are no materials to show
        if (materialsHTML === '') {
            materialsHTML = '<p>No materials available for this topic.</p>';
        }

        // Create the topic card content
        topicCard.innerHTML = `
        <div class="topic-header">
            <strong>${topic.name}</strong>
            <span class="average-score ${scoreClass}">[ ${scoreDisplay} ]</span>
        </div>
        <p>${topic.description || 'No description provided.'}</p>
        
        <!-- Delete button positioned in the top-right corner -->
        <button class="btn delete-topic-btn" onclick="deleteTopic(${topic.id})">
            <i class="fas fa-times"></i>
        </button>
        <br/>
        <div class="d-flex align-items-center">
            <b>Study Materials:</b>
            <!-- Upload icon with an onclick function -->
            <i class="fas fa-upload ml-2 upload-icon" onclick="openUploadModal(${subjectid},'${subjectName}', ${topic.id},'${topic.name}')" title="Upload Study Materials"></i>
        </div>
        <div class="materials-container">
            ${materialsHTML}
        </div>
        `;

        topicCard.dataset.topicId = topic.id;
        topicCard.dataset.description = topic.description || '';
        topicContainer.appendChild(topicCard);
    });
}


//calculate the average score for a subject
function calculateAverageScoreForSubject(testData, subjectId) {
    // Filter out the tests that match the given subject ID
    const testsForSubject = testData.filter(test => test.subject_id === subjectId);

    // If there are no tests for the given subject, return a message
    if (testsForSubject.length === 0) {
        return `No tests taken`;
    }

    // Calculate the total score and the total max score for the subject
    const totalScore = testsForSubject.reduce((sum, test) => sum + test.score, 0);
    const totalMaxScore = testsForSubject.reduce((sum, test) => sum + test.maxscore, 0);

    // Calculate the average score as a percentage
    const averagePercentage = Math.round((totalScore / totalMaxScore) * 100);

    // Return the average percentage score
    return averagePercentage;
}

//calculate the average score for the topic
function calculateAverageScoreForTopic(testData, topicId) {
    // Filter out the tests that match the given topic ID
    const testsForTopic = testData.filter(test => test.topic_id === topicId);

    // If there are no tests for the given topic, return a message
    if (testsForTopic.length === 0) {
        return `No tests taken`;
    }

    // Calculate the total score and the total max score for the topic
    const totalScore = testsForTopic.reduce((sum, test) => sum + test.score, 0);
    const totalMaxScore = testsForTopic.reduce((sum, test) => sum + test.maxscore, 0);

    // Calculate the average score as a percentage
    const averagePercentage = Math.round((totalScore / totalMaxScore) * 100);

    // Return the average percentage score
    return averagePercentage;
}


// Open the modal to add a new subject
function openAddSubjectModal() {
    $('#addSubjectModal').modal('show');
}

// Open the modal to add a new topic for a specific subject
function openAddTopicModal(subjectId) {
    document.getElementById('currentSubjectId').value = subjectId;
    $('#addTopicModal').modal('show');
}

// Add a new subject
async function addNewSubject() {
    const subjectName = document.getElementById('newSubjectName').value.trim();
    if (!subjectName) return;

    const response = await fetch('/add_subject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: subjectName })
    });
    $('#addSubjectModal').modal('hide');
    if (response.ok) {
        const result = await response.json();
        loadSubjectsinLibrary(result.subject_id); // Reload subjects
    } else {
        console.error('Failed to add subject:', response.statusText);
    }
}

// Add a new topic
async function addNewTopic() {
    const topicName = document.getElementById('newTopicName').value.trim();
    const topicDescription = document.getElementById('newTopicDescription').value.trim();
    const subjectId = document.getElementById('currentSubjectId').value;

    if (!topicName || !subjectId) return;

    const response = await fetch('/add_topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_id: subjectId, name: topicName, description: topicDescription })
    });

    if (response.ok) {
        $('#addTopicModal').modal('hide');
        const result = await response.json();
        loadSubjectsinLibrary(result.subject_id); // Reload subjects
    } else {
        console.error('Failed to add topic:', response.statusText);
    }
}

function deleteTopic(topicId) {
    if (confirm("Are you sure you want to delete this topic and all associated materials?")) {
        $.ajax({
            url: `/delete_topic/${topicId}`,
            type: 'DELETE',
            success: function (response) {
                // Remove the topic card from the DOM
                $(`.topic-card[data-topic-id='${topicId}']`).remove();
                alert(response.message);
            },
            error: function (xhr) {
                alert('Error deleting topic: ' + xhr.responseText);
            }
        });
    }
}


