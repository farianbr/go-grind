import RecommendedFriends from "../components/RecommendedFriends"
import ExploreSpaces from "../components/ExploreSpaces"

const HomePage = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto space-y-10">
        <ExploreSpaces />
        <RecommendedFriends />
      </div>
    </div>
  );
};

export default HomePage;
