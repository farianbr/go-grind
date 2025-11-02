export const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

export const minutesToHoursAndMinutes = (minutes) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return { hours: hrs, minutes: mins };
};
