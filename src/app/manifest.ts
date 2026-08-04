import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mi edificio",
    short_name: "Mi edificio",
    description: "Administración del consorcio en una app",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    // El mismo fondo que la app, para que el splash de Android no arranque
    // con un blanco distinto al de la primera pantalla.
    background_color: "#fbfaf7",
    theme_color: "#18181b",
    lang: "es-AR",
    scope: "/",
    categories: ["productivity", "finance"],
    // Los tamaños van explícitos y no en "any": `any` es para SVG o cuando no
    // se puede determinar el tamaño, y tanto Bubblewrap (para empaquetar el
    // TWA) como Play buscan un ícono de 512×512 declarado como tal.
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
