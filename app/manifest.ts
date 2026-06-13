import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wicoach — Coach fitness & nutrition",
    short_name: "Wicoach",
    description: "Suivi poids, repas, entraînement et coach IA.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f3faf6",
    theme_color: "#16a34a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
