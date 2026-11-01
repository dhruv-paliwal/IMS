"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/utils/api";

export default function Login() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      if (isLogin) {
        // OAuth2 expects form data for token endpoint
        const formData = new FormData();
        formData.append("username", username);
        formData.append("password", password);
        
        const res = await api.post("/token", formData, {
           headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        localStorage.setItem("token", res.data.access_token);
        router.push("/");
      } else {
        // Register endpoint expects JSON
        await api.post("/register", { username, password });
        // Automatically log them in after registering
        const formData = new FormData();
        formData.append("username", username);
        formData.append("password", password);
        const res = await api.post("/token", formData);
        localStorage.setItem("token", res.data.access_token);
        router.push("/");
      }
    } catch (err: any) {
       setError(err.response?.data?.detail || "Authentication failed. Please try again.");
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-ivory">
      {/* Left Side - Art/Illustration */}
      <div className="hidden lg:flex w-1/2 bg-saffron relative overflow-hidden items-center justify-center">
        {/* Placeholder for Indian Art Illustration */}
        <div className="absolute inset-0 bg-gradient-to-br from-terracotta to-saffron mix-blend-multiply opacity-80"></div>
        
        {/* A simple geometric representation of traditional motifs using CSS */}
        <div className="relative z-10 text-white text-center px-12">
           <div className="w-32 h-32 mx-auto mb-8 border-4 border-white/30 rounded-full flex items-center justify-center p-4">
              <div className="w-full h-full bg-white/20 rounded-full rotate-45 flex items-center justify-center">
                 <div className="w-1/2 h-1/2 bg-white rounded-full"></div>
              </div>
           </div>
           <h1 className="text-5xl font-bold font-display mb-4">Inventory AI</h1>
           <p className="text-xl opacity-90">Intelligent Inventory Management for the Modern Indian Enterprise.</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24">
        <div className="w-full max-w-md">
           <h2 className="text-3xl font-bold text-indigo mb-2 font-display">
             {isLogin ? "Welcome Back" : "Create Account"}
           </h2>
           <p className="text-indigo/60 mb-8">
             {isLogin ? "Please enter your details to sign in." : "Sign up to start managing your inventory smarter."}
           </p>

           <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="p-3 bg-red-100 text-red-600 rounded text-sm font-bold">{error}</div>}
              <div>
                 <label className="block text-sm font-medium text-indigo mb-1">Username</label>
                 <input 
                   type="text" 
                   required
                   value={username}
                   onChange={e => setUsername(e.target.value)}
                   className="w-full px-4 py-3 rounded-lg border border-indigo/20 bg-white focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors"
                   placeholder="Enter your username"
                 />
              </div>
              <div>
                 <label className="block text-sm font-medium text-indigo mb-1">Password</label>
                 <input 
                   type="password" 
                   required
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                   className="w-full px-4 py-3 rounded-lg border border-indigo/20 bg-white focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors"
                   placeholder="Enter your password"
                 />
              </div>
              
              <button 
                type="submit" 
                className="w-full bg-terracotta text-white py-3 rounded-lg font-bold hover:bg-saffron transition-colors shadow-md hover:shadow-lg"
              >
                {isLogin ? "Sign In" : "Register"}
              </button>
           </form>

           <div className="mt-8 text-center">
             <p className="text-indigo/60 text-sm">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button 
                  onClick={() => setIsLogin(!isLogin)} 
                  className="ml-2 font-bold text-terracotta hover:underline focus:outline-none"
                >
                  {isLogin ? "Sign Up" : "Sign In"}
                </button>
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
