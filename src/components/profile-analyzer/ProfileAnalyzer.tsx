import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Clipboard,
  Download,
  Loader2,
  Search,
  User,
  FileText,
  AlertCircle,
  Award,
} from "lucide-react";
import { useAuth } from "../../../supabase/auth";
import { supabase } from "../../../supabase/supabase";
import ProfileView from "./ProfileView";
import { motion } from "framer-motion";

export interface ProfileData {
  name: string;
  headline: string;
  location: string;
  profilePicture: string;
  about: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    duration: string;
  }>;
  skills: string[];
}

export interface ProfileScore {
  overall: number;
  sections: {
    basicInfo: {
      score: number;
      reason: string;
    };
    experience: {
      score: number;
      reason: string;
    };
    skills: {
      score: number;
      reason: string;
    };
    education: {
      score: number;
      reason: string;
    };
    keywords: {
      score: number;
      reason: string;
    };
    network?: {
      score: number;
      reason: string;
    };
    activity?: {
      score: number;
      reason: string;
    };
    recommendations?: {
      score: number;
      reason: string;
    };
    achievements?: {
      score: number;
      reason: string;
    };
  };
}

export interface AnalysisResult {
  summary: string;
  strengths: string[];
  suggestions: string[];
  keywords: string[];
  careerPaths?: string[];
  profileScore?: ProfileScore;
}

