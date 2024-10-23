// Fetch subjects and populate the subject dropdown  ($working 1007)
// used in the upload.html and createTest.html page
async function loadSubjects() {
    try {
        const response = await fetch('/get_subjects'); // Replace with actual API endpoint
        if (response.ok) {
            console.log("Debug:", response.subjects); //Removing this line gives a TypeError: Cannot set properties of null (setting 'innerHTML')
            const subjects = await response.json();
            console.log(subjects)
            const subjectDropdown = document.getElementById('subjectDropdown');
            if (subjectDropdown) {
                subjectDropdown.innerHTML = '<option value="" disabled selected>Subject</option>';
            } else {
                console.error('Element with id "subjectDropdown" not found.');
            }
            console.log("Debug: subject:", subjects);
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.id;
                option.text = subject.name;
                subjectDropdown.appendChild(option);
            });
        } else {
            console.error('Failed to load subjects:', response.statusText);
        }
    } catch (error) {
        console.error('Error occurred while loading subjects:', error);
    }
}

// Fetch topics based on selected subject and populate the topics dropdown ($working 1007)
// used in the upload.html and createTest.html page
async function loadTopics(subjectId) {
    try {
        const response = await fetch(`/get_topics/${subjectId}`); // Replace with actual API endpoint
        if (response.ok) {
            const topics = await response.json();
            console.log("Topics", topics);
            const topicDropdown = document.getElementById('topicDropdown');
            topicDropdown.innerHTML = '<option value="" disabled selected>Topic</option>'; // Reset options
            topicDropdown.disabled = false; // Enable the topic dropdown

            topics.forEach(topic => {
                console.log("Topic:", topic);
                const option = document.createElement('option');
                option.value = topic.id;
                option.text = topic.name;
                topicDropdown.appendChild(option);
            });
        } else {
            console.error('Failed to load topics:', response.statusText);
        }
    } catch (error) {
        console.error('Error occurred while loading topics:', error);
    }
}

// Attach event listeners to checkboxes to enable/disable corresponding sliders
// used in the createTest.html page
function attachCheckboxListeners() {
    const checkboxes = document.querySelectorAll('.test-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const slider = this.nextElementSibling.nextElementSibling;
            slider.disabled = !this.checked; // Enable or disable the slider based on the checkbox state
        });
    });

    // Attach event listeners to sliders to display their values
    const sliders = document.querySelectorAll('.question-slider');
    sliders.forEach(slider => {
        slider.addEventListener('input', function () {
            const valueDisplay = this.nextElementSibling;
            valueDisplay.textContent = this.value;
        });
    });
}

// Function to load content dynamically based on the selected menu item
function loadPage(page, menuItem) {
    console.log(`Loading page: ${page}`);  // Debug: Print which page is being loaded

    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));

    // Set active class for the selected menu item
    menuItem.classList.add('active');

    // Use the Flask route to load the content
    $('#content').load(page, function (response, status, xhr) {
        if (status === "error") {
            console.error(`Error loading page ${page}: ${xhr.status} - ${xhr.statusText}`);
            $('#content').html(`<div class="alert alert-danger">Error loading page: ${xhr.status} - ${xhr.statusText}</div>`);
        } else {
            switch (page) {
                case "/upload":
                    // Load subjects and topics dynamically (these would come from an API call)
                    loadSubjects();
                case "/createTest":
                    // Load subjects and topics dynamically (these would come from an API call)
                    loadSubjects();
                    // Attach event listeners to checkboxes and sliders
                    attachCheckboxListeners();
                default:
                    console.log("Debug: other page");

            }
            console.log(`Page ${page} loaded successfully.`);
        }
    });
}
// Function to handle sign-out (placeholder for actual sign-out functionality)
function signOut() {
    console.log("Sign-out clicked.");
    alert("Signing out...");

    // Redirect to a sign-out page or remove user session data here
}

// Load the default page (dashboard) on initial page load
$(document).ready(function () {
    console.log("Document ready. Loading default page: /dashboard");
    loadPage('/dashboard', document.querySelector('.menu-item.active'));
});