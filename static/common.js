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

