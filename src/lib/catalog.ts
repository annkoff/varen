import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

const cardInclude = {
  images: { orderBy: { sortOrder: "asc" }, take: 1 },
} satisfies Prisma.ProjectInclude;

export type ProjectCardData = Prisma.ProjectGetPayload<{ include: typeof cardInclude }>;

export async function getProjects(opts: { featured?: boolean; material?: string; floors?: number; take?: number } = {}) {
  return db.project.findMany({
    where: {
      published: true,
      ...(opts.featured ? { featured: true } : {}),
      ...(opts.material ? { material: opts.material } : {}),
      ...(opts.floors ? { floors: opts.floors } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: opts.take,
    include: cardInclude,
  });
}

export const getProject = cache(async (slug: string) => {
  return db.project.findFirst({
    where: { slug, published: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      reviews: { where: { published: true }, orderBy: { sortOrder: "asc" } },
    },
  });
});

export async function getProjectMaterials() {
  const rows = await db.project.findMany({ where: { published: true }, select: { material: true }, distinct: ["material"] });
  return rows.map((r) => r.material).sort();
}

export async function getReviews(take?: number) {
  return db.review.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take,
    include: { project: { select: { slug: true, title: true } } },
  });
}

export type ReviewWithProject = Awaited<ReturnType<typeof getReviews>>[number];
