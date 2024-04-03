document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault(); // Prevent the default form submission

    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;

    if (!username || !password) {
        alert('Username and password are required.');
        return;
    }
    
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        if (result.success) {
            window.location.href = '/index.html'; // Redirect to the chat page on successful registration
        } else {
            alert('Registration failed: ' + result.message); // Display error message
        }
    } catch (error) {
        console.error('An error occurred:', error);
    }
});
