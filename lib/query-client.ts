import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 min : les données sont fraîches pendant 1 min, pas de re-fetch automatique
      gcTime: 5 * 60 * 1000, // 5 min : conservation en cache après la dernière utilisation
      retry: 1, // 1 seul retry en cas d'échec (pas de boucle infinie)
      refetchOnWindowFocus: false, // sur mobile, le focus ne signifie rien d'utile
    },
    mutations: {
      retry: 0, // pas de retry sur les mutations par défaut
    },
  },
});
