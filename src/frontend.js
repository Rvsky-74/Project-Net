import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, updateDoc} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

import {delete_all, add_node, update_colors} from "./extras.js"
import {globals} from "./variables.js"

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


//  Sign in with Google
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
//  Log out user
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


// Save the node net to a save slot
export async function saveNodeData(slot_number, slot_name) {
  const user = auth.currentUser;
  const text = document.getElementById("Canvas_Text");


  // save relevant info for the nodes
  const node_save_list = [];
  const node_list = document.querySelectorAll(".node");

  node_list.forEach((n) => {
    const conn = n.connections || [];
    const connection_list = conn.map(c => c.name);
   
    node_save_list.push({
      name: n.name, 
      x: n.getBoundingClientRect().left, 
      y: n.getBoundingClientRect().top, 
      state: n.state, 
      connections: connection_list
    });
  });

  // Save to subcollection: users/{uid}/saves/{saveSlot}
  const userRef = doc(db, "users", user.uid, "saves", String(slot_number));
  const userData = {
    name: slot_name,
    node_info: node_save_list
  };

  await setDoc(userRef, userData, { merge: true }); // merge: True means it wont rewrite other entries, which isnt relevant for now since these are the only 2 things in each save file
  text.innerText = "Data Saved";
}


// Save the node net to a save slot
async function saveUserData() {
  const user = auth.currentUser;
  if (!user) {
    print("saveUserData was called incorrectly")
    return;
  }

  // Save general user data to subcollection: users/{uid}
  const userRef = doc(db, "users", user.uid);
  const userData = {
    firstName: user.displayName || "Unknown",
    email: user.email,
    lastLogin: new Date().toISOString(),
  };

  await setDoc(userRef, userData, { merge: true });
}



// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  const log_button = document.getElementById("log");
  
  if (user) {
    console.log("User is logged in:", user);
    log_button.innerText = "Logout";

    const photoURL = user.photoURL;
    const img = document.getElementById("profile-pic");
    img.src = photoURL;

    img.onerror = function() {
      img.src = 'no-user.png'; // Fallback image in case we cant get the user's profile pic
    };

    saveUserData(); // Save general data and update last login date on the database

  } else {
    console.log("No user is logged in");
    log_button.innerText = "Login";

    const img = document.getElementById("profile-pic");
    img.src = 'no-user.png';
    
    delete_all();
  }   
});   


export async function load(saveSlot){
  const user = auth.currentUser; // Get the currently logged-in user
  const text = document.getElementById("Canvas_Text");


  try {
    // Load from users/{uid}/saves/{saveSlot}
    const userRef = doc(db, "users", user.uid, "saves", String(saveSlot));
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const node_info = userData.node_info || [];

      // Clear existing nodes
      delete_all();

      // Recreate nodes from stored data
      node_info.forEach(n_info => {
        add_node(n_info.x, n_info.y, n_info.name, n_info.state);
      });
      // Now that all nodes are present, we can assign their connnections
      node_info.forEach(n_info => {
        const parent = globals.nodes.find(n => n.name === n_info.name); 
        n_info.connections.forEach(name =>{
          const child = globals.nodes.find(n => n.name === name); 
          create_arrow(parent, child);
          parent.connections.push(child);
        }); 
      });
      globals.nodes.forEach(n => update_colors(n, n.state, n.state));

      text.innerText = globals.current_save_file;
    } else {
      text.innerText = "No saved data found";
    }
  } catch (error) {
    console.error("Error loading user data:", error);
    text.innerText = "Error loading data";
  }
} 



export async function fetch_save_files(){
  const user = auth.currentUser;
  if (!user) {
    print("Please login before saving/loading data")
    return;
  }

  const ref =  collection(db, "users", user.uid, "saves")
  const snapshot = await getDocs(ref);

  const save_files = snapshot.docs.map(doc => [doc.id, doc.data().name])
  return save_files
}


export async function modify_save_file(sf_num, new_name){
  // Change the name of a save file. If no name is given, delete the file instead
  
  const user = auth.currentUser; // Get the currently logged-in user
  const userRef = doc(db, "users", user.uid, "saves", String(sf_num)); // Get the save file in question
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()){
    print("Something went wrong, this file number doesnt exist")
    return
  }
  
  if (new_name.length == 0){
    await deleteDoc(userRef)
    // If a save file was deleted, update the numbers of the ones after it
    let next_num = parseInt(sf_num,10) + 1
    while (true){
        const oldRef = doc(db, "users", user.uid, "saves", String(next_num)); 
        const oldSnap = await getDoc(oldRef);

        if (oldSnap.exists()){
          const new_location = doc(db, "users", user.uid, "saves", String(next_num-1));
          await setDoc(new_location, oldSnap.data())
          await deleteDoc(oldRef) 
        }
        else return 

        next_num += 1
      }
  }


  else {
    await updateDoc(userRef, {name: new_name})
  }    
}


