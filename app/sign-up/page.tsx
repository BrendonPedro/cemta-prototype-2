'use client'

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/config/Firebase/firebaseConfig";

const SignUpPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Handle successful sign-up
      console.log("Sign-up successful");
    } catch (error) {
      setError("Sign-up failed. Please try again.");
      console.error("Sign-up error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex justify-center items-center">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-white mb-6">Sign Up</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSignUp}>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-gray-300 font-bold mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-gray-300 font-bold mb-2"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors duration-300"
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;



//What's happening above:

//const handleSignUp = async (e: React.FormEvent) => {: This is the declaration of an asynchronous function named handleSignUp that takes an event parameter e of type React.FormEvent.The async keyword allows the use of the await keyword within the function to handle asynchronous operations.
// e.preventDefault();: This line prevents the default behavior of the form submission, which is to reload the page. By calling preventDefault(), we can handle the form submission programmatically.
// try {: This starts a try block, which is used to catch any errors that might occur during the sign-up process.
// await createUserWithEmailAndPassword(auth, email, password);: This line is the core of the sign-up functionality. It uses the createUserWithEmailAndPassword function from the Firebase Authentication SDK to create a new user account with the provided email and password. The auth instance is imported from the firebase_config.ts file and represents the Firebase Authentication instance for your project. The await keyword is used to wait for the asynchronous operation to complete before moving to the next line.
// console.log('Sign-up successful');: This line will be executed if the sign-up process is successful. In a real-world application, you might want to redirect the user to a different page or display a success message.
// } catch (error) {: This is the catch block, which will be executed if an error occurs during the sign-up process.
// setError('Sign-up failed. Please try again.');: This line sets the error state with a message indicating that the sign-up failed. This error message will be displayed on the page.
// console.error('Sign-up error:', error);: This line logs the error object to the console for debugging purposes.
// }: This closes the catch block.
// };: This closes the handleSignUp function.
// In summary, the handleSignUp function is an asynchronous function that handles the sign-up process using the Firebase Authentication SDK. When the form is submitted, it prevents the default behavior, and then it tries to create a new user account with the provided email and password using the createUserWithEmailAndPassword function. If the sign-up is successful, a success message is logged to the console. If an error occurs during the sign-up process, the error state is set with an error message, and the error object is logged to the console for debugging purposes.