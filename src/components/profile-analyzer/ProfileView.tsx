import { ProfileData, ProfileScore } from "./ProfileAnalyzer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, GraduationCap, MapPin, Award, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface ProfileViewProps {
  profile: ProfileData;
  profileScore?: ProfileScore;
}

export default function ProfileView({
  profile,
  profileScore,
}: ProfileViewProps) {
  return (
    <Card className="bg-white w-full">
      <CardHeader className="pb-2">
        <CardTitle>LinkedIn Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-blue-100 shadow-lg">
              <AvatarImage src={profile.profilePicture} alt={profile.name} />
              <AvatarFallback className="bg-blue-600 text-white text-xl font-bold">
                {profile.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1 rounded-full">
              <User className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{profile.name}</h2>
            <p className="text-gray-700">{profile.headline}</p>
            <div className="flex items-center text-gray-600">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{profile.location}</span>
            </div>

            {profileScore && (
              <div className="mt-4 bg-blue-50 p-3 rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-blue-800">
                    Profile Score
                  </span>
                  <span className="font-bold text-blue-800">
                    {profileScore.overall}/100
                  </span>
                </div>
                <Progress value={profileScore.overall} className="h-2" />
              </div>
            )}
          </div>
        </div>

        {/* Profile Sections with Tabs */}
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            {profileScore && <TabsTrigger value="scores">Scores</TabsTrigger>}
          </TabsList>

          {/* About Section */}
          <TabsContent value="about" className="pt-2">
            {profile.about ? (
              <div className="bg-white p-4 rounded-md border border-gray-100">
                <p className="text-gray-700 whitespace-pre-line">
                  {profile.about}
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
                <p>No about section available</p>
              </div>
            )}
          </TabsContent>

          {/* Experience Section */}
          <TabsContent value="experience" className="pt-2">
            {profile.experience && profile.experience.length > 0 ? (
              <div className="space-y-6">
                {profile.experience.map((exp, index) => (
                  <div
                    key={index}
                    className="bg-white p-4 rounded-md border border-gray-100"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      <h4 className="font-semibold">{exp.title}</h4>
                      <div className="text-sm text-gray-600">
                        {exp.duration}
                      </div>
                    </div>
                    <div className="text-gray-700">{exp.company}</div>
                    {exp.description && (
                      <p className="text-gray-700 mt-2 whitespace-pre-line">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
                <p>No experience listed</p>
              </div>
            )}
          </TabsContent>

          {/* Education Section */}
          <TabsContent value="education" className="pt-2">
            {profile.education && profile.education.length > 0 ? (
              <div className="space-y-6">
                {profile.education.map((edu, index) => (
                  <div
                    key={index}
                    className="bg-white p-4 rounded-md border border-gray-100"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      <h4 className="font-semibold">{edu.school}</h4>
                      <div className="text-sm text-gray-600">
                        {edu.duration}
                      </div>
                    </div>
                    <div className="text-gray-700">{edu.degree}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
                <p>No education listed</p>
              </div>
            )}
          </TabsContent>

          {/* Skills Section */}
          <TabsContent value="skills" className="pt-2">
            {profile.skills && profile.skills.length > 0 ? (
              <div className="bg-white p-4 rounded-md border border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
                <p>No skills listed</p>
              </div>
            )}
          </TabsContent>

          {/* Scores Section */}
          {profileScore && (
            <TabsContent value="scores" className="pt-2">
              <div className="space-y-4">
                {profileScore.sections &&
                  Object.entries(profileScore.sections).map(
                    ([key, section]) => {
                      // Skip sections that don't have scores or are undefined
                      if (!section || section === undefined) return null;

                      // Format section name
                      const sectionName = key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase());

                      // Determine color based on score
                      let colorClass = "";
                      if (section.score >= 80)
                        colorClass =
                          "bg-green-100 border-green-300 text-green-800";
                      else if (section.score >= 60)
                        colorClass =
                          "bg-blue-100 border-blue-300 text-blue-800";
                      else if (section.score >= 40)
                        colorClass =
                          "bg-yellow-100 border-yellow-300 text-yellow-800";
                      else
                        colorClass = "bg-red-100 border-red-300 text-red-800";

                      return (
                        <div
                          key={key}
                          className={`p-4 rounded-md border ${colorClass}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <Award className="h-5 w-5 mr-2" />
                              <span className="font-medium">{sectionName}</span>
                            </div>
                            <span className="font-bold">
                              {section.score}/100
                            </span>
                          </div>
                          <Progress
                            value={section.score}
                            className="h-2 mb-2"
                          />
                          <p className="text-sm mt-1">{section.reason}</p>
                        </div>
                      );
                    },
                  )}
                {(!profileScore.sections ||
                  Object.keys(profileScore.sections).length === 0) && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
                    <p>No section scores available</p>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
