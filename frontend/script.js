
// script.js

console.log("script.js loaded");

// Utility Functions
const showLoading = (show = true) => {
    const loader = document.getElementById('loadingIndicator');
    if (loader) loader.style.display = show ? 'block' : 'none';
};

const handleApiError = (error, defaultMessage = 'An error occurred') => {
    console.error('API Error:', error);
    alert(error.message || defaultMessage);
    return null;
};

// Auth Functions
const handleSignup = async (event) => {
    event.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.getElementById('signupRole').value;

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    showLoading();
    try {
        const response = await fetch('http://localhost:3000/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role }),
        });

        if (response.ok) {
            alert('Signup successful! Redirecting to login.');
            window.location.href = 'login.html';
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Signup failed');
        }
    } catch (error) {
        handleApiError(error, 'Signup failed. Please try again.');
    } finally {
        showLoading(false);
    }
};

const handleLogin = async (event) => {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;

    showLoading();
    try {
        const response = await fetch('http://localhost:3000/users');
        const users = await response.json();

        const user = users.find(u => u.email === email && u.password === password && u.role === role);

        if (user) {
            localStorage.setItem('userId', user.id);
            localStorage.setItem('userRole', user.role);
            window.location.href = `${role}-dashboard.html`;
        } else {
            throw new Error('Invalid credentials');
        }
    } catch (error) {
        handleApiError(error, 'Login failed. Please try again.');
    } finally {
        showLoading(false);
    }
};

// Profile Management
const updateProfile = async (type, userId, data) => {
    showLoading();
    try {
        const response = await fetch(`http://localhost:3000/${type}s`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, ...data }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Profile update failed');
        }
        return true;
    } catch (error) {
        handleApiError(error, 'Failed to update profile');
        return false;
    } finally {
        showLoading(false);
    }
};

// Connection Management
const getConnections = async (userId) => {
    showLoading();
    try {
        const response = await fetch(`http://localhost:3000/connections/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch connections');
        return await response.json();
    } catch (error) {
        handleApiError(error);
        return [];
    } finally {
        showLoading(false);
    }
};

const updateConnection = async (connectionId, status, zoomLink = null) => {
    showLoading();
    try {
        const body = { status };
        if (zoomLink) {
            body.zoomLink = zoomLink;
        }

        const response = await fetch(`http://localhost:3000/connections/${connectionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update connection');
        }
        return true;
    } catch (error) {
        handleApiError(error);
        return false;
    } finally {
        showLoading(false);
    }
};

// Message Handling
const sendMessage = async (senderId, receiverId, message) => {
    showLoading();
    try {
        const response = await fetch('http://localhost:3000/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senderId, receiverId, message }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to send message');
        }
        return true;
    } catch (error) {
        handleApiError(error);
        return false;
    } finally {
        showLoading(false);
    }
};

const getMessages = async (userId, recipientId) => {
    showLoading();
    try {
        const response = await fetch(`http://localhost:3000/messages/${userId}/${recipientId}`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        return await response.json();
    } catch (error) {
        handleApiError(error);
        return [];
    } finally {
        showLoading(false);
    }
};

// Dashboard Functions
const initMentorDashboard = async () => {
    const userId = localStorage.getItem('userId');

    const displaySkills = async () => {
        showLoading();
        try {
            const response = await fetch(`http://localhost:3000/mentors/${userId}`);
            const skillsArray = await response.json();
            console.log("Received skills:", skillsArray);
            const skillsElement = document.getElementById('currentSkills');
            skillsElement.innerHTML = skillsArray && skillsArray.length > 0
                ? `<p>Your skills: ${skillsArray.join(', ')}</p>`
                : '<p>No skills added yet.</p>';
        } catch (error) {
            handleApiError(error, 'Failed to load skills');
        } finally {
            showLoading(false);
        }

    };

    const displayConnections = async () => {
        const connections = await getConnections(userId);

        // Pending connections
        const pendingConnections = connections.filter(conn =>
            conn.status === 'pending' && conn.mentor_id === parseInt(userId));
        const pendingList = document.getElementById('pendingConnectionsList');
        pendingList.innerHTML = pendingConnections.length > 0
            ? pendingConnections.map(conn => `
                    <div>
                        <p>Mentee ID: ${conn.mentee_id}</p>
                        <button onclick="acceptConnection(${conn.id})">Accept</button>
                        <button onclick="updateConnection(${conn.id}, 'rejected')">Reject</button>
                    </div>`
            ).join('')
            : '<p>No pending connections.</p>';

        // Accepted connections
        const acceptedConnections = connections.filter(conn =>
            conn.status === 'accepted' && conn.mentor_id === parseInt(userId));
        const acceptedList = document.getElementById('acceptedConnectionsList');
        acceptedList.innerHTML = acceptedConnections.length > 0
            ? acceptedConnections.map(conn => `
                    <div>
                        <p>Mentee ID: ${conn.mentee_id}</p>
                        ${conn.zoom_link ? `<p><a href="${conn.zoom_link}" target="_blank">Video Link</a></p>` : ''}
                        <button onclick="updateZoomLink(${conn.id})">Add/Update Video Link</button>
                        <a href="messages.html?recipient=${conn.mentee_id}">Message</a>
                    </div>`
            ).join('')
            : '<p>No accepted connections.</p>';
    };

    // Initialize dashboard
    await displaySkills();
    await displayConnections();

    // Profile update form
    document.getElementById('mentorProfileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const skills = document.getElementById('mentorSkills').value;
        const success = await updateProfile('mentor', userId, { skills });
        if (success) await displaySkills();
    });
};

