//load the page
$(document).ready(async function () {
    // Initialize the charts with db server data for the logged in user
    const Data = await fetchUserTests();

    if (Data) {
        console.log("Num of User Tests:", Data);
        userId = Data[0].user_id;
        drawAllGauge(Data, userId);
        //drawSubjectGauge(Data, userId, 101);
        //drawTopicGauge(Data, userId, 101, 201);
        drawSubjectBarChart(Data, userId);
        drawTopicBarChart(Data, userId, 101);
        drawPolarAreaChart(Data, userId);
        highlightLowSubjects(Data, userId, 70); // Threshold set to 70%
        getTotalTestsForUser(Data, userId);
    } else {
        console.log("Failed to fetch user tests.");
    }
});


//get the data from the server
async function fetchUserTests() {
    try {
        const response = await fetch('/get_tests', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include cookies for authentication
        });

        if (!response.ok) {
            // Handle HTTP errors
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            // Handle API errors
            console.error("API Error:", data.error);
            return null;
        }

        if (data.message) {
            // Handle the case where no tests are found
            console.log(data.message);
            return [];
        }

        // Return the list of tests
        return data;

    } catch (error) {
        // Handle other errors (network issues, etc.)
        console.error("An error occurred while fetching tests:", error);
        return null;
    }
}

// Example: Mock function to list low-performing subjects
function highlightLowSubjects(data, userId, threshold) {
    const lowSubjectsList = document.getElementById("lowSubjectsList");
    lowSubjectsList.innerHTML = "Subjects below threshold will be displayed here.";
}

// Example: Mock function to display total tests taken
function getTotalTestsForUser(data, userId) {
    const totalTests = data.filter(test => test.user_id === userId).length;
    document.getElementById("totalTests").innerText = totalTests;
}

// Functions to render charts
function drawAllGauge(data, userId) {
    // Filter data for the given userId and subjectId
    const allData = data.filter(test => test.user_id === userId);

    // Calculate average score percentage and total tests
    const totalTests = allData.length;
    const averageScore = totalTests > 0
        ? (allData.reduce((sum, test) => sum + (test.score / test.maxscore) * 100, 0) / totalTests)
        : 0;

    // Render gauge using JustGage
    new JustGage({
        id: "allGauge",
        value: averageScore,
        min: 0,
        max: 100,
        title: "Average Score (%)",
        label: "Tests Taken: " + totalTests,
        gaugeWidthScale: 0.75
    });
}

// Functions to render charts
function drawSubjectGauge(data, userId, subjectId) {
    // Filter data for the given userId and subjectId
    const subjectData = data.filter(test => test.user_id === userId && test.subject_id === subjectId);

    // Calculate average score percentage and total tests
    const totalTests = subjectData.length;
    const averageScore = totalTests > 0
        ? (subjectData.reduce((sum, test) => sum + (test.score / test.maxscore) * 100, 0) / totalTests)
        : 0;

    // Render gauge using JustGage
    new JustGage({
        id: "subjectGauge",
        value: averageScore,
        min: 0,
        max: 100,
        title: "Average Score (%)",
        label: "Tests Taken: " + totalTests,
        gaugeWidthScale: 1
    });
}

function drawTopicGauge(data, userId, subjectId, topicId) {
    // Filter data for the given userId, subjectId, and topicId
    const topicData = data.filter(test => test.user_id === userId && test.subject_id === subjectId && test.topic_id === topicId);

    // Calculate average score percentage and total tests
    const totalTests = topicData.length;
    const averageScore = totalTests > 0
        ? (topicData.reduce((sum, test) => sum + (test.score / test.maxscore) * 100, 0) / totalTests)
        : 0;

    // Render gauge using JustGage
    new JustGage({
        id: "topicGauge",
        value: averageScore,
        min: 0,
        max: 100,
        title: "Average Score (%)",
        label: "Tests Taken: " + totalTests,
        gaugeWidthScale: 0.6
    });
}

