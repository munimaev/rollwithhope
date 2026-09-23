import manifest from "../../content/manifest.json";

export interface ManifestPage {
  id: string;
  url: string;
  sectionId: string;
  title: string;
  layout: string;
  tags: string[];
  original: string | null;
  vaultRelPath: string;
  isIndex: boolean;
  parentId: string | null;
  sortKey: string;
  banner: string | null;
  backlinks: string[];
}

export interface ManifestSection {
  id: string;
  title: string;
  urlPrefix: string;
  color: string;
}

const pagesById = new Map(manifest.pages.map((p) => [p.id, p as ManifestPage]));
const pagesByUrl = new Map(
  manifest.pages.map((p) => [p.url, p as ManifestPage]),
);

function getInferredParentId(page: ManifestPage): string | null {
  if (page.parentId && pagesById.has(page.parentId)) return page.parentId;

  const segments = page.id.split("/");
  for (let i = segments.length - 1; i > 0; i -= 1) {
    const candidate = segments.slice(0, i).join("/");
    if (pagesById.has(candidate)) return candidate;
  }
  return null;
}

export function useManifest() {
  return {
    sections: manifest.sections as ManifestSection[],
    pages: manifest.pages as ManifestPage[],
  };
}

export function getPageById(id: string): ManifestPage | undefined {
  return pagesById.get(id);
}

export function getPageByUrl(url: string): ManifestPage | undefined {
  return pagesByUrl.get(url);
}

export function getSection(id: string): ManifestSection | undefined {
  return manifest.sections.find((s) => s.id === id);
}

/** Дети страницы (по parentId), в порядке книги (sortKey). */
export function getChildren(
  pageId: string | null,
  sectionId: string,
): ManifestPage[] {
  return (manifest.pages as ManifestPage[])
    .filter(
      (p) => getInferredParentId(p) === pageId && p.sectionId === sectionId,
    )
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

/** Хлебные крошки: от корня раздела до страницы. */
export function getBreadcrumbs(page: ManifestPage): ManifestPage[] {
  const chain: ManifestPage[] = [];
  let current: ManifestPage | undefined = page;
  const guard = new Set<string>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    chain.unshift(current);
    const parentId = getInferredParentId(current);
    current = parentId ? pagesById.get(parentId) : undefined;
  }
  return chain;
}

/** Плоский список страниц раздела в порядке книги — для prev/next. */
export function getFlatOrder(sectionId: string): ManifestPage[] {
  return (manifest.pages as ManifestPage[])
    .filter((p) => p.sectionId === sectionId)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

export function getPrevNext(page: ManifestPage): {
  prev: ManifestPage | null;
  next: ManifestPage | null;
} {
  const flat = getFlatOrder(page.sectionId);
  const idx = flat.findIndex((p) => p.id === page.id);
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}

export function getBacklinkPages(page: ManifestPage): ManifestPage[] {
  return page.backlinks
    .map((url) => pagesByUrl.get(url))
    .filter((p): p is ManifestPage => !!p);
}
