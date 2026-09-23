import type { RouteRecordRaw } from "vue-router";
import manifest from "../../content/manifest.json";

export const routes: RouteRecordRaw[] = [
  { path: "/", name: "home", component: () => import("../pages/HomePage.vue") },
  ...["preparation", "play", "create", "enemies", "campaigns"].map(
    (section) => ({
      path: `/articles/${section}`,
      name: `article-${section}`,
      component: () => import("../pages/HomePage.vue"),
      meta: { homeLayout: true },
    }),
  ),
  ...manifest.pages.map((p) => ({
    path: p.url,
    name: p.id,
    component: () => import("../pages/ArticlePage.vue"),
    meta: { pageId: p.id },
  })),
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("../pages/NotFoundPage.vue"),
  },
];
