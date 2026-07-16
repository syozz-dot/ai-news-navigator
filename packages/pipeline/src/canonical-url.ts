const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "ref_src",
  "ref_url",
  "spm",
]);

function isTrackingParameter(name: string): boolean {
  return (
    name.toLowerCase().startsWith("utm_") ||
    TRACKING_PARAMETERS.has(name.toLowerCase())
  );
}

export class InvalidUrlError extends Error {
  override readonly name = "InvalidUrlError";
}

export function canonicalizeUrl(input: string): string {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    throw new InvalidUrlError(`Invalid URL: ${input}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidUrlError(`Unsupported URL protocol: ${url.protocol}`);
  }

  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";

  if (
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
  ) {
    url.port = "";
  }

  const parameters = [...url.searchParams.entries()]
    .filter(([name]) => !isTrackingParameter(name))
    .sort(([leftName, leftValue], [rightName, rightValue]) => {
      const nameComparison = leftName.localeCompare(rightName);
      return nameComparison === 0
        ? leftValue.localeCompare(rightValue)
        : nameComparison;
    });

  url.search = "";
  for (const [name, value] of parameters) {
    url.searchParams.append(name, value);
  }

  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}
