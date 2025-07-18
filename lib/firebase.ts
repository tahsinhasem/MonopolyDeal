import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyARlc_dPzcVcPUp46HABco125pMK-J6EZ0",
  authDomain: "monopoly-deal-aabd7.firebaseapp.com",
  projectId: "monopoly-deal-aabd7",
  storageBucket: "monopoly-deal-aabd7.firebasestorage.app",
  messagingSenderId: "189216148771",
  appId: "1:189216148771:web:ef661090d1f4428de45096",
  measurementId: "G-XTVJ7LLSM3",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
