import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
    // Los comprobantes se suben por Server Action vía FormData. El default de
    // 1MB rechaza el request antes de correr la validación de 4MB, y una foto
    // de celular casi siempre pesa más. Damos holgura sobre el tope de la UI.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
