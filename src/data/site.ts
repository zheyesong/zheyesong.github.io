import { z } from 'astro/zod';
import rawData from './profile.json';

const externalUrl = z.string().refine((value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}, 'Public URLs must be valid HTTPS URLs');
const internalHref = z.string().regex(/^\/(?!\/)/, 'Internal links must begin with one slash');
const catalogueId = z.string().regex(/^[A-Z]\.\d{2}$/, 'Use an A.01-style catalogue ID');
const slugId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const projectResourcesSchema = z.object({
  code: externalUrl.optional(),
  manuscript: externalUrl.optional(),
  data: externalUrl.optional(),
});

const softwareProjectSchema = z.object({
  catalogueId,
  title: z.string().min(1),
  year: z.string().min(1),
  summary: z.string().min(1),
  methods: z.string().min(1),
  href: externalUrl,
});

const profileDataSchema = z.object({
  site: z.object({
    name: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    url: externalUrl,
    email: z.email(),
    github: externalUrl,
  }),
  profile: z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    institution: z.string().min(1),
    statement: z.string().min(1),
    focusAreas: z.array(z.string().min(1)).length(4),
    education: z.array(z.object({
      catalogueId,
      institution: z.string().min(1),
      degree: z.string().min(1),
      score: z.string().min(1).optional(),
      visibleOnWebsite: z.boolean().default(true),
      period: z.string().min(1),
    })).min(1),
  }),
  softwareProjects: z.array(softwareProjectSchema),
  researchProjects: z.array(z.object({
    id: slugId,
    catalogueId,
    title: z.string().min(1),
    period: z.string().min(1),
    status: z.enum(['Under Review', 'Research Project', 'Ongoing', 'Intern Project']),
    mentorLabel: z.enum(['Advisor', 'Collaborator']).optional(),
    mentor: z.string().min(1).optional(),
    affiliation: z.string().min(1).optional(),
    summary: z.string().min(1),
    featured: z.boolean(),
    highlights: z.array(z.string().min(1)).min(1),
    methods: z.string().min(1),
    resources: projectResourcesSchema.optional(),
  })),
  technicalSkills: z.array(z.string().min(1)).min(1),
  awards: z.array(z.object({
    catalogueId,
    title: z.string().min(1),
    institution: z.string().min(1),
    year: z.string().min(1),
  })),
  cv: z.object({
    updated: z.string().min(1),
    pdfHref: internalHref,
  }),
  navigation: z.array(z.object({
    label: z.string().min(1),
    href: internalHref,
  })).min(1),
}).superRefine((data, context) => {
  data.researchProjects.forEach((project, index) => {
    const peopleFields = [project.mentorLabel, project.mentor, project.affiliation];
    if (peopleFields.some(Boolean) && !peopleFields.every(Boolean)) {
      context.addIssue({
        code: 'custom', path: ['researchProjects', index],
        message: 'Supply all mentor fields together, or omit all of them',
      });
    }
  });
  const projectIds = data.researchProjects.map((project) => project.id);
  if (new Set(projectIds).size !== projectIds.length) {
    context.addIssue({ code: 'custom', path: ['researchProjects'], message: 'Project IDs must be unique' });
  }

  const entityCatalogueIds = [
    ...data.profile.education.map((entry) => entry.catalogueId),
    ...data.researchProjects.map((entry) => entry.catalogueId),
    ...data.awards.map((entry) => entry.catalogueId),
    ...data.softwareProjects.map((entry) => entry.catalogueId),
  ];
  if (new Set(entityCatalogueIds).size !== entityCatalogueIds.length) {
    context.addIssue({ code: 'custom', message: 'Entity catalogue IDs must be unique' });
  }

  const navigationHrefs = data.navigation.map((item) => item.href);
  if (new Set(navigationHrefs).size !== navigationHrefs.length) {
    context.addIssue({ code: 'custom', path: ['navigation'], message: 'Navigation links must be unique' });
  }
});

const data = profileDataSchema.parse(rawData);

export const site = data.site;
export const profile = data.profile;
export const websiteEducation = profile.education.filter((entry) => entry.visibleOnWebsite);
export const researchProjects = data.researchProjects;
export type ResearchProject = (typeof researchProjects)[number];
export const featuredResearchProjects = researchProjects.filter((project) => project.featured);
export const softwareProjects = data.softwareProjects;
export const awards = data.awards;
export const technicalSkills = data.technicalSkills;
export const cv = data.cv;
export const navigation = data.navigation;
