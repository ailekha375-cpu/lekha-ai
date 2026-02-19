import { auth } from './firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'

export function signUp(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
}

export function signIn(email: string, password: string){
    return signInWithEmailAndPassword(auth, email, password);
}

export function logOut(){
    return signOut(auth);
}