function drawSubjectBarChart(data, userId) {
    // Group data by subject_id and subject_name
    const subjects = {};
    data.forEach(test => {
        if (test.user_id === userId) {
            if (!subjects[test.subject_id]) {
                subjects[test.subject_id] = {
                    subject_name: test.subject_name,
                    totalScore: 0,
                    totalMaxScore: 0,
                    count: 0,
                    subject_id: test.subject_id
                };
            }
            subjects[test.subject_id].totalScore += test.score;
            subjects[test.subject_id].totalMaxScore += test.maxscore;
            subjects[test.subject_id].count += 1;
        }
    });

    // Prepare data for chart
    const labels = Object.keys(subjects).map(subjectId => subjects[subjectId].subject_name);
    const scores = Object.keys(subjects).map(subjectId =>
        Math.round((subjects[subjectId].totalScore / subjects[subjectId].totalMaxScore) * 100)
    );
    const testCounts = Object.keys(subjects).map(subjectId => subjects[subjectId].count);
    const subjectIds = Object.keys(subjects).map(subjectId => subjects[subjectId].subject_id);

    // Render bar chart using Chart.js
    const ctx = document.getElementById("subjectBarChart").getContext("2d");
    const barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Average Score (%)",
                    data: scores,
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                    datalabels: {
                        display: true,
                        align: 'end',
                        anchor: 'end',
                        formatter: (value) => `${value}%`,
                        color: '#000',
                        font: {
                            weight: 'bold'
                        }
                    }
                },
                {
                    label: "Tests Taken",
                    data: testCounts,
                    backgroundColor: "rgba(153, 102, 255, 0.6)",
                    datalabels: {
                        align: 'end',
                        anchor: 'end',
                        color: '#000',
                        display: true // Disable data labels for Tests Taken
                    }
                }
            ]
        },
        options: {
            plugins: {
                datalabels: {
                    // The default behavior is overridden by individual dataset settings
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            onClick: (evt, item) => {
                if (item.length > 0) {
                    // Get the index of the clicked bar
                    const index = item[0].index;
                    // Get the subject ID corresponding to the clicked bar
                    const clickedSubjectId = subjectIds[index];
                    // Call a function to update or draw the topic chart based on the clicked subject
                    //drawTopicBarChart(data, userId, clickedSubjectId);
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

/*
// Function to dynamically render another chart based on the clicked subject
function drawTopicBarChart(data, userId, subjectId) {
    // Filter data for the given subject ID and group by topic
    const topics = {};
    data.forEach(test => {
        if (test.user_id === userId && test.subject_id === subjectId) {
            if (!topics[test.topic_id]) {
                topics[test.topic_id] = {
                    topic_name: test.topic_name,
                    totalScore: 0,
                    totalMaxScore: 0,
                    count: 0
                };
            }
            topics[test.topic_id].totalScore += test.score;
            topics[test.topic_id].totalMaxScore += test.maxscore;
            topics[test.topic_id].count += 1;
        }
    });

    // Prepare data for the topic chart
    const labels = Object.keys(topics).map(topicId => topics[topicId].topic_name);
    const scores = Object.keys(topics).map(topicId =>
        Math.round((topics[topicId].totalScore / topics[topicId].totalMaxScore) * 100)
    );

    // Render topic bar chart
    const ctx = document.getElementById("topicBarChart").getContext("2d");
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Average Score (%)",
                    data: scores,
                    backgroundColor: "rgba(54, 162, 235, 0.6)",
                    datalabels: {
                        display: true,
                        align: 'end',
                        anchor: 'end',
                        formatter: (value) => `${value}%`,
                        color: '#000',
                        font: {
                            weight: 'bold'
                        }
                    }
                }
            ]
        },
        options: {
            plugins: {
                datalabels: {
                    // Show data labels for topic chart
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}
*/

function drawPolarAreaChart(data, userId) {
    // Group data by subject_id and subject_name
    const subjects = {};
    data.forEach(test => {
        if (test.user_id === userId) {
            if (!subjects[test.subject_id]) {
                subjects[test.subject_id] = {
                    subject_name: test.subject_name,
                    totalScore: 0,
                    totalMaxScore: 0,
                    count: 0
                };
            }
            subjects[test.subject_id].totalScore += test.score;
            subjects[test.subject_id].totalMaxScore += test.maxscore;
            subjects[test.subject_id].count += 1;
        }
    });

    // Prepare data for the polar area chart
    const labels = Object.keys(subjects).map(subjectId => subjects[subjectId].subject_name);
    const scores = Object.keys(subjects).map(subjectId =>
        Math.round((subjects[subjectId].totalScore / subjects[subjectId].totalMaxScore) * 100)
    );

    // Render polar area chart using Chart.js
    const ctx = document.getElementById("polarAreaChart").getContext("2d");
    new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: labels,  // Use subject names as labels
            datasets: [{
                label: "Average Score (%)",
                data: scores,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)'
                ]
            }]
        },
        options: {
            scale: {
                ticks: {
                    beginAtZero: true
                }
            }
        }
    });
}


function highlightLowSubjects(data, userId, threshold) {
    // Group data by subjectId
    const subjects = {};
    data.forEach(test => {
        if (test.user_id === userId) {
            if (!subjects[test.subject_id]) {
                subjects[test.subject_id] = { totalScore: 0, totalMaxScore: 0, count: 0 };
            }
            subjects[test.subject_id].totalScore += test.score;
            subjects[test.subject_id].totalMaxScore += test.maxscore;
            subjects[test.subject_id].count += 1;
        }
    });

    // Find subjects below the threshold
    const lowSubjects = Object.keys(subjects).filter(subjectId =>
        (subjects[subjectId].totalScore / subjects[subjectId].totalMaxScore) * 100 < threshold
    );

    // Highlight these subjects on the charts or list them as needed
    console.log("Subjects below threshold:", lowSubjects);
}

function getTotalTestsForUser(data, userId) {
    const totalTests = data.filter(test => test.user_id === userId).length;
    console.log("Total Tests Taken:", totalTests);
    return totalTests;
}