export default function ProfileAnalyzer() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState("analysis");
  const [credits, setCredits] = useState<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch user credits on component mount
  useEffect(() => {
    if (user) {
      fetchUserCredits();
    }

    // Check for URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const linkedinUrl = urlParams.get("url");
    if (linkedinUrl) {
      setUrl(linkedinUrl);
      // Auto-analyze if URL is provided
      setTimeout(() => {
        handleAnalyze();
      }, 500);
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
      toast({
        title: "Error fetching credits",
        description: "Could not retrieve your available credits.",
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

  const handleAnalyze = async (e) => {
    // Prevent default form submission behavior
    e?.preventDefault?.();

    if (!url) {
      setError("Please enter a LinkedIn profile URL");
      return;
    }

    if (!url.includes("linkedin.com/in/")) {
      setError("Please enter a valid LinkedIn profile URL");
      return;
    }

    if (!credits || credits < 1) {
      toast({
        title: "Insufficient credits",
        description: "You need at least 1 credit to analyze a profile.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Call the edge function to analyze the profile
      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-analyze-profile",
        {
          body: { url },
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

      // Ensure data has the expected structure
      if (!data.profile || !data.analysis) {
        throw new Error("Invalid response format from the server");
      }

      // Make sure analysis has all required fields
      const safeAnalysis = {
        summary: data.analysis.summary || "",
        strengths: data.analysis.strengths || [],
        suggestions: data.analysis.suggestions || [],
        keywords: data.analysis.keywords || [],
        careerPaths: data.analysis.careerPaths || [],
        profileScore: data.analysis.profileScore || null,
      };

      // Save analysis to history
      await saveAnalysisToHistory(data.profile, safeAnalysis);

      setProfileData(data.profile);
      setAnalysis(safeAnalysis);
      setActiveTab("analysis");

      toast({
        title: "Analysis complete",
        description: "Profile has been successfully analyzed.",
      });
    } catch (error) {
      console.error("Error analyzing profile:", error);
      setError(error.message || "Failed to analyze profile. Please try again.");
    } finally {
      setIsLoading(false);
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

    let text = `# LinkedIn Profile Analysis\n\n`;

    if (analysis.profileScore) {
      text += `## Profile Score: ${analysis.profileScore.overall}/100\n\n`;
    }

    text += `## Summary\n${analysis.summary || "No summary available"}\n\n## Strengths\n${(analysis.strengths || []).map((s) => `- ${s}`).join("\n")}\n\n## Suggestions for Improvement\n${(analysis.suggestions || []).map((s) => `- ${s}`).join("\n")}\n\n## Keywords\n${(analysis.keywords || []).join(", ")}`;

    if (analysis.careerPaths && analysis.careerPaths.length > 0) {
      text += `\n\n## Potential Career Paths\n${analysis.careerPaths.map((p) => `- ${p}`).join("\n")}`;
    }

    if (analysis.profileScore) {
      text += `\n\n## Section Scores\n`;
      Object.entries(analysis.profileScore.sections || {}).forEach(
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">LinkedIn Profile Analyzer</h1>
          <p className="text-gray-600">
            Get AI-powered insights, strengths assessment, and improvement
            suggestions
          </p>
        </div>

        <Card className="mb-8 border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Search className="h-5 w-5" />
              <h2 className="text-xl font-semibold">
                Analyze a LinkedIn Profile
              </h2>
            </div>
            <p className="opacity-90">
              Enter a LinkedIn profile URL to analyze. Each analysis costs 1
              credit.
            </p>
          </div>
          <CardContent className="pt-6">
            <form onSubmit={handleAnalyze} className="w-full">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="https://www.linkedin.com/in/username"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || !url}
                  className="whitespace-nowrap bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>Analyze Profile</>
                  )}
                </Button>
              </div>
            </form>
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-md flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-gray-500 mt-4">
              <div>
                Available Credits:{" "}
                <Badge
                  variant="outline"
                  className="ml-1 bg-blue-50 text-blue-700 border-blue-200"
                >
                  {credits !== null ? credits : "--"}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <a href="/pricing">Purchase Credits</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {(profileData || analysis) && (
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
                {analysis ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Analysis</CardTitle>
                      <CardDescription>
                        AI-generated insights based on the LinkedIn profile
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
                          {analysis.summary || "No summary available"}
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
                          {analysis.strengths &&
                          analysis.strengths.length > 0 ? (
                            analysis.strengths.map((strength, index) => (
                              <div
                                key={index}
                                className="bg-green-50 p-3 rounded-md border-l-4 border-green-400 flex items-start"
                              >
                                <div className="text-green-600 font-medium mr-2">
                                  •
                                </div>
                                <div className="text-gray-700">{strength}</div>
                              </div>
                            ))
                          ) : (
                            <div className="bg-green-50 p-3 rounded-md border-l-4 border-green-400 col-span-2">
                              <div className="text-gray-700">
                                No strengths data available
                              </div>
                            </div>
                          )}
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
                          {analysis.suggestions &&
                          analysis.suggestions.length > 0 ? (
                            analysis.suggestions.map((suggestion, index) => (
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
                            ))
                          ) : (
                            <div className="bg-amber-50 p-3 rounded-md border-l-4 border-amber-400">
                              <div className="text-gray-700">
                                No improvement suggestions available
                              </div>
                            </div>
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
                            {analysis.keywords &&
                            analysis.keywords.length > 0 ? (
                              analysis.keywords.map((keyword, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors px-3 py-1 text-sm"
                                >
                                  {keyword}
                                </Badge>
                              ))
                            ) : (
                              <div className="text-gray-700 w-full text-center py-2">
                                No keywords available
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {analysis.careerPaths &&
                        analysis.careerPaths.length > 0 && (
                          <>
                            <Separator />
                            <div>
                              <h3 className="text-lg font-semibold mb-2 flex items-center">
                                <span className="bg-blue-100 text-blue-800 p-1 rounded-full mr-2">
                                  <Award className="h-4 w-4" />
                                </span>
                                Potential Career Paths
                              </h3>
                              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                                <ul className="list-disc pl-5 space-y-1">
                                  {analysis.careerPaths.map((path, index) => (
                                    <li key={index} className="text-gray-700">
                                      {path}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(getAnalysisText())}
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
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8 bg-white rounded-md shadow">
                    <div className="text-center max-w-md">
                      <p className="text-gray-600">
                        No analysis data available. Enter a LinkedIn profile URL
                        to analyze.
                      </p>
                    </div>
                  </div>
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
        )}
      </div>
    </div>
  );
}
