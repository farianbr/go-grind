import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { BookOpen, Users, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { getAllSpaces } from "../lib/api";
import { SKILLS } from "../constants";
import { capitalize } from "../lib/utils";

const ITEMS_PER_PAGE = 6;

const ExploreSpaces = () => {
  const navigate = useNavigate();
  const [selectedSkill, setSelectedSkill] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: allSpaces = [], isLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: getAllSpaces,
  });

  // Filter spaces
  const filteredSpaces = allSpaces.filter((space) => {
    const matchesSkill = selectedSkill === "" || space.skill?.toLowerCase() === selectedSkill.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      space.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      space.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSkill && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSpaces.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSpaces = filteredSpaces.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleSkillChange = (skill) => {
    setSelectedSkill(skill);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Explore Spaces</h2>
          <p className="text-sm text-base-content/60 mt-1">
            Join skill-focused learning groups
          </p>
        </div>
        <button
          onClick={() => navigate("/spaces")}
          className="btn btn-primary btn-sm sm:btn-md"
        >
          View All Spaces
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="form-control flex-1">
          <label className="input input-bordered flex items-center gap-2">
            <Search className="size-5 opacity-70" />
            <input
              type="text"
              placeholder="Search spaces..."
              className="grow"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </label>
        </div>

        {/* Skill Filter */}
        <select
          className="select select-bordered w-full sm:w-auto min-w-[200px]"
          value={selectedSkill}
          onChange={(e) => handleSkillChange(e.target.value)}
        >
          <option value="">All Skills</option>
          {SKILLS.map((skill) => (
            <option key={skill} value={skill}>
              {capitalize(skill)}
            </option>
          ))}
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredSpaces.length === 0 && (
        <div className="text-center py-12 bg-base-200 rounded-lg">
          <BookOpen className="size-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No spaces found</h3>
          <p className="text-base-content/60 mb-4">
            {searchTerm || selectedSkill
              ? "Try adjusting your filters"
              : "Be the first to create a space!"}
          </p>
          <button onClick={() => navigate("/spaces")} className="btn btn-primary">
            Go to Spaces
          </button>
        </div>
      )}

      {/* Spaces Grid */}
      {!isLoading && paginatedSpaces.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedSpaces.map((space) => {
              return (
                <div
                  key={space._id}
                  onClick={() => navigate(`/spaces/${space._id}`)}
                  className="card bg-base-200 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <div className="card-body p-5 space-y-3">
                    {/* Header */}
                    <div>
                      <h3 className="font-bold text-lg mb-1 line-clamp-1">
                        {space.name}
                      </h3>
                      <div className="badge badge-primary badge-sm">
                        <BookOpen className="size-3 mr-1" />
                        {capitalize(space.skill)}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm opacity-70 line-clamp-2">
                      {space.description}
                    </p>

                    {/* Creator */}
                    <div className="flex items-center gap-2">
                      <div className="avatar">
                        <div className="w-8 h-8 rounded-full">
                          <img
                            src={space.creator.profilePic}
                            alt={space.creator.fullName}
                          />
                        </div>
                      </div>
                      <div className="text-sm truncate">
                        <p className="font-medium truncate">
                          {space.creator.fullName}
                        </p>
                      </div>
                    </div>

                    {/* Members count */}
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-base-300">
                      <div className="flex items-center gap-2">
                        <Users className="size-4" />
                        <span>{space.members.length} members</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-sm btn-ghost"
              >
                <ChevronLeft className="size-5" />
              </button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`btn btn-sm ${
                        currentPage === page ? "btn-primary" : "btn-ghost"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="btn btn-sm btn-ghost"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExploreSpaces;
