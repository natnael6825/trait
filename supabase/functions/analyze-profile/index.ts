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
  profileScore?: ProfileScore;
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

interface SectionScore {
  score: number;
  reason: string;
}

interface ProfileScore {
  overall: number;
  sections: {
    basicInfo: SectionScore;
    experience: SectionScore;
    skills: SectionScore;
    education: SectionScore;
    network?: SectionScore;
    activity?: SectionScore;
    keywords: SectionScore;
    recommendations?: SectionScore;
    achievements?: SectionScore;
  };
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

    // Calculate profile completeness and section scores
    const profileScore = calculateProfileScore(profileData);

    // Prepare the profile data for the OpenAI prompt with deterministic scoring
    const prompt = `
Perform a detailed analysis of the following LinkedIn profile from a marketing and recruitment perspective. Use the provided section scores to ensure consistency in your analysis:

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

Profile Score: ${profileScore.overall}/100
Section Scores:
- Basic Info: ${profileScore.sections.basicInfo.score}/100 (${profileScore.sections.basicInfo.reason})
- Experience: ${profileScore.sections.experience.score}/100 (${profileScore.sections.experience.reason})
- Skills: ${profileScore.sections.skills.score}/100 (${profileScore.sections.skills.reason})
- Education: ${profileScore.sections.education.score}/100 (${profileScore.sections.education.reason})
- Keywords: ${profileScore.sections.keywords.score}/100 (${profileScore.sections.keywords.reason})

Please provide:
1. A concise professional summary highlighting marketable skills and potential fit for roles (2-3 sentences)
2. 4-5 key strengths that would appeal to recruiters and marketing teams, with brief explanation of each
3. 3-4 specific, actionable suggestions to improve the profile for better visibility to recruiters
4. 6-8 relevant industry keywords/skills that would make this profile stand out in recruitment searches
5. 2-3 potential career paths or roles this candidate would be well-suited for

Base your analysis ONLY on the data provided. If a section has insufficient data, acknowledge this in your analysis.
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
              'You are a professional recruiter and marketing expert specializing in talent acquisition with 15+ years of experience. Provide detailed, actionable insights focused on how this candidate would be perceived by hiring managers and marketing teams. Analyze their core strengths, unique selling points, and career trajectory. Identify specific improvements that would increase profile visibility to recruiters and highlight the most marketable aspects of their experience and skills. Be consistent in your scoring and evaluation - the same profile should always receive the same analysis and score. IMPORTANT: Your response MUST follow this exact JSON structure:\n{\n  "summary": "Concise professional summary (2-3 sentences)",\n  "strengths": ["Strength 1 with brief explanation", "Strength 2 with brief explanation", "Strength 3 with brief explanation", "Strength 4 with brief explanation"],\n  "suggestions": ["Specific suggestion 1", "Specific suggestion 2", "Specific suggestion 3"],\n  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"],\n  "careerPaths": ["Career path 1", "Career path 2", "Career path 3"]\n}',
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2, // Lower temperature for more consistent outputs
        max_tokens: 1000,
        seed: generateSeed(profileData), // Use deterministic seed based on profile data
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;

    try {
      // Parse the OpenAI response as JSON
      const parsedResponse = JSON.parse(analysisText);

      return {
        summary: parsedResponse.summary || "No summary available",
        strengths: Array.isArray(parsedResponse.strengths)
          ? parsedResponse.strengths
          : [],
        suggestions: Array.isArray(parsedResponse.suggestions)
          ? parsedResponse.suggestions
          : [],
        keywords: Array.isArray(parsedResponse.keywords)
          ? parsedResponse.keywords
          : [],
        careerPaths: Array.isArray(parsedResponse.careerPaths)
          ? parsedResponse.careerPaths
          : [],
        profileScore: profileScore,
      };
    } catch (error) {
      console.error("Error parsing OpenAI response as JSON:", error);
      console.log("Raw response:", analysisText);

      // Fallback to regex parsing if JSON parsing fails
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
        profileScore: profileScore,
      };
    }
  } catch (error) {
    console.error("Error generating analysis:", error);
    throw new Error(`Failed to generate analysis: ${error.message}`);
  }
}

// Generate a deterministic seed based on profile data
function generateSeed(profileData: ProfileData): number {
  // Create a string that uniquely identifies this profile
  const profileString = `${profileData.name}|${profileData.headline}|${profileData.location}|${profileData.experience.length}|${profileData.skills.length}`;

  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < profileString.length; i++) {
    const char = profileString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Ensure positive number
  return Math.abs(hash);
}

// Calculate profile score based on available data
function calculateProfileScore(profileData: ProfileData): ProfileScore {
  // Basic info score
  const basicInfoScore = calculateBasicInfoScore(profileData);

  // Experience score
  const experienceScore = calculateExperienceScore(profileData);

  // Skills score
  const skillsScore = calculateSkillsScore(profileData);

  // Education score
  const educationScore = calculateEducationScore(profileData);

  // Keywords score
  const keywordsScore = calculateKeywordsScore(profileData);

  // Calculate overall score (weighted average)
  const overall = Math.round(
    basicInfoScore.score * 0.15 +
      experienceScore.score * 0.35 +
      skillsScore.score * 0.25 +
      educationScore.score * 0.15 +
      keywordsScore.score * 0.1,
  );

  return {
    overall,
    sections: {
      basicInfo: basicInfoScore,
      experience: experienceScore,
      skills: skillsScore,
      education: educationScore,
      keywords: keywordsScore,
    },
  };
}

function calculateBasicInfoScore(profileData: ProfileData): SectionScore {
  let score = 0;
  let reasons = [];

  // Name (10 points)
  if (profileData.name && profileData.name !== "Unknown") {
    score += 10;
  } else {
    reasons.push("Missing name");
  }

  // Headline (20 points)
  if (profileData.headline && profileData.headline.length > 5) {
    score += 20;
  } else {
    reasons.push("Missing or incomplete headline");
  }

  // Location (10 points)
  if (profileData.location && profileData.location !== "Unknown") {
    score += 10;
  } else {
    reasons.push("Missing location");
  }

  // About/Summary (60 points)
  if (profileData.about) {
    if (profileData.about.length > 500) {
      score += 60;
    } else if (profileData.about.length > 300) {
      score += 45;
    } else if (profileData.about.length > 100) {
      score += 30;
    } else if (profileData.about.length > 0) {
      score += 15;
      reasons.push("About section is too brief");
    } else {
      reasons.push("Missing about section");
    }
  } else {
    reasons.push("Missing about section");
  }

  // Profile picture (not scored as it's not in the data structure)

  return {
    score,
    reason:
      reasons.length > 0 ? reasons.join(", ") : "Complete basic information",
  };
}

function calculateExperienceScore(profileData: ProfileData): SectionScore {
  let score = 0;
  let reasons = [];

  if (!profileData.experience || profileData.experience.length === 0) {
    return { score: 0, reason: "No experience listed" };
  }

  // Number of experiences (20 points)
  const expCount = profileData.experience.length;
  if (expCount >= 3) {
    score += 20;
  } else if (expCount === 2) {
    score += 15;
  } else if (expCount === 1) {
    score += 10;
    reasons.push("Limited work history");
  }

  // Quality of experience entries (80 points)
  let qualityScore = 0;
  let completeEntries = 0;

  profileData.experience.forEach((exp) => {
    let entryScore = 0;

    // Title (5 points)
    if (exp.title && exp.title.length > 0) {
      entryScore += 5;
    }

    // Company (5 points)
    if (exp.company && exp.company.length > 0) {
      entryScore += 5;
    }

    // Duration (5 points)
    if (exp.duration && exp.duration.length > 0) {
      entryScore += 5;
    }

    // Description (5 points)
    if (exp.description && exp.description.length > 0) {
      if (exp.description.length > 300) {
        entryScore += 5;
      } else if (exp.description.length > 100) {
        entryScore += 3;
      } else {
        entryScore += 1;
      }
    }

    // Track complete entries
    if (entryScore >= 15) {
      completeEntries++;
    }

    qualityScore += entryScore;
  });

  // Normalize quality score to 80 points max
  const maxPossibleQualityScore = expCount * 20; // 20 points per entry
  const normalizedQualityScore = Math.min(
    80,
    Math.round((qualityScore / maxPossibleQualityScore) * 80),
  );
  score += normalizedQualityScore;

  if (completeEntries < expCount) {
    reasons.push(`${expCount - completeEntries} incomplete experience entries`);
  }

  return {
    score,
    reason:
      reasons.length > 0 ? reasons.join(", ") : "Complete experience section",
  };
}

function calculateSkillsScore(profileData: ProfileData): SectionScore {
  if (!profileData.skills || profileData.skills.length === 0) {
    return { score: 0, reason: "No skills listed" };
  }

  const skillCount = profileData.skills.length;
  let score = 0;
  let reason = "";

  // Score based on number of skills
  if (skillCount >= 15) {
    score = 100;
    reason = "Comprehensive skills section";
  } else if (skillCount >= 10) {
    score = 80;
    reason = "Good skills section";
  } else if (skillCount >= 5) {
    score = 60;
    reason = "Adequate skills section";
  } else if (skillCount >= 3) {
    score = 40;
    reason = "Limited skills section";
  } else {
    score = 20;
    reason = "Very few skills listed";
  }

  return { score, reason };
}

function calculateEducationScore(profileData: ProfileData): SectionScore {
  if (!profileData.education || profileData.education.length === 0) {
    return { score: 0, reason: "No education listed" };
  }

  let score = 0;
  let reasons = [];

  // Number of education entries (30 points)
  const eduCount = profileData.education.length;
  if (eduCount >= 2) {
    score += 30;
  } else if (eduCount === 1) {
    score += 20;
  }

  // Quality of education entries (70 points)
  let qualityScore = 0;
  let completeEntries = 0;

  profileData.education.forEach((edu) => {
    let entryScore = 0;

    // School (10 points)
    if (edu.school && edu.school.length > 0) {
      entryScore += 10;
    }

    // Degree (10 points)
    if (edu.degree && edu.degree.length > 0) {
      entryScore += 10;
    }

    // Duration (5 points)
    if (edu.duration && edu.duration.length > 0) {
      entryScore += 5;
    }

    // Track complete entries
    if (entryScore >= 20) {
      completeEntries++;
    }

    qualityScore += entryScore;
  });

  // Normalize quality score to 70 points max
  const maxPossibleQualityScore = eduCount * 25; // 25 points per entry
  const normalizedQualityScore = Math.min(
    70,
    Math.round((qualityScore / maxPossibleQualityScore) * 70),
  );
  score += normalizedQualityScore;

  if (completeEntries < eduCount) {
    reasons.push(`${eduCount - completeEntries} incomplete education entries`);
  }

  return {
    score,
    reason:
      reasons.length > 0 ? reasons.join(", ") : "Complete education section",
  };
}

function calculateKeywordsScore(profileData: ProfileData): SectionScore {
  // Extract potential keywords from headline, about, and experience
  const allText = [
    profileData.headline || "",
    profileData.about || "",
    ...(profileData.experience || []).map(
      (exp) => `${exp.title} ${exp.description}`,
    ),
    ...(profileData.skills || []),
  ]
    .join(" ")
    .toLowerCase();

  // Common industry keywords to check for
  const industryKeywords = [
    "leadership",
    "management",
    "strategy",
    "innovation",
    "development",
    "analysis",
    "research",
    "design",
    "marketing",
    "sales",
    "operations",
    "project",
    "product",
    "service",
    "customer",
    "client",
    "team",
    "collaboration",
    "communication",
    "presentation",
    "negotiation",
    "budget",
    "planning",
    "implementation",
    "execution",
    "evaluation",
    "assessment",
    "improvement",
    "optimization",
    "efficiency",
    "effectiveness",
    "performance",
    "results",
    "achievement",
    "success",
    "growth",
    "expansion",
    "scaling",
    "global",
    "international",
    "national",
    "regional",
    "local",
    "industry",
    "market",
    "sector",
    "niche",
    "specialized",
    "expert",
    "professional",
    "certified",
    "qualified",
    "experienced",
    "skilled",
    "competent",
    "proficient",
    "adept",
  ];

  // Count keyword matches
  let keywordMatches = 0;
  industryKeywords.forEach((keyword) => {
    if (allText.includes(keyword)) {
      keywordMatches++;
    }
  });

  // Calculate score based on keyword density
  const keywordPercentage = (keywordMatches / industryKeywords.length) * 100;
  let score = Math.min(100, Math.round(keywordPercentage * 2)); // Double the percentage for score, max 100

  let reason = "";
  if (score >= 80) {
    reason = "Excellent keyword optimization";
  } else if (score >= 60) {
    reason = "Good keyword presence";
  } else if (score >= 40) {
    reason = "Moderate keyword presence";
  } else if (score >= 20) {
    reason = "Limited keyword presence";
  } else {
    reason = "Very few industry keywords";
  }

  return { score, reason };
}
