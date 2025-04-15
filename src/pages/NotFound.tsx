
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MoveLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const [isDebugMode, setIsDebugMode] = useState(false);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-4xl font-bold text-flyingbus-blue mb-4" style={{ textWrap: "balance" }}>
              Page Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="gap-2">
                <Link to="/">
                  <MoveLeft size={16} />
                  Back to Home
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setIsDebugMode(!isDebugMode)}
              >
                {isDebugMode ? "Hide" : "Show"} Debug Info
              </Button>
            </div>
            
            {isDebugMode && (
              <div className="mt-6 text-left bg-gray-50 p-4 rounded-md overflow-auto">
                <h3 className="font-medium mb-2 text-sm">Debug Information:</h3>
                <p className="text-xs text-gray-600 mb-1">
                  <span className="font-mono">Attempted URL: </span> 
                  <span className="bg-gray-200 px-1 rounded">{location.pathname}</span>
                </p>
                <p className="text-xs text-gray-600">
                  <span className="font-mono">Full location: </span>
                  <span className="bg-gray-200 px-1 rounded text-wrap break-all">
                    {JSON.stringify(location, null, 2)}
                  </span>
                </p>
                <p className="text-xs text-red-500 mt-2">
                  If you recently uploaded SVG files to the public folder, make sure:
                </p>
                <ul className="text-xs text-red-500 list-disc list-inside pl-2">
                  <li>The SVG filenames don't contain spaces or special characters</li>
                  <li>The path in your code correctly matches the uploaded files</li>
                  <li>You're properly importing the SVG files in your components</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
