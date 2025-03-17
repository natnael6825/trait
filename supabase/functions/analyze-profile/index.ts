import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProfileData {
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

interface AnalysisResult {
  summary: string;
  strengths: string[];
  suggestions: string[];
  keywords: string[];
  careerPaths?: string[];
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      throw new Error("Missing LinkedIn profile URL");
    }

    // Validate LinkedIn URL format
    const urlPattern = /linkedin\.com\/in\/([\w-]+)/;
    const match = url.match(urlPattern);

    if (!match || !match[1]) {
      throw new Error("Invalid LinkedIn profile URL");
    }

    // Call RapidAPI to scrape LinkedIn profile using the full URL
    const profileData = await scrapeLinkedInProfile(url);

    // Generate AI analysis using OpenAI
    const analysisResult = await generateAnalysis(profileData);

    return new Response(
      JSON.stringify({
        profile: profileData,
        analysis: analysisResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error analyzing profile:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to analyze profile" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});

async function scrapeLinkedInProfile(profileUrl: string): Promise<ProfileData> {
  try {
    const rapidApiKey = Deno.env.get("RAPID_API_KEY");

    if (!rapidApiKey) {
      console.error("RAPID_API_KEY environment variable is not set");
      throw new Error("RAPID_API_KEY environment variable is not set");
    }

    // Encode the LinkedIn profile URL
    const encodedUrl = encodeURIComponent(profileUrl);

    const response = await fetch(
      `https://linkedin-data-api.p.rapidapi.com/get-profile-data-by-url?url=${encodedUrl}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": "linkedin-data-api.p.rapidapi.com",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `LinkedIn scraping failed: ${response.status} ${errorText}`,
      );
    }

    const data = await response.json();

    // Transform the API response to our ProfileData format
    // Note: Field mapping may need adjustment based on the actual API response structure
    return {
      name: data.fullName || data.name || "Unknown",
      headline: data.headline || data.title || "",
      location: data.location || "Unknown",
      profilePicture:
        data.profilePicture || data.profilePic || data.imageUrl || "",
      about: data.about || data.summary || "",
      experience: (data.experience || data.experiences || []).map(
        (exp: any) => ({
          title: exp.title || "",
          company: exp.company || exp.companyName || "",
          duration: exp.dateRange || exp.duration || "",
          description: exp.description || "",
        }),
      ),
      education: (data.education || []).map((edu: any) => ({
        school: edu.school || edu.schoolName || "",
        degree: edu.degree || "",
        duration: edu.dateRange || edu.duration || "",
      })),
      skills: data.skills || [],
    };
  } catch (error) {
    console.error("Error scraping LinkedIn profile:", error);
    throw new Error(`Failed to scrape LinkedIn profile: ${error.message}`);
  }
}

async function generateAnalysis(
  profileData: ProfileData,
): Promise<AnalysisResult> {
  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY environment variable is not set");
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    // Prepare the profile data for the OpenAI prompt - optimized for marketers and recruiters
    const prompt = `
Perform a detailed analysis of the following LinkedIn profile from a marketing and recruitment perspective:

Name: ${profileData.name}
Headline: ${profileData.headline}
Location: ${profileData.location}
About: ${profileData.about}

Experience:
${profileData.experience.map((exp) => `- ${exp.title} at ${exp.company} (${exp.duration})\n  ${exp.description}`).join("\n\n")}

Education:
${profileData.education.map((edu) => `- ${edu.degree} at ${edu.school} (${edu.duration})`).join("\n")}

Skills:
${profileData.skills.join(", ")}

Please provide:
1. A concise professional summary highlighting marketable skills and potential fit for roles (2-3 sentences)
2. 4-5 key strengths that would appeal to recruiters and marketing teams, with brief explanation of each
3. 3-4 specific, actionable suggestions to improve the profile for better visibility to recruiters
4. 6-8 relevant industry keywords/skills that would make this profile stand out in recruitment searches
5. 2-3 potential career paths or roles this candidate would be well-suited for
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a professional recruiter and marketing expert specializing in talent acquisition with 15+ years of experience. Provide detailed, actionable insights focused on how this candidate would be perceived by hiring managers and marketing teams. Analyze their core strengths, unique selling points, and career trajectory. Identify specific improvements that would increase profile visibility to recruiters and highlight the most marketable aspects of their experience and skills.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;

    // Parse the OpenAI response into structured data
    const summaryMatch = analysisText.match(
      /(?:Summary|Professional Summary)[:\s]+((?:.|\n)+?)(?:\n\n|\n(?=\d|Strengths|Key Strengths))/i,
    );
    const strengthsMatch = analysisText.match(
      /(?:Strengths|Key Strengths)[:\s]+((?:.|\n)+?)(?:\n\n|\n(?=\d|Suggestions))/i,
    );
    const suggestionsMatch = analysisText.match(
      /(?:Suggestions|Improvements)[:\s]+((?:.|\n)+?)(?:\n\n|\n(?=\d|Keywords))/i,
    );
    const keywordsMatch = analysisText.match(
      /(?:Keywords)[:\s]+((?:.|\n)+?)(?:\n\n|\n(?=\d|Career|Potential))/i,
    );
    const careerPathsMatch = analysisText.match(
      /(?:Career Paths|Potential Roles|Suitable Roles)[:\s]+((?:.|\n)+?)(?:\n\n|$)/i,
    );

    // Extract strengths as array (assuming they're in a list format with - or numbers)
    const extractListItems = (text: string | null): string[] => {
      if (!text) return [];
      return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.match(/^[-\d*].+/))
        .map((line) => line.replace(/^[-\d*]\s*/, ""));
    };

    // Extract keywords (comma or newline separated)
    const extractKeywords = (text: string | null): string[] => {
      if (!text) return [];
      return text
        .split(/[,\n]/) // Split by comma or newline
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword.length > 0);
    };

    return {
      summary: summaryMatch ? summaryMatch[1].trim() : "No summary available",
      strengths: strengthsMatch ? extractListItems(strengthsMatch[1]) : [],
      suggestions: suggestionsMatch
        ? extractListItems(suggestionsMatch[1])
        : [],
      keywords: keywordsMatch ? extractKeywords(keywordsMatch[1]) : [],
      careerPaths: careerPathsMatch
        ? extractListItems(careerPathsMatch[1])
        : [],
    };
  } catch (error) {
    console.error("Error generating analysis:", error);
    throw new Error(`Failed to generate analysis: ${error.message}`);
  }
}
