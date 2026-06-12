export const getPosterUrl = (path: string | null | undefined) => {
  if (!path) return "https://via.placeholder.com/500x750/111111/333333?text=No+Poster";
  return `https://image.tmdb.org/t/p/w500${path}`;
};

export const getBackdropUrl = (path: string | null | undefined) => {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/w1280${path}`;
};

export const getProfileUrl = (path: string | null | undefined) => {
  if (!path) return "https://via.placeholder.com/185x278/111111/333333?text=No+Photo";
  return `https://image.tmdb.org/t/p/w185${path}`;
};
