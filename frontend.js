import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";



// Initialize Firebase (Make sure Firebase is initialized before using functions)
const firebaseConfig = {
  apiKey: "FIREBASE_API_KEY_PLACEHOLDER",
  authDomain: "FIREBASE_AUTH_DOMAIN_PLACEHOLDER",
  projectId: "FIREBASE_PROJECT_ID_PLACEHOLDER",
  storageBucket: "FIREBASE_STORAGE_BUCKET_PLACEHOLDER",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID_PLACEHOLDER",
  appId: "FIREBASE_APP_ID_PLACEHOLDER"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

// Example: Write a value to a Firestore collection
async function writeToFirestore() {
  try {
    // Define the collection and document reference
    const docRef = doc(collection(db, "users"), "user123");

    // Set data in Firestore (this will overwrite the document if it already exists)
    await setDoc(docRef, {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      age: 30,
    });

    console.log("Document written successfully!");
  } catch (error) {
    console.error("Error writing document: ", error);
  }
}
