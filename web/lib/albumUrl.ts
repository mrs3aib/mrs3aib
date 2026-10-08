/** Public addresses use the stable session slug; API calls still use its ID. */
export function albumPath(category: string, slug: string): string {
  const name = encodeURIComponent(slug);
  return category === "weddings"
    ? `/wedding/${name}`
    : `/category/${category}/${name}`;
}
