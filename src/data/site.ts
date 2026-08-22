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
const href = z.union([externalUrl, internalHref]);

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
    focus: z.string().min(1),
    education: z.array(z.object({
      institution: z.string().min(1),
      degree: z.string().min(1),
      score: z.string().min(1),
      period: z.string().min(1),
    })).min(1),
    researchInterests: z.array(z.string().min(1)).min(1),
  }),
  selectedWork: z.array(z.object({
    title: z.string().min(1),
    kind: z.enum(['Research code', 'Research project', 'Open-source software']),
    year: z.string().min(1),
    summary: z.string().min(1),
    methods: z.string().min(1),
    href,
    relatedInterest: z.string().min(1),
    featured: z.boolean(),
  })),
  researchProjects: z.array(z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1),
    period: z.string().min(1),
    status: z.enum(['Under Review', 'Research Project', 'Ongoing', 'Intern Project']),
    mentorLabel: z.enum(['Advisor', 'Collaborator']),
    mentor: z.string().min(1),
    affiliation: z.string().min(1),
    summary: z.string().min(1),
    highlights: z.array(z.string().min(1)).min(1),
    methods: z.string().min(1),
    href: externalUrl.optional(),
  })),
  awards: z.array(z.object({
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
  const projectIds = data.researchProjects.map((project) => project.id);
  if (new Set(projectIds).size !== projectIds.length) {
    context.addIssue({ code: 'custom', path: ['researchProjects'], message: 'Project IDs must be unique' });
  }

  const navigationHrefs = data.navigation.map((item) => item.href);
  if (new Set(navigationHrefs).size !== navigationHrefs.length) {
    context.addIssue({ code: 'custom', path: ['navigation'], message: 'Navigation links must be unique' });
  }
});

const data = profileDataSchema.parse(rawData);

export const site = data.site;
export const profile = data.profile;
export const selectedWork = data.selectedWork;
export const researchProjects = data.researchProjects;
export const awards = data.awards;
export const cv = data.cv;
export const navigation = data.navigation;
