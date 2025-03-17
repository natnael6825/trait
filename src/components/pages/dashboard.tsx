import { useEffect, useState } from "react";
import { useAuth } from "../../../supabase/auth";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Search,
  User,
  ArrowRight,
  FileText,
  AlertCircle,
  Award,
  Clipboard,
  Download,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "../../../supabase/supabase";
import TopNavigation from "../dashboard/layout/TopNavigation";
import Sidebar from "../dashboard/layout/Sidebar";
import ProfileView from "../profile-analyzer/ProfileView";
import { motion } from "framer-motion";
import {
  ProfileData,
  AnalysisResult,
} from "../profile-analyzer/ProfileAnalyzer";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [profilesAnalyzed, setProfilesAnalyzed] = useState(0);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState("analysis");
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    if (user) {
      fetchUserCredits();
      fetchAnalysisHistory();

      // Check for URL or ID parameter
      const urlParams = new URLSearchParams(window.location.search);
      const linkedinUrl = urlParams.get("url");
      const analysisId = urlParams.get("id");

      if (linkedinUrl) {
        setUrl(linkedinUrl);
        // Auto-analyze if URL is provided
        setTimeout(() => {
          handleQuickAnalyze(null, linkedinUrl);
        }, 500);
      } else if (analysisId) {
        // Load existing analysis
        loadAnalysisById(analysisId);
      }
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
      // First get total count of analyses
      const countQuery = await supabase
        .from("profile_analyses")
        .select("id", { count: "exact" })
        .eq("user_id", user?.id);

      if (countQuery.error) throw countQuery.error;

      // Set the total count
      if (countQuery.count !== null) {
        setProfilesAnalyzed(countQuery.count);
      }

      // Then get the recent analyses
      const { data, error } = await supabase
        .from("profile_analyses")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;

      if (data) {
        setRecentAnalyses(data);
      }
    } catch (error) {
      console.error("Error fetching analysis history:", error);
    }
  };

  const loadAnalysisById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("profile_analyses")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setProfileData(data.profile_data as ProfileData);
        setAnalysis(data.analysis_data as AnalysisResult);
      }
    } catch (error) {
      console.error("Error loading analysis:", error);
      toast({
        title: "Error",
        description: "Failed to load the analysis",
        variant: "destructive",
      });
    }
  };

  const saveAnalysisToHistory = async (
    profile: ProfileData,
    analysisResult: AnalysisResult,
  ) => {
    try {
      const { error } = await supabase.from("profile_analyses").insert({
        user_id: user?.id,
        name: profile.name,
        headline: profile.headline,
        profile_picture: profile.profilePicture,
        url: url,
        summary: analysisResult.summary,
        strengths: analysisResult.strengths,
        suggestions: analysisResult.suggestions,
        keywords: analysisResult.keywords,
        profile_data: profile,
        analysis_data: analysisResult,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving analysis to history:", error);
    }
  };

  const updateCredits = async () => {
    try {
      const { data, error } = await supabase.rpc("decrement_credits", {
        p_user_id: user?.id,
      });

      if (error) {
        console.error("Error updating credits:", error);
        toast({
          title: "Error updating credits",
          description:
            error.message || "There was an issue deducting your credits.",
          variant: "destructive",
        });
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error updating credits:", error);
      toast({
        title: "Error updating credits",
        description:
          error.message || "There was an issue deducting your credits.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleQuickAnalyze = async (
    e: React.FormEvent | null,
    urlToAnalyze?: string,
  ) => {
    // Prevent default form submission behavior
    e?.preventDefault?.();

    const profileUrl = urlToAnalyze || url;

    if (!profileUrl) {
      toast({
        title: "Missing URL",
        description: "Please enter a LinkedIn profile URL",
        variant: "destructive",
      });
      return;
    }

    if (!profileUrl.includes("linkedin.com/in/")) {
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
    setError("");

    try {
      // Call the edge function to analyze the profile
      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-analyze-profile",
        {
          body: { url: profileUrl },
        },
      );

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Update credits after successful analysis
      const creditUpdateSuccess = await updateCredits();
      if (!creditUpdateSuccess) {
        throw new Error("Failed to update credits. Please try again.");
      }
      await fetchUserCredits();

      // Save analysis to history
      await saveAnalysisToHistory(data.profile, data.analysis);

      setProfileData(data.profile);
      setAnalysis(data.analysis);
      setActiveTab("analysis");

      // Refresh analysis history
      await fetchAnalysisHistory();

      toast({
        title: "Analysis complete",
        description: "Profile has been successfully analyzed.",
      });

      // Scroll to analysis section
      setTimeout(() => {
        const analysisSection = document.getElementById("analysis-section");
        if (analysisSection) {
          analysisSection.scrollIntoView({ behavior: "smooth" });
        }
      }, 500);
    } catch (error) {
      console.error("Error analyzing profile:", error);
      setError(error.message || "Failed to analyze profile. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied to your clipboard.",
    });
  };

  const downloadAsText = (content: string, filename: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getAnalysisText = () => {
    if (!analysis) return "";

    let text = `# LinkedIn Profile Analysis

`;

    if (analysis.profileScore) {
      text += `## Profile Score: ${analysis.profileScore.overall}/100

`;
    }

    text += `## Summary
${analysis.summary}

## Strengths
${analysis.strengths.map((s) => `- ${s}`).join("\n")}

## Suggestions for Improvement
${analysis.suggestions.map((s) => `- ${s}`).join("\n")}

## Keywords
${analysis.keywords.join(", ")}`;

    if (analysis.profileScore) {
      text += `

## Section Scores
`;
      Object.entries(analysis.profileScore.sections).forEach(
        ([key, section]) => {
          if (section) {
            const sectionName = key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase());
            text += `- ${sectionName}: ${section.score}/100 - ${section.reason}\n`;
          }
        },
      );
    }

    return text;
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
                      <form
                        onSubmit={(e) => handleQuickAnalyze(e)}
                        className="flex gap-2"
                      >
                        <Input
                          placeholder="https://www.linkedin.com/in/username"
                          className="flex-1"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                        />
                        <Button
                          type="submit"
                          disabled={isAnalyzing || !url}
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
                      </form>
                    </div>
                    {error && (
                      <div className="p-3 bg-red-50 text-red-800 rounded-md flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}
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
                      onClick={() => {
                        const historySection =
                          document.getElementById("analysis-history");
                        if (historySection) {
                          historySection.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                    >
                      View Analysis History
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

              {/* Analysis Results Section */}
              {(profileData || analysis) && (
                <div id="analysis-section">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Tabs
                      defaultValue="analysis"
                      value={activeTab}
                      onValueChange={setActiveTab}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger
                          value="analysis"
                          className="flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          Analysis
                        </TabsTrigger>
                        <TabsTrigger
                          value="profile"
                          className="flex items-center gap-2"
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="analysis">
                        {analysis && (
                          <Card>
                            <CardHeader>
                              <CardTitle>AI Analysis</CardTitle>
                              <CardDescription>
                                AI-generated insights based on the LinkedIn
                                profile
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              <div>
                                <h3 className="text-lg font-semibold mb-2 flex items-center">
                                  <span className="bg-blue-100 text-blue-800 p-1 rounded-full mr-2">
                                    <FileText className="h-4 w-4" />
                                  </span>
                                  Professional Summary
                                </h3>
                                <p className="text-gray-700 bg-blue-50 p-3 rounded-md border-l-4 border-blue-400">
                                  {analysis.summary}
                                </p>
                                {analysis.profileScore && (
                                  <div className="mt-3 flex items-center bg-blue-50 p-3 rounded-md">
                                    <span className="font-medium text-blue-800 mr-2">
                                      Profile Score:
                                    </span>
                                    <span className="font-bold text-blue-800">
                                      {analysis.profileScore.overall}/100
                                    </span>
                                    <Progress
                                      value={analysis.profileScore.overall}
                                      className="h-2 ml-3 flex-1"
                                    />
                                  </div>
                                )}
                              </div>

                              <Separator />

                              <div>
                                <h3 className="text-lg font-semibold mb-2 flex items-center">
                                  <span className="bg-green-100 text-green-800 p-1 rounded-full mr-2">
                                    <Award className="h-4 w-4" />
                                  </span>
                                  Key Strengths
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {analysis.strengths.map((strength, index) => (
                                    <div
                                      key={index}
                                      className="bg-green-50 p-3 rounded-md border-l-4 border-green-400 flex items-start"
                                    >
                                      <div className="text-green-600 font-medium mr-2">
                                        •
                                      </div>
                                      <div className="text-gray-700">
                                        {strength}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <Separator />

                              <div>
                                <h3 className="text-lg font-semibold mb-2 flex items-center">
                                  <span className="bg-amber-100 text-amber-800 p-1 rounded-full mr-2">
                                    <AlertCircle className="h-4 w-4" />
                                  </span>
                                  Actionable Improvements
                                </h3>
                                <div className="space-y-3">
                                  {analysis.suggestions.map(
                                    (suggestion, index) => (
                                      <div
                                        key={index}
                                        className="bg-amber-50 p-3 rounded-md border-l-4 border-amber-400 flex"
                                      >
                                        <div className="bg-amber-100 text-amber-800 rounded-full h-6 w-6 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                                          {index + 1}
                                        </div>
                                        <div className="text-gray-700">
                                          {suggestion}
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>

                              <Separator />

                              <div>
                                <h3 className="text-lg font-semibold mb-2 flex items-center">
                                  <span className="bg-purple-100 text-purple-800 p-1 rounded-full mr-2">
                                    <Search className="h-4 w-4" />
                                  </span>
                                  Recruiter Search Keywords
                                </h3>
                                <div className="bg-purple-50 p-4 rounded-md border border-purple-200">
                                  <div className="flex flex-wrap gap-2">
                                    {analysis.keywords.map((keyword, index) => (
                                      <Badge
                                        key={index}
                                        variant="secondary"
                                        className="bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors px-3 py-1 text-sm"
                                      >
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(getAnalysisText())
                                }
                              >
                                <Clipboard className="h-4 w-4 mr-2" />
                                Copy
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  downloadAsText(
                                    getAnalysisText(),
                                    `linkedin-analysis-${new Date().toISOString().split("T")[0]}.txt`,
                                  )
                                }
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </CardFooter>
                          </Card>
                        )}
                      </TabsContent>

                      <TabsContent value="profile">
                        {profileData && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <ProfileView
                              profile={profileData}
                              profileScore={analysis?.profileScore}
                            />
                          </motion.div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </motion.div>
                </div>
              )}

              {/* Recent Analyses */}
              <Card
                className="bg-white border-0 shadow-sm"
                id="analysis-history"
              >
                <CardHeader className="pb-2">
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
                          <Link to={`/dashboard?id=${analysis.id}`}>
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
                </CardContent>
              </Card>

              {/* How It Works */}
              {!profileData && !analysis && (
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
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
