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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Clipboard,
  Download,
  FileText,
  AlertCircle,
  Award,
  Search,
} from "lucide-react";
import { motion } from "framer-motion";
import { AnalysisResult, ProfileData } from "@/types/profile-analyzer";

interface AnalysisStructureProps {
  analysis: AnalysisResult | null;
  copyToClipboard: (content: string) => void;
  downloadAsText: (content: string, filename: string) => void;
  getAnalysisText: () => string;
}

export default function AnalysisStructure({
  analysis,
  copyToClipboard,
  downloadAsText,
  getAnalysisText,
}: AnalysisStructureProps) {
  if (!analysis) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <p className="text-gray-600">
            No analysis data available. Enter a LinkedIn profile URL to analyze.
          </p>
        </div>
      </div>
    );
  }

  return (
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
            {analysis.strengths && analysis.strengths.length > 0 ? (
              analysis.strengths.map((strength, index) => (
                <div
                  key={index}
                  className="bg-green-50 p-3 rounded-md border-l-4 border-green-400 flex items-start"
                >
                  <div className="text-green-600 font-medium mr-2">•</div>
                  <div className="text-gray-700">{strength}</div>
                </div>
              ))
            ) : (
              <div className="bg-green-50 p-3 rounded-md border-l-4 border-green-400 col-span-2">
                <div className="text-gray-700">No strengths data available</div>
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
            {analysis.suggestions && analysis.suggestions.length > 0 ? (
              analysis.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="bg-amber-50 p-3 rounded-md border-l-4 border-amber-400 flex"
                >
                  <div className="bg-amber-100 text-amber-800 rounded-full h-6 w-6 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="text-gray-700">{suggestion}</div>
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
              {analysis.keywords && analysis.keywords.length > 0 ? (
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

        {analysis.careerPaths && analysis.careerPaths.length > 0 && (
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
  );
}
