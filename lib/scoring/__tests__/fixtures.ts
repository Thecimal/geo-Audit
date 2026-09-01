import type { ProjectData, FieldValue } from "../types";

function missing<T>(value: T): FieldValue<T> {
  return { value, confidence: 0, source: "inferred", status: "missing" };
}

function confirmed<T>(value: T, source = "https://example.com"): FieldValue<T> {
  return { value, confidence: 1, source, status: "confirmed" };
}

/** A site the crawler found almost nothing useful on. */
export function worstCaseProjectData(): ProjectData {
  return {
    projectUrl: "https://worst-example.com",
    crawledAt: new Date(2026, 0, 1).toISOString(),
    pages: [
      {
        url: "https://worst-example.com/",
        depth: 0,
        statusCode: 200,
        title: null,
        metaDescription: null,
        wordCount: 40,
        headings: { h1: [], h2: [], h3: [] },
        internalLinks: [],
        externalLinks: [],
        images: [],
        jsonLd: [],
        openGraph: {},
        canonical: null,
        hasViewportMeta: false,
        bodyText: "Welcome.",
        publishedDate: null,
        author: null,
      },
    ],
    technicalFindings: {
      totalPages: 1,
      brokenLinks: [
        { from: "https://worst-example.com/", to: "https://worst-example.com/dead", status: 404 },
      ],
      orphanPages: ["https://worst-example.com/orphan"],
      duplicateTitles: [["https://worst-example.com/", "https://worst-example.com/2"]],
      duplicateDescriptions: [],
      robotsTxtFound: false,
      sitemapFound: false,
      sitemapUrls: [],
      llmsTxtFound: false,
      httpsUsed: false,
      avgLoadTimeMs: 4200,
    },
    businessProfile: {
      companyName: missing(""),
      tagline: missing(""),
      description: missing(""),
      industry: missing(""),
      foundedYear: missing(null),
      headquarters: missing(""),
      services: missing([]),
      targetAudience: missing(""),
      valueProposition: missing(""),
      phone: missing(""),
      email: missing(""),
      socialProfiles: missing([]),
    },
    entities: [],
    relationships: [],
  };
}

/** A site with every signal the scoring engine looks for, done well. */
export function bestCaseProjectData(): ProjectData {
  const url = "https://best-example.com";
  return {
    projectUrl: url,
    crawledAt: new Date(2026, 0, 1).toISOString(),
    pages: [
      {
        url: `${url}/`,
        depth: 0,
        statusCode: 200,
        title: "Best Example Co — Cloud Backup for Small Teams",
        metaDescription:
          "Best Example Co provides encrypted, automated cloud backup built for small teams who can't afford downtime.",
        wordCount: 900,
        headings: {
          h1: ["Cloud backup that just works"],
          h2: ["What is Best Example Co?", "How does it work?", "Frequently Asked Questions"],
          h3: ["Is my data encrypted?", "How much does it cost?"],
        },
        internalLinks: [`${url}/about`, `${url}/pricing`, `${url}/faq`],
        externalLinks: ["https://www.nist.gov/cybersecurity", "https://www.iso.org/isoiec-27001"],
        images: [{ src: `${url}/logo.png`, alt: "Best Example Co logo" }],
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Best Example Co",
            url,
            logo: `${url}/logo.png`,
          },
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Automated Cloud Backup",
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [],
          },
        ],
        openGraph: { "og:site_name": "Best Example Co", "og:title": "Best Example Co" },
        canonical: `${url}/`,
        hasViewportMeta: true,
        bodyText:
          "Best Example Co backs up 40,000 devices every night with 99.99% uptime.\n\nOur customers save an average of 12 hours per month.\n\nEncryption is applied before data ever leaves the device.",
        publishedDate: "2026-01-15",
        author: "Jamie Rivera",
      },
      {
        url: `${url}/about`,
        depth: 1,
        statusCode: 200,
        title: "About Best Example Co",
        metaDescription: "Meet the team behind Best Example Co.",
        wordCount: 700,
        headings: { h1: ["About us"], h2: ["Our mission", "Our team"], h3: [] },
        internalLinks: [`${url}/`],
        externalLinks: ["https://www.crunchbase.com/organization/best-example-co"],
        images: [],
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Best Example Co",
            url,
          },
        ],
        openGraph: { "og:site_name": "Best Example Co" },
        canonical: `${url}/about`,
        hasViewportMeta: true,
        bodyText: "Founded in 2019, Best Example Co has grown to serve 4,000 customers across 30 countries.",
        publishedDate: "2026-01-10",
        author: "Jamie Rivera",
      },
    ],
    technicalFindings: {
      totalPages: 2,
      brokenLinks: [],
      orphanPages: [],
      duplicateTitles: [],
      duplicateDescriptions: [],
      robotsTxtFound: true,
      sitemapFound: true,
      sitemapUrls: [`${url}/sitemap.xml`],
      llmsTxtFound: true,
      httpsUsed: true,
      avgLoadTimeMs: 400,
    },
    businessProfile: {
      companyName: confirmed("Best Example Co"),
      tagline: confirmed("Cloud backup that just works"),
      description: confirmed(
        "Best Example Co provides encrypted, automated cloud backup built for small teams who can't afford downtime."
      ),
      industry: confirmed("Cloud Storage & Backup"),
      foundedYear: confirmed(2019),
      headquarters: confirmed("Austin, TX"),
      services: confirmed(["Automated Cloud Backup", "Encrypted File Sync", "Disaster Recovery"]),
      targetAudience: confirmed("Small teams without dedicated IT staff"),
      valueProposition: confirmed("Backup that runs itself, with encryption on by default."),
      phone: confirmed("+1-512-555-0100"),
      email: confirmed("hello@best-example.com"),
      socialProfiles: confirmed(["https://twitter.com/bestexampleco", "https://linkedin.com/company/bestexampleco"]),
    },
    entities: [
      { id: "e1", name: "Automated Cloud Backup", type: "SERVICE", confidence: 0.95 },
      { id: "e2", name: "Encrypted File Sync", type: "SERVICE", confidence: 0.9 },
      { id: "e3", name: "Disaster Recovery", type: "PRODUCT", confidence: 0.85 },
      { id: "e4", name: "Jamie Rivera", type: "PERSON", confidence: 0.8 },
      { id: "e5", name: "Best Example Co", type: "ORGANIZATION", confidence: 1 },
    ],
    relationships: [
      { id: "r1", fromEntityId: "e5", toEntityId: "e1", relationType: "offers" },
      { id: "r2", fromEntityId: "e5", toEntityId: "e2", relationType: "offers" },
      { id: "r3", fromEntityId: "e4", toEntityId: "e5", relationType: "works_at" },
    ],
  };
}
