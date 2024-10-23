//load the page
$(document).ready(async function () {
    // Initialize the charts with db server data for the logged in user
    const Data = await fetchUserTests();

    if (Data && Data.length > 0) {
        console.log("Num of User Tests:", Data);
        userId = Data[0].user_id;
        populateTopCards(Data, userId);
        showBestAndWorstSubjects(Data, userId);
        drawSubjectBarChart(Data, userId);
        //drawPolarAreaChart(Data, userId);
    } else {
        console.log("Failed to fetch user tests.");
    }
});



function populateTopCards(data, userId) {
    // Filter data for the given userId
    const allData = data.filter(test => test.user_id === userId);

    // Calculate average score percentage and total tests
    const totalTests = allData.length;
    const averageScore = totalTests > 0
        ? (allData.reduce((sum, test) => sum + (test.score / test.maxscore) * 100, 0) / totalTests)
        : 0;

    // Determine the color based on the average score
    let avgScoreColor = getColorByScore(averageScore);

    // Find the card and populate the avg score with color coding
    const avgScore = document.getElementById('averageScore');
    avgScore.innerHTML = `${Math.round(averageScore)}%`;
    avgScore.style.color = avgScoreColor; // Set the color

    // Populate the total tests
    const ttlTests = document.getElementById('totalTests');
    ttlTests.innerHTML = `${totalTests}`;
}

function showBestAndWorstSubjects(data, userId) {
    // Group data by subject_id and calculate average score
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

    // Calculate the average score for each subject
    const subjectScores = Object.keys(subjects).map(subjectId => {
        const subject = subjects[subjectId];
        return {
            subject_name: subject.subject_name,
            avgScore: (subject.totalScore / subject.totalMaxScore) * 100
        };
    });

    // Sort subjects by average score to find the best and worst
    subjectScores.sort((a, b) => b.avgScore - a.avgScore);

    // The best subject is the one with the highest average score
    const bestSubject = subjectScores[0];

    // The worst subject is the one with the lowest average score
    const worstSubject = subjectScores[subjectScores.length - 1];

    // Determine colors for best and worst subjects
    let bestSubjectColor = getColorByScore(bestSubject.avgScore);
    let worstSubjectColor = getColorByScore(worstSubject.avgScore);

    // Update the HTML with the best and worst subjects and apply color coding
    const bestSubjectElement = document.getElementById("bestSubject");
    bestSubjectElement.innerText = `${bestSubject.subject_name} [${Math.round(bestSubject.avgScore)}%]`;
    bestSubjectElement.style.color = bestSubjectColor; // Set the color

    const worstSubjectElement = document.getElementById("worstSubject");
    worstSubjectElement.innerText = `${worstSubject.subject_name} [${Math.round(worstSubject.avgScore)}%]`;
    worstSubjectElement.style.color = worstSubjectColor; // Set the color
}

// Helper function to return color based on the score
function getColorByScore(score) {
    if (score >= 80) {
        return 'green'; // Green for scores >= 80%
    } else if (score >= 60 && score < 80) {
        return 'orange'; // Amber for scores between 60% and 80%
    } else {
        return 'red'; // Red for scores < 60%
    }
}



// Functions to render charts
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

    // Determine the background color for each bar based on the score
    const backgroundColors = scores.map(score => {
        if (score >= 80) {
            return 'rgba(0, 200, 0, 0.6)';  // Green for scores >= 80%
        } else if (score >= 60 && score < 80) {
            return 'rgba(255, 165, 0, 0.6)';  // Amber for scores between 60% and 80%
        } else {
            return 'rgba(255, 0, 0, 0.6)';  // Red for scores < 60%
        }
    });

    // Render bar chart using Chart.js
    const ctx = document.getElementById("subjectBarChart").getContext("2d");
    let delayed;
    const barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Average Score (%)",
                    data: scores,
                    backgroundColor: "rgba(255, 255, 255, 0.6)",
                    borderWidth: 2,
                    borderRadius: Number.MAX_VALUE,
                    borderSkipped: false,
                    borderColor: backgroundColors,
                    datalabels: {
                        display: true,
                        align: 'end',
                        anchor: 'end',
                        formatter: (value) => `${value}%`,
                        color: '#000',
                        font: {
                            weight: 'bold',
                            size: 16
                        }
                    }
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: true,
                    position: 'left',
                    ticks: {
                        font: {
                            size: 14  // Increased font size for axis labels
                        }
                    },
                    grid: {
                        drawOnChartArea: true, // only want the grid lines for one axis to show up
                    },
                }
            },
            onClick: (e) => {
                const activePoints = barChart.getElementsAtEventForMode(e, 'nearest', {
                    intersect: true
                }, false);
                if (activePoints.length > 0) {
                    const index = activePoints[0].index;
                    const subject = barChart.data.labels[index];
                    //drawTopicBarChart(data, userId, subject);
                    drawTopicPolarChart(data, userId, subject);

                }
            },
            animation: {
                onComplete: () => {
                    delayed = true;
                },
                delay: (context) => {
                    let delay = 0;
                    if (context.type === 'data' && context.mode === 'default' && !delayed) {
                        delay = context.dataIndex * 750 + context.datasetIndex * 250;
                    }
                    return delay;
                },
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Average Score',
                    color: 'black',
                    font: {
                        size: 20,
                        family: 'tahoma',
                        weight: 'Bold'
                    }
                },
                legend: {
                    display: false
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

// Function to dynamically render another chart based on the clicked subject name
function drawTopicPolarChart(data, userId, subjectName) {
    // Get the container where the canvas will go
    const container = document.getElementById('topicChartContainer');

    // Remove the old canvas if it exists
    if (document.getElementById('topicPolarChart')) {
        document.getElementById('topicPolarChart').remove();
    }

    // Create a new canvas element
    const newCanvas = document.createElement('canvas');
    newCanvas.id = 'topicPolarChart'; // Assign a unique id to the new canvas
    container.appendChild(newCanvas); // Append the new canvas to the container

    // Now, your chart code to draw on this new canvas
    const topics = {};
    data.forEach(test => {
        if (test.user_id === userId && test.subject_name === subjectName) {
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

    // Generate dynamic colors for each segment
    const backgroundColors = scores.map(score => {
        if (score >= 80) {
            return 'rgba(0, 200, 0, 0.6)';  // Green for scores >= 80%
        } else if (score >= 60 && score < 80) {
            return 'rgba(255, 165, 0, 0.6)';  // Amber for scores between 60% and 80%
        } else {
            return 'rgba(255, 0, 0, 0.6)';  // Red for scores < 60%
        }
    });

    // Render the new topic chart on the newly created canvas
    const ctx = document.getElementById('topicPolarChart').getContext('2d');
    new Chart(ctx, {
        type: 'polarArea', // Change the chart type to 'polarArea'
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Average Score (%)",
                    data: scores,
                    backgroundColor: backgroundColors, // Use dynamic background colors
                    datalabels: {
                        display: true,
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
            responsive: true,
            plugins: {
                datalabels: {
                    // Show data labels for polar chart
                },
                legend: {
                    position: 'right',
                    labels: {
                        color: 'black'
                    }
                }
            },
            scales: {
                r: {
                    ticks: {
                        beginAtZero: true
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}





