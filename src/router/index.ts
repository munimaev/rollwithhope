import type { RouteRecordRaw } from "vue-router";
import manifest from "../../content/manifest.json";

export const routes: RouteRecordRaw[] = [
  { path: "/", name: "home", component: () => import("../pages/HomePage.vue") },
  ...manifest.pages
    .filter((p) => p.url !== null)
    .map((p) => ({
      path: p.url as string,
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
