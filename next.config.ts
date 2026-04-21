import type { NextConfig } from "next";

const strictTransportSecurityValue =
  process.env.MICROSAAS_FACTORY_LONG_HSTS === "1"
    ? "max-age=31536000; includeSubDomains"
    : "max-age=86400";

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: strictTransportSecurityValue,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.stripe.com https://api.github.com https://api.resend.com https://resend.com",
      "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.firebaseapp.com https://checkout.stripe.com",
      "object-src 'none'",
    ].join("; "),
  },
] satisfies Array<{ key: string; value: string }>;

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
