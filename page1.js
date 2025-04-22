// Import config and initialize Firebase
import { firebaseConfig } from "./config.js";
const firebaseApp = firebase.initializeApp(firebaseConfig);
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
    console.log("User is logged in:", user);
    displayTasksInUL(user);
  } else {
    console.log("User is not logged in.");
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
        console.error("Error adding task to Firestore:", error);
      });
  } else {
    console.error("User is not logged in.");
  }
}

// Display tasks
function displayTasksInUL(user) {
  if (user) {
    const userId = user.uid;
    const tasksRef = db.collection("users").doc(userId).collection("tasks");
    tasksRef.onSnapshot((snapshot) => {
      const ul = listContainer;
      ul.innerHTML = "";
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

        li.innerHTML = `
          <strong>${taskData.text}</strong><br>
          <small>${createdMsg}</small><br>
          <small>Due: ${taskData.dueDate?.toDate().toLocaleString()}</small>
        `;
        li.setAttribute("data-task-id", doc.id);
        const span = document.createElement("span");
        span.innerHTML = "\u00d7";
        li.appendChild(span);
        ul.appendChild(li);
      });
    });
  } else {
    console.error("User is not logged in.");
  }
}

// Delete task
listContainer.addEventListener("click", function (e) {
  if (e.target.tagName === "LI") {
    e.target.classList.toggle("checked");
  } else if (e.target.tagName === "SPAN") {
    const taskId = e.target.parentElement.getAttribute("data-task-id");
    if (taskId) {
      removeTaskFromFirestore(taskId);
    } else {
      console.error("TaskId is empty or undefined.");
    }
  }
});

function removeTaskFromFirestore(taskId) {
  const user = auth.currentUser;
  if (user) {
    const userId = user.uid;
    const taskRef = db.collection("users").doc(userId).collection("tasks").doc(taskId);
    taskRef.delete()
      .then(() => {
        console.log("Task removed from Firestore");
      })
      .catch((error) => {
        console.error("Error removing task from Firestore:", error);
      });
  }
}

// Custom toast-style notification
function showNotification(message) {
  const notif = document.createElement("div");
  notif.textContent = message;
  notif.style.position = "fixed";
  notif.style.bottom = "20px";
  notif.style.right = "20px";
  notif.style.background = "#28a745";
  notif.style.color = "#fff";
  notif.style.padding = "15px 20px";
  notif.style.borderRadius = "5px";
  notif.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";
  notif.style.zIndex = "9999";
  notif.style.fontSize = "16px";
  notif.style.transition = "opacity 0.5s ease";
  notif.style.opacity = "1";

  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.opacity = "0";
    setTimeout(() => notif.remove(), 500);
  }, 5000); // disappears after 5 seconds
}

// Reminder check every minute
function checkUpcomingTasks() {
  const user = auth.currentUser;
  if (!user) return;

  const userId = user.uid;
  const now = new Date();
  const tasksRef = db.collection("users").doc(userId).collection("tasks");

  tasksRef.get().then(snapshot => {
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

setInterval(checkUpcomingTasks, 60); // Every minute

// Sign out
signoutBtn.addEventListener("click", () => {
  auth.signOut()
    .then(() => {
      console.log("User signed out successfully");
      location.href = "index.html";
    })
    .catch((error) => {
      alert("Error signing out: " + error.message);
    });
});
