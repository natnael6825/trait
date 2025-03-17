# LinkedIn Profile Analyzer Edge Function

This edge function analyzes LinkedIn profiles by:

1. Scraping profile data using RapidAPI's LinkedIn Data API
2. Generating AI analysis using OpenAI's API
3. Returning structured data in a consistent format

## Response Structure

The function returns a structured JSON response with two main sections:

```json
{
  "profile": {
    "name": "...",
    "headline": "...",
    "location": "...",
    "profilePicture": "...",
    "about": "...",
    "experience": [...],
    "education": [...],
    "skills": [...]
  },
  "analysis": {
    "summary": "...",
    "strengths": [...],
    "suggestions": [...],
    "keywords": [...],
    "careerPaths": [...],
    "profileScore": {
      "overall": 85,
      "sections": {...}
    }
  }
}
```

## OpenAI Response Format

The OpenAI API is configured to return a structured JSON response with the following format:

```json
{
  "summary": "Concise professional summary (2-3 sentences)",
  "strengths": ["Strength 1 with brief explanation", "Strength 2 with brief explanation", "Strength 3 with brief explanation", "Strength 4 with brief explanation"],
  "suggestions": ["Specific suggestion 1", "Specific suggestion 2", "Specific suggestion 3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"],
  "careerPaths": ["Career path 1", "Career path 2", "Career path 3"]
}
```

## Scoring System

The profile scoring system evaluates:

- Basic Info (15%): Name, headline, location, and about section
- Experience (35%): Number and quality of experience entries
- Skills (25%): Number of skills listed
- Education (15%): Number and quality of education entries
- Keywords (10%): Presence of industry-relevant keywords

Each section receives a score out of 100, and the overall score is a weighted average.
