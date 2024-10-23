function showSpinner() {
    document.getElementById('spinner-modal').style.display = 'flex'; // Show the modal
}

function hideSpinner() {
    document.getElementById('spinner-modal').style.display = 'none'; // Hide the modal
}

// Count characters in plain text tab  ($working 1007)
document.getElementById('plainTextInput').addEventListener('input', function () {
    const characterCount = this.value.length;
    document.getElementById('characterCount').innerText = `${characterCount} characters`;
});


// Event listener for file input change event ($working 1007)
document.getElementById('pdfFileInput').addEventListener('change', handlePDFFileSelect);
document.getElementById('notesFileInput').addEventListener('change', handlenotesFileSelect);


// Event listener for drag and drop events ($working 1007)
//let pdfUploadArea = document.getElementById('pdfUploadArea');
//pdfUploadArea.addEventListener('dragover', handleDragOver);
document.getElementById('pdfUploadArea').addEventListener('dragover', handleDragOver);
//pdfUploadArea.addEventListener('drop', handleFileDrop);
document.getElementById('pdfUploadArea').addEventListener('drop', handleFileDrop);

// Function to handle file selection via input field ($working 1007)
function handlePDFFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        displayPDFFile(file);
    }
}

function handlenotesFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        displaynotesFile(file);
    }
}

// Function to handle drag and drop file event ($working 1007)
function handleFileDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
        document.getElementById('pdfFileInput').files = event.dataTransfer.files; // Set the file input value
        displayPDFFile(file); // Display the file information
    }
}

// Function to display the selected PDF file name and hide instructions ($working 1007)
function displayPDFFile(file) {
    const filePreview = document.getElementById('pdfFilePreview');
    if (file && file.type === 'application/pdf') {
        //filePreview.textContent = `Selected File: ${file.name}`;
        filePreview.innerHTML = `<i class="fas fa-file-pdf pdficon"></i>  ${file.name}`;
    } else {
        filePreview.innerHTML = ""; // Clear the preview if not a valid PDF
        alert('Please select a valid PDF file.');
    }
    // Hide the instruction paragraph
    const uploadInstructions = document.getElementById('uploadPDFInstructions');
    if (uploadInstructions) {
        uploadInstructions.style.display = 'none';  // Hide the paragraph
    }
}

// Function to display the selected notes file name and hide instructions ($working 1007)
function displaynotesFile(file) {
    const filePreview = document.getElementById('notesFilePreview');
    if (file && file.type.startsWith('image/')) {
        //filePreview.textContent = `Selected File: ${file.name}`;
        filePreview.innerHTML = `<i class="fas fa-pen-square notesicon"></i> ${file.name}`;
    } else {
        filePreview.innerHTML = ""; // Clear the preview if not a valid PDF
        alert('Please select a valid notes file.');
    }
    // Hide the instruction paragraph
    const uploadInstructions = document.getElementById('uploadnotesInstructions');
    if (uploadInstructions) {
        uploadInstructions.style.display = 'none';  // Hide the paragraph
    }
}

// Prevent default behavior for dragover event ($working 1007)
function handleDragOver(event) {
    event.preventDefault();
}

// Click to select the pdf file ($working 1007)
pdfFileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        console.log(`PDF file selected 1: ${e.target.files[0].name}`);
        const filePreview = document.getElementById('pdfFilePreview');
        //filePreview.textContent = `Selected File: ${e.target.files[0].name}`;

        filePreview.innerHTML = `<i class="fas fa-file-pdf pdficon"></i>  ${e.target.files[0].name}`;
    } else {
        filePreview.innerHTML = ""; // Clear the preview if not a valid PDF
    }

    // Hide the instruction paragraph
    const uploadInstructions = document.getElementById('uploadPDFInstructions');
    if (uploadInstructions) {
        uploadInstructions.style.display = 'none';  // Hide the paragraph
    }
});

// Click to select the notes image file ($working 1007)
notesFileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        console.log(`Notes file selected 1: ${e.target.files[0].name}`);
        const filePreview = document.getElementById('notesFilePreview');
        //filePreview.textContent = `Selected File: ${e.target.files[0].name}`;

        filePreview.innerHTML = `<i class="fas fa-pen-square notesicon" ></i>  ${e.target.files[0].name}`;
    } else {
        filePreview.innerHTML = ""; // Clear the preview if not a valid image
    }

    // Hide the instruction paragraph
    const uploadInstructions = document.getElementById('uploadnotesInstructions');
    if (uploadInstructions) {
        uploadInstructions.style.display = 'none';  // Hide the paragraph
    }
});


