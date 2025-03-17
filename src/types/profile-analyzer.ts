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

export interface SectionScore {
  score: number;
  reason: string;
}

export interface ProfileScore {
  overall: number;
  sections: {
    basicInfo: SectionScore;
    experience: SectionScore;
    skills: SectionScore;
    education: SectionScore;
    keywords: SectionScore;
    network?: SectionScore;
    activity?: SectionScore;
    recommendations?: SectionScore;
    achievements?: SectionScore;
  };
}

export interface AnalysisResult {
  summary: string;
  strengths: string[];
  suggestions: string[];
  keywords: string[];
  careerPaths: string[];
  profileScore?: ProfileScore;
}

export interface ProfileAnalysis {
  profile: ProfileData;
  analysis: AnalysisResult;
}
