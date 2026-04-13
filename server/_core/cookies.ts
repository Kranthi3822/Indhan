import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isLocalRequest(req: Request): boolean {
  const hostname = req.hostname;
  return (
    LOCAL_HOSTS.has(hostname) ||
    isIpAddress(hostname) ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const isLocal = isLocalRequest(req);

  if (isLocal) {
    // Local dev: SameSite=Lax works fine without Secure
    return {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    };
  }

  // Production: SameSite=None REQUIRES Secure=true per the browser spec.
  // Browsers silently drop SameSite=None cookies that lack the Secure flag,
  // which breaks the OAuth flow. The Manus proxy always terminates TLS,
  // so it is always safe to force secure:true here.
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
  };
}
