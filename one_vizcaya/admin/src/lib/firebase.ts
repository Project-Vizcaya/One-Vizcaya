import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBcRDu74Y7CRkvIXFokK-cO07_nMk62fp8',
  authDomain: 'one-vizcaya-app.firebaseapp.com',
  projectId: 'one-vizcaya-app',
  storageBucket: 'one-vizcaya-app.firebasestorage.app',
  messagingSenderId: '899155311025',
  appId: '1:899155311025:web:39a0ba252222d089dee590',
  measurementId: 'G-ERSX5CDK5M',
}

export const app  = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db   = getFirestore(app)

export const MAPS_API_KEY = 'AIzaSyCcKuCdQDdl6pxlLTFy88wTpEfjj2rwikI'
export const NV_CENTER = { lat: 16.45, lng: 121.17 }
export const NV_ZOOM   = 10
export const APP_VERSION = '2.0.0'
