import { useState } from "react";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LoaderIcon,
  MapPinIcon,
  Airplay,
  ShuffleIcon,
  UploadIcon,
  User,
} from "lucide-react";

import useAuthUser from "../hooks/useAuthUser";
import { completeOnboarding, uploadPhoto } from "../lib/api";
import { LANGUAGES, SKILLS } from "../constants";

const OnboardingPage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();

  const [formState, setFormState] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    nativeLanguage: authUser?.nativeLanguage || "",
    learningSkill: authUser?.learningSkill || "",
    location: authUser?.location || "",
    profilePic: authUser?.profilePic || "/blank-pp.png",
  });
  const [isUploading, setIsUploading] = useState(false);

  const { mutate: onboardingMutation, isPending } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      toast.success("Profile onboarded successfully");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },

    onError: (error) => {
      toast.error(error.response.data.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    onboardingMutation(formState);
  };

  const handleRandomAvatar = () => {
    const idx = Math.floor(Math.random() * 100) + 1; // 1-100 included
    const randomAvatar = `https://avatar.iran.liara.run/public/${idx}`;

    setFormState({ ...formState, profilePic: randomAvatar });
    toast.success("Random profile picture generated!");
  };

  const handleUpload = async (data) => {
    setIsUploading(true);
    const img = await uploadPhoto(data);

    if (img?.success) {
      setFormState({ ...formState, profilePic: img.url });
      toast.success("Photo updated!");
    } else {
      toast.error("Upload failed! Please try again.");
    }
    setIsUploading(false);
  };

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
      <div className="card bg-base-200 w-full max-w-3xl shadow-xl">
        <div className="card-body p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6">
            Complete Your Profile
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* PROFILE PIC CONTAINER */}
            <div className="flex flex-col items-center justify-center space-y-4">
              {/* IMAGE PREVIEW */}
              <div className="size-32 rounded-full bg-base-300 overflow-hidden">
                {formState.profilePic ? (
                  <img
                    src={formState.profilePic}
                    alt="Profile Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <User className="size-12 text-base-content opacity-40" />
                  </div>
                )}
              </div>

              {/* Generate Random Avatar BTN */}
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRandomAvatar}
                  className="btn btn-accent w-full sm:w-auto"
                >
                  <ShuffleIcon className="size-4 mr-2" />
                  <span className="hidden sm:inline">Generate Random Avatar</span>
                  <span className="sm:hidden">Random Avatar</span>
                </button>
                {/* Upload Photo BTN */}
                <label
                  htmlFor="upload-photo"
                  className="btn btn-secondary cursor-pointer w-full sm:w-auto"
                >
                  {isUploading ? (
                    <LoaderIcon className="animate-spin size-5 mr-2" />
                  ) : (
                    <UploadIcon className="size-4 mr-2" />
                  )}
                  Upload Photo
                </label>
                <input
                  id="upload-photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUpload(file);
                    }
                  }}
                />
              </div>
            </div>

            {/* FULL NAME */}
            <fieldset className="fieldset">
              <label className="label" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                name="fullName"
                value={formState.fullName}
                onChange={(e) =>
                  setFormState({ ...formState, fullName: e.target.value })
                }
                className="input w-full"
                placeholder="Your full name"
              />
            </fieldset>

            {/* BIO */}
            <fieldset className="fieldset">
              <label className="label" htmlFor="bio">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formState.bio}
                onChange={(e) =>
                  setFormState({ ...formState, bio: e.target.value })
                }
                className="textarea h-24 w-full"
                placeholder="Tell others about yourself and your focus goals"
              />
            </fieldset>

            {/* LANGUAGES AND SKILLS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NATIVE LANGUAGE */}
              <fieldset className="fieldset">
                <label className="label" htmlFor="nativeLanguage">
                  Native Language
                </label>
                <select
                  id="nativeLanguage"
                  name="nativeLanguage"
                  value={formState.nativeLanguage}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      nativeLanguage: e.target.value,
                    })
                  }
                  className="select w-full"
                >
                  <option value="">Select your native language</option>
                  {LANGUAGES.map((lang) => (
                    <option key={`native-${lang}`} value={lang.toLowerCase()}>
                      {lang}
                    </option>
                  ))}
                </select>
              </fieldset>

              {/* FOCUS SKILL */}
              <fieldset className="fieldset">
                <label className="label" htmlFor="focusSkill">
                  Focus Skill
                </label>
                <select
                  id="focusSkill"
                  name="focusSkill"
                  value={formState.learningSkill}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      learningSkill: e.target.value,
                    })
                  }
                  className="select w-full"
                >
                  <option value="">Select skill you're focusing</option>
                  {SKILLS.map((skill) => (
                    <option key={`focusing-${skill}`} value={skill.toLowerCase()}>
                      {skill}
                    </option>
                  ))}
                </select>
              </fieldset>
            </div>

            {/* LOCATION */}
            <fieldset className="fieldset">
              <label className="label" htmlFor="location">
                Location
              </label>
              <div className="relative">
                <MapPinIcon className="absolute top-1/2 transform -translate-y-1/2 left-3 size-5 text-base-content opacity-70" />
                <input
                  id="location"
                  type="text"
                  name="location"
                  value={formState.location}
                  onChange={(e) =>
                    setFormState({ ...formState, location: e.target.value })
                  }
                  className="input w-full pl-10"
                  placeholder="City, Country"
                />
              </div>
            </fieldset>

            {/* SUBMIT BUTTON */}

            <button
              className="btn btn-primary w-full"
              disabled={isPending}
              type="submit"
            >
              {!isPending ? (
                <>
                  <Airplay className="size-5 mr-2" />
                  Complete Onboarding
                </>
              ) : (
                <>
                  <LoaderIcon className="animate-spin size-5 mr-2" />
                  Onboarding...
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
