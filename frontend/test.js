// test.js
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('mentorProfileForm');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            console.log('Form submitted!');
            const skills = document.getElementById('mentorSkills').value;
            const userId = localStorage.getItem('userId');
            console.log('Skills:', skills);
            console.log('User ID:', userId);
        });
    } else {
        console.log('Form not found.');
    }
});

console.log("test.js loaded");