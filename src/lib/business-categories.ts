export type BusinessCategory = {
  key: string;
  label: string;
};

const BUSINESS_CATEGORIES: Array<{ match: RegExp; category: BusinessCategory }> = [
  { match: /coffee|cafe/i, category: { key: "coffee", label: "Coffee Shop" } },
  {
    match: /restaurant|food|bakery|catering/i,
    category: { key: "restaurant", label: "Restaurant" },
  },
  { match: /beauty|spa|salon|nail|barber/i, category: { key: "beauty", label: "Beauty & Spa" } },
  {
    match: /fashion|clothing|boutique|apparel/i,
    category: { key: "fashion", label: "Fashion & Boutique" },
  },
  {
    match: /gym|fitness|sport|wellness/i,
    category: { key: "fitness", label: "Fitness & Wellness" },
  },
  {
    match: /health|medical|clinic|dental|pharmacy/i,
    category: { key: "health", label: "Health & Medical" },
  },
  {
    match: /school|education|academy|training/i,
    category: { key: "education", label: "Education & Training" },
  },
  {
    match: /real estate|property|apartment|construction/i,
    category: { key: "property", label: "Property & Construction" },
  },
  { match: /car|auto|automotive/i, category: { key: "automotive", label: "Automotive" } },
  {
    match: /tech|software|digital|ai|marketing/i,
    category: { key: "technology", label: "Technology & Digital" },
  },
  { match: /shop|store|retail|market/i, category: { key: "retail", label: "Retail & Store" } },
];

export function getBusinessCategory(category: string | null | undefined): BusinessCategory {
  const normalized = category?.trim().replace(/\s+/g, " ") ?? "";
  if (!normalized) return { key: "uncategorized", label: "Uncategorized" };

  const knownCategory = BUSINESS_CATEGORIES.find(({ match }) => match.test(normalized))?.category;
  if (knownCategory) return knownCategory;

  return {
    key: `custom:${normalized.toLocaleLowerCase()}`,
    label: normalized,
  };
}
