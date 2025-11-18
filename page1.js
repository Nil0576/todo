import { firebaseConfig } from "./config.js";

// --- FIX 1: Safe Initialization ---
// Check if Firebase is already running before starting it to prevent crashes.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); 
}

const auth = firebase.auth();
const db = firebase.firestore();

// DOM elements
const signoutBtn = document.querySelector("#signoutbtn");
const inputBox = document.querySelector("#input_box");
const dueDateInput = document.querySelector("#due_date_input");
const listContainer = document.querySelector("#list-container");
const addBtn = document.querySelector("#add");

// Auth state
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("User is logged in:", user.uid);
    displayTasksInUL(user);
  } else {
    console.log("User is not logged in.");
    // Optional: Redirect back to login if not logged in
    // location.href = "index.html";
  }
});

// Add task
addBtn.addEventListener("click", () => {
  if (inputBox.value === "" || dueDateInput.value === "") {
    alert("Please enter a task and select a due date!");
  } else {
    const taskText = inputBox.value.trim();
    const dueDate = new Date(dueDateInput.value);
    if (taskText) {
      addTaskToFirestore(taskText, dueDate);
      inputBox.value = "";
      // Keep the date picker populated or clear it? Clearing it:
      dueDateInput.value = ""; 
    }
  }
});

function addTaskToFirestore(taskText, dueDate) {
  const user = auth.currentUser;
  if (user) {
    const userId = user.uid;
    const tasksRef = db.collection("users").doc(userId).collection("tasks");
    tasksRef
      .add({
        text: taskText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        dueDate: firebase.firestore.Timestamp.fromDate(dueDate),
      })
      .then(() => {
        console.log("Task added to Firestore");
      })
      .catch((error) => {
        alert("Error adding task: " + error.message);
      });
  } else {
    alert("You must be logged in to add tasks.");
  }
}

// Display tasks
function displayTasksInUL(user) {
  const userId = user.uid;
  const tasksRef = db.collection("users").doc(userId).collection("tasks");
  
  // Order by due date so the list looks organized
  tasksRef.orderBy("dueDate", "asc").onSnapshot((snapshot) => {
    const ul = listContainer;
    ul.innerHTML = "";
    
    if(snapshot.empty) {
        console.log("No tasks found in database for this user.");
    }

    snapshot.forEach((doc) => {
      const taskData = doc.data();
      const li = document.createElement("li");
      const createdAt = taskData.timestamp?.toDate();
      const now = new Date();
      let createdMsg = "Just now";

      if (createdAt) {
        const minsAgo = Math.floor((now - createdAt) / 60000);
        createdMsg = `Created ${minsAgo} min(s) ago`;
      }

      // Handle date formatting safely
      let dueString = "";
      if(taskData.dueDate) {
          dueString = taskData.dueDate.toDate().toLocaleString();
      }

      li.innerHTML = `
        <strong>${taskData.text}</strong><br>
        <small>${createdMsg}</small><br>
        <small>Due: ${dueString}</small>
      `;
      li.setAttribute("data-task-id", doc.id);
      const span = document.createElement("span");
      span.innerHTML = "\u00d7";
      li.appendChild(span);
      ul.appendChild(li);
    });
  }, (error) => {
      // This will catch Permission errors or Quota errors
      console.error("Error loading tasks:", error);
      alert("Error loading list: " + error.message);
  });
}

// Delete task
listContainer.addEventListener("click", function (e) {
  if (e.target.tagName === "LI") {
    e.target.classList.toggle("checked");
  } else if (e.target.tagName === "SPAN") {
    const taskId = e.target.parentElement.getAttribute("data-task-id");
    if (taskId) {
      removeTaskFromFirestore(taskId);
    }
  }
});

function removeTaskFromFirestore(taskId) {
  const user = auth.currentUser;
  if (user) {
    const userId = user.uid;
    db.collection("users").doc(userId).collection("tasks").doc(taskId).delete()
      .then(() => console.log("Task removed"))
      .catch((error) => console.error("Error removing task:", error));
  }
}

function showNotification(message) {
  const notif = document.createElement("div");
  notif.textContent = message;
  // ... (Styling is handled in CSS mostly, keeping your inline styles here)
  notif.style.position = "fixed";
  notif.style.bottom = "20px";
  notif.style.right = "20px";
  notif.style.background = "#28a745";
  notif.style.color = "#fff";
  notif.style.padding = "15px 20px";
  notif.style.borderRadius = "5px";
  notif.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";
  notif.style.zIndex = "9999";
  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.opacity = "0";
    setTimeout(() => notif.remove(), 500);
  }, 5000); // changed 50000 to 5000 (5 seconds)
}

function checkUpcomingTasks() {
  const user = auth.currentUser;
  if (!user) return;
  
  const userId = user.uid;
  const now = new Date();
  
  db.collection("users").doc(userId).collection("tasks").get().then(snapshot => {
    snapshot.forEach(doc => {
      const task = doc.data();
      const due = task.dueDate?.toDate();
      if (due) {
        const minutesLeft = (due - now) / 60000;
        if (minutesLeft > 0 && minutesLeft <= 10) {
          showNotification(`⏰ "${task.text}" is due in ${Math.ceil(minutesLeft)} minute(s)!`);
        }
      }
    });
  });
}

// --- FIX 2: The Timer ---
// Changed 60 (milliseconds) to 60000 (1 minute)
setInterval(checkUpcomingTasks, 60000); 

// Sign out
signoutBtn.addEventListener("click", () => {
  auth.signOut()
    .then(() => {
      location.href = "index.html";
    })
    .catch((error) => {
      alert("Error signing out: " + error.message);
    });
});
