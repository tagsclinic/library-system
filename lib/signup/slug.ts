export function slugifyOrganizationName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function workspaceUrlPreview(slug: string): string {
  const safe = slug || "your-organization";
  return `${safe}.libraryinventory.com`;
}
