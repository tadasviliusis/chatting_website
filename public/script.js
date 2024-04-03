// script.js
document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    const chatArea = document.getElementById('chatArea');
    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('messageInput');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const loggedInUserSpan = document.getElementById('loggedInUser');
    const loginRegisterLinks = document.getElementById('loginRegisterLinks');

    // Fetch session data and update the UI
    fetch('/session')
      .then(response => response.json())
      .then(data => {
        if (data.isLoggedIn) {
          usernameDisplay.textContent = data.username;
          loggedInUserSpan.style.display = 'block';
          loginRegisterLinks.style.display = 'none';
        } else {
          window.location.href = '/login.html'; // Redirect to login
        }
      })
      .catch(error => {
        console.error('Error fetching session data:', error);
      });

    sendButton.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) {
            socket.emit('sendMessage', { name: usernameDisplay.textContent, message });
            messageInput.value = '';
        }
    });

    socket.on('receiveMessage', (data) => {
        chatArea.innerHTML += `<p><strong>${data.name}:</strong> ${data.message}</p>`;
        chatArea.scrollTop = chatArea.scrollHeight;
    });
});
