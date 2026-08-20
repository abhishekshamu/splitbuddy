"use client";

import { useEffect, useState } from "react";
import { Loader2, ServerCrash, RefreshCw } from "lucide-react";
import { CONFIG } from "../config";

export default function BootCheck({ children }) {
  const [status, setStatus] = useState("checking"); // checking, ready, error
  const [retryCount, setRetryCount] = useState(0);
  const [errorDetails, setErrorDetails] = useState(null);

  const maxRetries = 3;
  const retryDelays = [1000, 2000, 5000]; // 1s, 2s, 5s

  const checkHealth = async () => {
    setStatus("checking");
    const baseUrl = CONFIG.API_URL;
    
    if (!baseUrl) {
      setStatus("error");
      setErrorDetails("API configuration missing (CONFIG.API_URL).");
      return;
    }

    try {
      const healthUrl = baseUrl.replace(/\/api\/?$/, '') + '/api/health';
      console.log(`🟡 Checking backend health at ${healthUrl}...`);
      
      const res = await fetch(healthUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      
      if (res.ok) {
        console.log("🟢 Backend is online and ready!");
        setStatus("ready");
        return;
      }
      throw new Error(`HTTP Error ${res.status}`);
    } catch (err) {
      console.error(`🔴 Health check failed (Attempt ${retryCount + 1}):`, err);
      
      if (retryCount < maxRetries) {
        const delay = retryDelays[retryCount] || 5000;
        console.log(`🟡 Retrying in ${delay / 1000}s...`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, delay);
      } else {
        setStatus("error");
        setErrorDetails("Could not connect to the backend server. It may be offline, starting up, or blocked by CORS.");
      }
    }
  };

  useEffect(() => {
    if (status !== "ready" && status !== "error") {
      checkHealth();
    }
  }, [retryCount]);

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-6" />
        <h2 className="text-2xl font-bold mb-2">Connecting to SplitBuddy...</h2>
        <p className="text-gray-400">
          {retryCount > 0 ? `Retrying (Attempt ${retryCount}/${maxRetries})...` : 'Verifying backend connection...'}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white p-4 text-center">
        <div className="bg-red-500/10 p-6 rounded-2xl max-w-md border border-red-500/20">
          <ServerCrash className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-3 text-red-400">Backend Unavailable</h2>
          <p className="text-gray-300 mb-6 text-sm">
            {errorDetails}
          </p>
          <button 
            onClick={() => {
              setRetryCount(0);
              setStatus("checking");
            }}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
