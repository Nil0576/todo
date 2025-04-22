// Firebase Config
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase App Config (replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyDW0kotXcUTyWf-XpvG4wDeEX-8euvCY3M",
  authDomain: "to-do-e4fc2.firebaseapp.com",
  projectId: "to-do-e4fc2",
  storageBucket: "to-do-e4fc2.firebasestorage.app",
  messagingSenderId: "613208522123",
  appId: "1:613208522123:web:f6dd4b0b259cdb038b438e",
  measurementId: "G-V6KP95H4PL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

const inputBox = document.getElementById("input_box");
const addButton = document.getElementById("add");
const listContainer = document.getElementById("list-container");
const signoutBtn = document.getElementById("signoutbtn");

// Helper to format date
function getDueTag(dueDate) {
  const today = new Date();
  const date = new Date(dueDate);
  const diff = (date - today) / (1000 * 60 * 60 * 24);

  if (Math.floor(diff) === 0) return "Today";
  if (Math.floor(diff) === 1) return "Tomorrow";
  return null;
}

// Add Task
async function addTask(userId, taskText, dueDate) {
  if (taskText === "") return alert("Please enter a task");

  await addDoc(collection(db, "tasks"), {
    userId: userId,
    task: taskText,
    dueDate: dueDate,
    timestamp: new Date()
  });

  inputBox.value = "";
  loadTasks(userId);
}

// Load Tasks
async function loadTasks(userId) {
  listContainer.innerHTML = "";
  const q = query(collection(db, "tasks"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach((docSnap) => {
    const task = docSnap.data();
    const li = document.createElement("li");

    // Highlight task if due today
    const dueTag = getDueTag(task.dueDate);
    if (dueTag === "Today") li.classList.add("highlight-today");

    li.innerHTML = `
      <span>${task.task}</span>
      ${dueTag ? `<span class="due-tag">${dueTag}</span>` : ""}
      <span class="delete-btn">&times;</span>
    `;

    // Delete task handler
    li.querySelector(".delete-btn").addEventListener("click", async () => {
      await deleteDoc(doc(db, "tasks", docSnap.id));
      loadTasks(userId);
    });

    listContainer.appendChild(li);
  });
}

// Check auth and initialize
onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;

    // Load tasks for user
    loadTasks(uid);

    // Add task
    addButton.addEventListener("click", () => {
      const dueDate = prompt("Enter due date (YYYY-MM-DD):");
      if (!dueDate) return alert("Task needs a due date!");
      addTask(uid, inputBox.value, dueDate);
    });

    // Sign out
    signoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => {
          alert("Signed out successfully");
          window.location.href = "index.html";
        })
        .catch((error) => {
          console.error("Sign out error", error);
        });
    });
  } else {
    window.location.href = "index.html"; // redirect if not logged in
  }
});