// Upload PDF to the backend API ($working 1007)
async function uploadPDF(subjectId, topicId) {
    const title = document.getElementById('plainPDFTitle').value.trim();
    console.log("Tile: ", title);
    const pdfFile = document.getElementById('pdfFileInput').files[0];
    if (!pdfFile) return alert('Please select a PDF file.');

    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('title', title); // Attach the title
    formData.append('subject_id', subjectId); // Attach the subject ID
    formData.append('topic_id', topicId);     // Attach the topic ID
    //console.log("Debug: uploading pdf", files[0].name);
    try {
        const response = await fetch('/upload_pdf', {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            alert('PDF uploaded successfully!');
            pdfFilePreview.textContent = ""
            // SHow the instruction paragraph
            const uploadInstructions = document.getElementById('uploadInstructions');
            if (uploadInstructions) {
                uploadInstructions.style.display = 'block';  // Hide the paragraph
            }

        } else {
            alert('Failed to upload PDF.');
        }
    } catch (error) {
        console.error('Error uploading PDF:', error);
    }
}

// Upload Plain Text to the backend API
async function uploadPlainText(subjectId, topicId) {
    const title = document.getElementById('plainTextTitle').value.trim();
    const text = document.getElementById('plainTextInput').value.trim();
    if (!text) return alert('Please enter some text.');

    try {
        const response = await fetch('/upload_text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, text, subjectId, topicId })
        });
        if (response.ok) {
            alert('Text uploaded successfully!');
            //reset the textbox
            document.getElementById('plainTextInput').value = "";
        } else {
            alert('Failed to upload text.');
        }
    } catch (error) {
        console.error('Error uploading text:', error);
    }
}

//Upload handwritten notes to the backend API
async function uploadHandwrittenNotes(subjectId, topicId) {
    const title = document.getElementById('plainNotesTitle').value.trim();
    const notes = document.getElementById('notesFileInput').files[0];

    if (!notes) return alert('Please select a handwritten notes(image).');

    const formData = new FormData();
    formData.append('imgfile', notes);
    formData.append('title', title); // Attach the title
    formData.append('subject_id', subjectId); // Attach the subject ID
    formData.append('topic_id', topicId);     // Attach the topic ID

    //console.log("Debug: uploading pdf", files[0].name);
    try {
        const response = await fetch('/upload_handwrittenNotes', {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            alert('Notes uploaded successfully!');
            notesFilePreview.textContent = ""
            // SHow the instruction paragraph
            const uploadInstructions = document.getElementById('uploadnotesInstructions');
            if (uploadInstructions) {
                uploadInstructions.style.display = 'block';  // Hide the paragraph
            }

        } else {
            alert('Failed to upload notes.');
        }
    } catch (error) {
        console.error('Error uploading notes:', error);
    }


}

// Upload YouTube Video Link to the backend API
async function uploadYouTubeVideo(subjectId, topicId) {
    const youtubeLink = document.getElementById('youtubeInput').value.trim();
    console.log("YT Lnk:", youtubeLink);
    if (!youtubeLink) return alert('Please enter a YouTube video link.');

    try {
        const response = await fetch('/upload_youtubeVideo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: youtubeLink, subjectId, topicId })
        });
        if (response.ok) {
            alert('YouTube video uploaded successfully!');
        } else {
            alert('Failed to upload YouTube video.');
        }
    } catch (error) {
        console.error('Error uploading YouTube video:', error);
    }
}

//Open Upload modal
function openUploadModal(subjectID, subName, topicID, topName) {
    $('#uploadModal').modal('show');
    console.log("Sub: ", subjectID, "Topic: ", topicID);
    $('#subjectID').text(`${subjectID}`);
    $('#topicID').text(`${topicID}`);

    $('#uploadModalLabel').text("Upload Study Material [" + `${subName}` + "-" + `${topName}` + "]");
    //$('#subject_topic_Name').text(`${subName}` + "-" + `${topName}`);
}

// Handle Add to Library Button Click Event ($working 1009)
document.getElementById('addToApplicationBtn').addEventListener('click', async function () {
    // Retrieve subjectID and topicID from the main page
    const selectedSubject = document.querySelector('#subjectID').textContent;
    const selectedTopic = document.querySelector('#topicID').textContent;

    // Ensure subject and topic are selected before proceeding
    if (!selectedSubject) return alert('Please select a subject.');
    if (!selectedTopic) return alert('Please select a topic.');

    // Determine the active tab in the modal
    const activeTabId = document.querySelector('#uploadModal .nav-link.active').id;
    $('#spinnerModal').modal('show');
    try {
        switch (activeTabId) {
            case 'plain-text-tab':
                await uploadPlainText(selectedSubject, selectedTopic);
                break;
            case 'pdf-tab':
                await uploadPDF(selectedSubject, selectedTopic);
                break;
            case 'notes-tab':
                await uploadHandwrittenNotes(selectedSubject, selectedTopic);
                break;
            case 'youtube-tab':
                await uploadYouTubeVideo(selectedSubject, selectedTopic);
                break;
            default:
                console.error('Unknown tab selected');
        }
    } catch (error) {
        console.error('Error during upload:', error);
        alert('Failed to upload study material.');
    } finally {
        $('#spinnerModal').modal('hide');
    }
});


