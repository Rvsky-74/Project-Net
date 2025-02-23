import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// 📌 Sign in with Google
async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log("Google Sign-In Success:", user.displayName);

  } catch (error) {
    console.error("Google Sign-In Error:", error);
  }
}
// 📌 Log out user
async function logout() {
  try {
    await signOut(auth);
    console.log("User logged out");
  } catch (error) {
    console.error("Logout Error:", error);
  }
}
function login(){
  const log_button = document.getElementById("log");
  const user = auth.currentUser;
  
  if (user){ 
    logout();
  }
  else{
    loginWithGoogle();
  }
}


// 📌 Save user data to Firestore
async function saveUserData(extraData = {}) {
  const user = auth.currentUser;
  const text = document.getElementById("Canvas_Text");

  if (!user) {
    text.innerText = "Please Log in before saving"
    return;
  }

  // save relevant info for the nodes
  const node_save_list = [];
  const node_list = document.querySelectorAll(".node");
  node_list.forEach((n) => {
    const conn = n.connections;
    const connection_list = [];
    conn.forEach(c => {
      print(c.name);
      connection_list.push(c.name);
    });
    const n_info = {name:n.name, x:n.getBoundingClientRect().left, y:n.getBoundingClientRect().top, state:n.state, connections:connection_list};
    node_save_list.push(n_info);
  });

  //update database
  const userRef = doc(db, "users", user.uid);
  const userData = {
    firstName: extraData.firstName || user.displayName || "Unknown",
    email: user.email,
    lastLogin: new Date().toISOString(),
    node_info: node_save_list
  };

  await setDoc(userRef, userData, { merge: true });
  text.innerText = "Data Saved";
}


// 📌 Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  const log_button = document.getElementById("log");
  
  if (user) {
    console.log("User is logged in:", user);
    log_button.innerText = "Logout";

    const photoURL = user.photoURL;
    const img = document.getElementById("profile-pic");
    img.src = photoURL;

    img.onerror = function() {
      img.src = 'no-user.png'; // Fallback image
    };

  } else {
    console.log("No user is logged in");
    log_button.innerText = "Login";

    const img = document.getElementById("profile-pic");
    img.src = 'no-user.png';

    delete_all();
  }
});


async function load(){
  const user = auth.currentUser; // Get the currently logged-in user
  const text = document.getElementById("Canvas_Text");

  if (!user) {
    text.innerText = "Please Log in before loading";
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const node_info = userData.node_info || [];

      // Clear existing nodes
      delete_all();

      // Recreate nodes from stored data
      node_info.forEach(n_info => {
        createNode(n_info.name, n_info.x, n_info.y, n_info.state);
      });
      node_info.forEach(n_info => {
        const parent = nodes.find(n => n.name === n_info.name); 
        n_info.connections.forEach(name =>{
          const child = nodes.find(n => n.name === name); //find the node with the name we are looking for
          create_arrow(parent, child);
          parent.connections.push(child);
        }); 
      });

      text.innerText = "Data Loaded";
    } else {
      text.innerText = "No saved data found";
    }
  } catch (error) {
    console.error("Error loading user data:", error);
    text.innerText = "Error loading data";
  }
} 


// Expose functions to the window
window.saveUserData = saveUserData;
window.login = login;
window.load = load;
