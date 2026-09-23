/**
 * Tryb „Filmik” — wersja panelu pod nagranie instruktażowe.
 *
 * Włącz:  NEXT_PUBLIC_FILMIK=1  +  pnpm seed:filmik
 * Wyłącz / „powróć”: usuń flagę z .env.local  +  pnpm seed:clean  (+ restart pnpm dev)
 *
 * Gdy flaga jest wyłączona, ten moduł nic nie zmienia w zachowaniu aplikacji.
 */

export function isFilmikMode(): boolean {
  return process.env.NEXT_PUBLIC_FILMIK === "1" || process.env.NEXT_PUBLIC_FILMIK === "true";
}
