import ProfileAnalyzer from "../profile-analyzer/ProfileAnalyzer";
import TopNavigation from "../dashboard/layout/TopNavigation";
import Sidebar from "../dashboard/layout/Sidebar";

export default function ProfileAnalyzerPage() {
  return (
    <div className="min-h-screen bg-white">
      <TopNavigation />

      <div className="flex pt-16">
        <Sidebar activeItem="Profile Analyzer" />

        <main className="flex-1 overflow-auto p-6">
          <ProfileAnalyzer />
        </main>
      </div>
    </div>
  );
}
