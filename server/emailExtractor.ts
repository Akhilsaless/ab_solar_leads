import axios from "axios";
import * as cheerio from "cheerio";

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Emails to skip — generic/noreply/example addresses
const SKIP_PATTERNS = [
  /^noreply@/i,
  /^no-reply@/i,
  /^donotreply@/i,
  /^example@/i,
  /^test@/i,
  /^admin@example/i,
  /^info@example/i,
  /^user@example/i,
  /^email@example/i,
  /^support@example/i,
  /@sentry\./i,
  /@example\./i,
  /@domain\./i,
  /@yourdomain\./i,
  /@yoursite\./i,
  /@website\./i,
  /\.png$/i,
  /\.jpg$/i,
  /\.gif$/i,
  /\.svg$/i,
  /\.css$/i,
  /\.js$/i,
];

function isValidEmail(email: string): boolean {
  if (SKIP_PATTERNS.some((p) => p.test(email))) return false;
  // Must have a real TLD (2-6 chars)
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1];
  const tld = domain.split(".").pop() || "";
  if (tld.length < 2 || tld.length > 6) return false;
  return true;
}

function extractEmailsFromText(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) || [];
  return matches.filter(isValidEmail);
}

async function fetchPage(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: timeoutMs,
      maxRedirects: 3,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SalesScraper/1.0; +https://salessquad.in)",
        Accept: "text/html,application/xhtml+xml",
      },
      // Don't throw on 4xx/5xx — just return whatever we get
      validateStatus: () => true,
    });
    if (typeof response.data === "string") return response.data;
    return null;
  } catch {
    return null;
  }
}

function normalizeUrl(base: string, path: string): string {
  try {
    return new URL(path, base).href;
  } catch {
    return "";
  }
}

/**
 * Visit a business website and try to extract a contact email.
 * Checks homepage, then /contact, then /about — stops as soon as one email is found.
 * Returns null if no email is found or extraction fails.
 */
export async function extractEmailFromWebsite(
  websiteUrl: string,
  timeoutPerPageMs = 4000
): Promise<string | null> {
  // Normalise URL
  let base = websiteUrl.trim();
  if (!base.startsWith("http://") && !base.startsWith("https://")) {
    base = "https://" + base;
  }

  const pagesToTry = [
    base,
    normalizeUrl(base, "/contact"),
    normalizeUrl(base, "/contact-us"),
    normalizeUrl(base, "/about"),
  ].filter(Boolean);

  for (const pageUrl of pagesToTry) {
    const html = await fetchPage(pageUrl, timeoutPerPageMs);
    if (!html) continue;

    const $ = cheerio.load(html);

    // 1. Check mailto: links first — most reliable
    const mailtoEmails: string[] = [];
    $("a[href^='mailto:']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const email = href.replace(/^mailto:/i, "").split("?")[0].trim();
      if (email && isValidEmail(email)) mailtoEmails.push(email);
    });
    if (mailtoEmails.length > 0) return mailtoEmails[0];

    // 2. Scan visible text for email patterns
    const bodyText = $("body").text();
    const textEmails = extractEmailsFromText(bodyText);
    if (textEmails.length > 0) return textEmails[0];

    // 3. Scan raw HTML (catches obfuscated or data-email attrs)
    const htmlEmails = extractEmailsFromText(html);
    if (htmlEmails.length > 0) return htmlEmails[0];
  }

  return null;
}
