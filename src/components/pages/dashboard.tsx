import { useEffect, useState } from "react";
import { useAuth } from "../../../supabase/auth";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, User, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "../../../supabase/supabase";
import TopNavigation from "../dashboard/layout/TopNavigation";
import Sidebar from "../dashboard/layout/Sidebar";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [profilesAnalyzed, setProfilesAnalyzed] = useState(0);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    if (user) {
      fetchUserCredits();
      fetchAnalysisHistory();
    }
  }, [user]);

  const fetchUserCredits = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("credits")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setCredits(parseInt(data.credits || "0"));
    } catch (error) {
      console.error("Error fetching credits:", error);
    }
  };

  const fetchAnalysisHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("profile_analyses")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;

      if (data) {
        setProfilesAnalyzed(data.length);
        setRecentAnalyses(data);
      }
    } catch (error) {
      console.error("Error fetching analysis history:", error);
    }
  };

  const handleQuickAnalyze = async () => {
    if (!url) {
      toast({
        title: "Missing URL",
        description: "Please enter a LinkedIn profile URL",
        variant: "destructive",
      });
      return;
    }

    if (!url.includes("linkedin.com/in/")) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid LinkedIn profile URL",
        variant: "destructive",
      });
      return;
    }

    if (!credits || credits < 1) {
      toast({
        title: "Insufficient credits",
        description: "You need at least 1 credit to analyze a profile",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // Navigate to the analyzer page with the URL as a parameter
      window.location.href = `/profile-analyzer?url=${encodeURIComponent(url)}`;
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to process your request",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  };

  // Show loading state
  if (loading || !isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />

      <div className="flex pt-16">
        <Sidebar activeItem="Dashboard" />

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">
                Welcome to LinkedIn Profile Analyzer
              </h1>
              <p className="text-gray-600">
                Analyze any LinkedIn profile with AI and get professional
                insights
              </p>
            </div>

            <div className="space-y-8">
              {/* Main Analysis Card */}
              <Card className="bg-white border-0 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                  <h2 className="text-xl font-semibold mb-2">
                    Analyze a LinkedIn Profile
                  </h2>
                  <p className="opacity-90">
                    Get AI-powered insights, strengths assessment, and
                    improvement suggestions
                  </p>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enter LinkedIn Profile URL
                      </label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://www.linkedin.com/in/username"
                          className="flex-1"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                        />
                        <Button
                          onClick={handleQuickAnalyze}
                          disabled={isAnalyzing}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>Analyze Profile</>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        Available Credits:{" "}
                        <Badge
                          variant="outline"
                          className="ml-1 bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {credits !== null ? credits : "--"}
                        </Badge>
                      </span>
                      <Link
                        to="/subscription"
                        className="text-blue-600 hover:underline"
                      >
                        Purchase more credits
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats and Recent Analyses */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Available Credits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <span className="text-3xl font-bold text-blue-600">
                        {credits !== null ? credits : "--"}
                      </span>
                      <span className="ml-2 text-gray-500">credits</span>
                    </div>
                    <Link to="/subscription">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 w-full"
                      >
                        Buy More Credits
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Profiles Analyzed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <span className="text-3xl font-bold text-indigo-600">
                        {profilesAnalyzed}
                      </span>
                      <span className="ml-2 text-gray-500">profiles</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      asChild
                    >
                      <Link to="/profile-analyzer">View Analysis History</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Subscription</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <span className="text-lg font-medium text-gray-800">
                        {credits && credits > 2 ? "Pro Plan" : "Free Plan"}
                      </span>
                      <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {credits && credits > 2
                        ? "Subscription active"
                        : "2 free credits on signup"}
                    </p>
                    <Link to="/subscription">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 w-full"
                      >
                        Manage Subscription
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Analyses */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Recent Analyses</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentAnalyses.length > 0 ? (
                    <div className="space-y-4">
                      {recentAnalyses.map((analysis, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-gray-100 rounded-md hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage
                                src={
                                  analysis.profile_picture ||
                                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${analysis.name}`
                                }
                              />
                              <AvatarFallback>
                                {analysis.name?.substring(0, 2) || "--"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {analysis.name || "LinkedIn Profile"}
                              </p>
                              <p className="text-sm text-gray-500">
                                {analysis.headline || "Analyzed profile"}
                              </p>
                            </div>
                          </div>
                          <Link to={`/profile-analyzer?id=${analysis.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600"
                            >
                              View Analysis
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <p>
                        No analyses yet. Start by analyzing a LinkedIn profile.
                      </p>
                    </div>
                  )}

                  <div className="mt-4 text-center">
                    <Link
                      to="/profile-analyzer"
                      className="text-sm text-blue-600 hover:underline inline-flex items-center"
                    >
                      View all analyses
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* How It Works */}
              <Card className="bg-white border-0 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6">
                  <h2 className="text-xl font-semibold text-gray-800">
                    How It Works
                  </h2>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                        <Search className="h-6 w-6" />
                      </div>
                      <h3 className="font-medium mb-2">
                        1. Enter LinkedIn URL
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Paste any LinkedIn profile URL into the analyzer
                      </p>
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                        <Loader2 className="h-6 w-6" />
                      </div>
                      <h3 className="font-medium mb-2">2. AI Analysis</h3>
                      <p className="text-gray-600 text-sm">
                        Our AI analyzes the profile and generates insights
                      </p>
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
                        <User className="h-6 w-6" />
                      </div>
                      <h3 className="font-medium mb-2">3. Get Results</h3>
                      <p className="text-gray-600 text-sm">
                        View strengths, suggestions, and keywords
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
