import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, GraduationCap, MapPin, Award, User } from "lucide-react";
import { ProfileData } from "./ProfileAnalyzer";

interface ProfileViewProps {
  profile: ProfileData;
}

export default function ProfileView({ profile }: ProfileViewProps) {
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
          </div>
        </div>

        <Separator />

        {/* About Section */}
        {profile.about && (
          <div>
            <h3 className="text-lg font-semibold mb-2">About</h3>
            <p className="text-gray-700 whitespace-pre-line">{profile.about}</p>
          </div>
        )}

        <Separator />

        {/* Experience Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Briefcase className="h-5 w-5 mr-2" />
            Experience
          </h3>
          <div className="space-y-6">
            {profile.experience.map((exp, index) => (
              <div key={index} className="space-y-2">
                <h4 className="font-semibold">{exp.title}</h4>
                <div className="text-gray-700">{exp.company}</div>
                <div className="text-sm text-gray-600">{exp.duration}</div>
                {exp.description && (
                  <p className="text-gray-700 mt-2 whitespace-pre-line">
                    {exp.description}
                  </p>
                )}
                {index < profile.experience.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Education Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <GraduationCap className="h-5 w-5 mr-2" />
            Education
          </h3>
          <div className="space-y-6">
            {profile.education.map((edu, index) => (
              <div key={index} className="space-y-2">
                <h4 className="font-semibold">{edu.school}</h4>
                <div className="text-gray-700">{edu.degree}</div>
                <div className="text-sm text-gray-600">{edu.duration}</div>
                {index < profile.education.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Skills Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Award className="h-5 w-5 mr-2" />
            Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill, index) => (
              <Badge key={index} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
