import RecommendedFriends from "../components/RecommendedFriends"
import ExploreSpaces from "../components/ExploreSpaces"

const HomePage = () => {
  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
      <div className="container mx-auto max-w-7xl space-y-8 sm:space-y-10 md:space-y-12">
        <ExploreSpaces />
        <RecommendedFriends />
      </div>
    </div>
  );
};

export default HomePage;
