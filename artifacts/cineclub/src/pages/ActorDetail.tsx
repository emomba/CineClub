import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageTransition } from "@/components/PageTransition";
import { MovieCard } from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/i18n";
import { MapPin, Calendar, User, ChevronLeft, Film } from "lucide-react";

function getProfileUrl(path: string | null) {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/w500${path}`;
}

export default function ActorDetail() {
  const { t } = useLang();
  const params = useParams<{ personId: string }>();
  const personId = Number(params.personId);
  const [, setLocation] = useLocation();

  const { data: actor, isLoading } = useQuery<{
    id: number;
    name: string;
    profilePath: string | null;
    biography: string | null;
    birthday: string | null;
    deathday: string | null;
    placeOfBirth: string | null;
    age: number | null;
    knownForDepartment: string | null;
    movies: any[];
  }>({
    queryKey: ["actor", personId],
    queryFn: () => fetch(`/api/actors/${personId}`).then(r => r.json()),
    enabled: !!personId,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading || !actor) {
    return (
      <PageTransition className="pb-20">
        <div className="flex gap-8 items-start pt-8">
          <Skeleton className="w-[200px] h-[300px] rounded-2xl bg-[#111] shrink-0" />
          <div className="flex-1 space-y-4 pt-4">
            <Skeleton className="h-10 w-1/2 bg-[#111]" />
            <Skeleton className="h-5 w-1/3 bg-[#111]" />
            <Skeleton className="h-32 w-full bg-[#111]" />
          </div>
        </div>
        <div className="mt-12 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="w-full aspect-[2/3] rounded-xl bg-[#111]" />
          ))}
        </div>
      </PageTransition>
    );
  }

  const profileUrl = getProfileUrl(actor.profilePath);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <PageTransition className="pb-20">
      {/* Back button */}
      <button
        onClick={() => setLocation(-1 as any)}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-sm">{t("back") || "Geri"}</span>
      </button>

      {/* Actor profile */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
        {/* Photo */}
        <div className="shrink-0">
          <div className="w-[180px] md:w-[240px] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
            {profileUrl ? (
              <img src={profileUrl} alt={actor.name} className="w-full h-auto object-cover" />
            ) : (
              <div className="w-full aspect-[2/3] bg-[#111] flex items-center justify-center">
                <User size={48} className="text-gray-600" />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">{actor.name}</h1>
            {actor.knownForDepartment && (
              <p className="text-amber-500 font-medium">{actor.knownForDepartment}</p>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4">
            {actor.birthday && (
              <div className="flex items-center gap-2 bg-[#111] border border-gray-800 px-4 py-2.5 rounded-xl">
                <Calendar size={16} className="text-amber-500 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">{t("birthday") || "Doğum Tarihi"}</div>
                  <div className="text-sm font-medium">{formatDate(actor.birthday)}</div>
                </div>
              </div>
            )}
            {actor.age !== null && !actor.deathday && (
              <div className="flex items-center gap-2 bg-[#111] border border-gray-800 px-4 py-2.5 rounded-xl">
                <User size={16} className="text-amber-500 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">{t("age") || "Yaş"}</div>
                  <div className="text-sm font-medium">{actor.age}</div>
                </div>
              </div>
            )}
            {actor.placeOfBirth && (
              <div className="flex items-center gap-2 bg-[#111] border border-gray-800 px-4 py-2.5 rounded-xl">
                <MapPin size={16} className="text-amber-500 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">{t("birthplace") || "Doğum Yeri"}</div>
                  <div className="text-sm font-medium max-w-[200px] truncate">{actor.placeOfBirth}</div>
                </div>
              </div>
            )}
            {actor.deathday && (
              <div className="flex items-center gap-2 bg-[#111] border border-gray-800 px-4 py-2.5 rounded-xl">
                <Calendar size={16} className="text-gray-500 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">{t("deathday") || "Ölüm Tarihi"}</div>
                  <div className="text-sm font-medium text-gray-400">{formatDate(actor.deathday)}</div>
                </div>
              </div>
            )}
            {actor.movies.length > 0 && (
              <div className="flex items-center gap-2 bg-[#111] border border-gray-800 px-4 py-2.5 rounded-xl">
                <Film size={16} className="text-amber-500 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">{t("actorFilmography") || "Filmografi"}</div>
                  <div className="text-sm font-medium">{actor.movies.length} film</div>
                </div>
              </div>
            )}
          </div>

          {/* Biography */}
          {actor.biography && (
            <div>
              <h3 className="text-lg font-bold mb-3 text-white">{t("biography") || "Biyografi"}</h3>
              <p className="text-gray-300 leading-relaxed text-sm md:text-base whitespace-pre-line line-clamp-6">
                {actor.biography}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filmography */}
      {actor.movies.length > 0 && (
        <div className="mt-14 border-t border-gray-800 pt-10">
          <h2 className="text-2xl font-bold mb-6">
            🎬 {t("actorFilmography") || "Filmografi"}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
            {actor.movies.map((movie: any) => (
              <MovieCard key={movie.tmdbId} movie={movie} />
            ))}
          </div>
        </div>
      )}
    </PageTransition>
  );
}