const initMenteeDashboard = async () => {
    const userId = localStorage.getItem('userId');

    const displayGoals = async () => {
        showLoading();
        try {
            const response = await fetch(`http://localhost:3000/mentees/${userId}`);
            const goals = await response.json();
            document.getElementById('currentGoals').innerHTML = goals
                ? `<p>Your goals: ${goals}</p>`
                : '<p>No goals added yet.</p>';
        } catch (error) {
            handleApiError(error, 'Failed to load goals');
        } finally {
            showLoading(false);
        }
    };

    const displayMentors = async () => {
        showLoading();
        try {
            const response = await fetch(`http://localhost:3000/mentors/matching/${userId}`);
            const mentors = await response.json();

            // Get existing connections to filter out requested mentors
            const connections = await getConnections(userId);
            const requestedMentors = connections
                .filter(conn => conn.mentee_id === parseInt(userId))
                .map(conn => conn.mentor_id);

            const filteredMentors = mentors.filter(mentor => !requestedMentors.includes(mentor.id));

            const mentorsList = document.getElementById('availableMentorsList');
            mentorsList.innerHTML = filteredMentors.map(mentor => `
                    <div>
                        <p>Name: ${mentor.name}</p>
                        <button onclick="sendConnectionRequest(${mentor.id})">Connect</button>
                    </div>`
            ).join('');
        } catch (error) {
            handleApiError(error, 'Failed to load mentors');
        } finally {
            showLoading(false);
        }
    };

    const displayConnections = async () => {
        const connections = await getConnections(userId);
        const acceptedConnections = connections.filter(conn =>
            conn.status === 'accepted' && conn.mentee_id === parseInt(userId));
        const acceptedList = document.getElementById('acceptedConnectionsList');
        acceptedList.innerHTML = acceptedConnections.length > 0
            ? acceptedConnections.map(conn => `
                    <div>
                        <p>Mentor ID: ${conn.mentor_id}</p>
                        ${conn.zoom_link ? `<p><a href="${conn.zoom_link}" target="_blank">Video Link</a></p>` : ''}
                        <a href="messages.html?recipient=${conn.mentor_id}">Message</a>
                    </div>`
            ).join('')
            : '<p>No accepted connections.</p>';
    };

    // Initialize dashboard
    await displayGoals();
    await displayMentors();
    await displayConnections();

    // Profile update form
    document.getElementById('menteeProfileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const goals = document.getElementById('menteeGoals').value;
        const success = await updateProfile('mentee', userId, { goals });
        if (success) await displayGoals();
    });
};

// Connection request function (needs to be global)
window.sendConnectionRequest = async (mentorId) => {
    const menteeId = localStorage.getItem('userId');
    showLoading();
    try {
        const response = await fetch('http://localhost:3000/connections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mentorId, menteeId }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to send connection request');
        }
        alert('Connection request sent.');
    } catch (error) {
        handleApiError(error);
    } finally {
        showLoading(false);
    }
};

window.acceptConnection = async (connectionId) => {
    const success = await updateConnection(connectionId, 'accepted');
    if (success) {
        await initMentorDashboard();
    }
};

window.updateZoomLink = async (connectionId) => {
    const zoomLink = prompt("Enter or update the Zoom link:");
    if (zoomLink) {
        const success = await updateConnection(connectionId, 'accepted', zoomLink);
        if (success) {
            await initMentorDashboard();
        }
    } else {
        alert("Zoom link is required.");
    }
};

// Initialize WebSocket for messaging
const initMessaging = () => {
    const userId = localStorage.getItem('userId');
    const recipientId = new URLSearchParams(window.location.search).get('recipient');
    const messagesList = document.getElementById('messagesList');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    const socket = new WebSocket(`ws://localhost:3000/?userId=${userId}`);

    socket.onopen = async () => {
        console.log('WebSocket connection established');
        const messages = await getMessages(userId, recipientId);
        messages.forEach(msg => displayMessage(msg));
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        displayMessage(message);
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        alert('WebSocket connection error. Please try again later.');
    };

    const displayMessage = (message) => {
        const messageDiv = document.createElement('div');
        const sender = message.sender_id === localStorage.getItem('userId') ? 'You' : message.sender_id;

        // Format the timestamp
        const timestamp = new Date(message.timestamp).toLocaleTimeString();

        messageDiv.textContent = `${sender} (${timestamp}): ${message.message}`;
        messageDiv.classList.add(message.sender_id === localStorage.getItem('userId') ? 'sent' : 'received');

        document.getElementById('messagesList').appendChild(messageDiv);
        document.getElementById('messagesList').scrollTop = document.getElementById('messagesList').scrollHeight;
    };

    sendButton.addEventListener('click', () => {
        const text = messageInput.value.trim();
        if (text) {
            socket.send(JSON.stringify({ senderId: userId, receiverId: recipientId, text }));
            messageInput.value = '';
        }
    });
};

// Main Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired");

    // Auth forms
    document.getElementById('signupForm')?.addEventListener('submit', handleSignup);
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);

    // Initialize appropriate dashboard
    if (window.location.pathname.includes('mentor-dashboard.html')) {
        initMentorDashboard();
    } else if (window.location.pathname.includes('mentee-dashboard.html')) {
        initMenteeDashboard();
    } else if (window.location.pathname.includes('messages.html')) {
        initMessaging();
    }
});