import { Project, Segment } from "./types";

const PROJECTS_KEY = "parody_projects";

/**
 * Migrates old segments to include songTitle field
 */
function migrateSegment(segment: any, index: number): Segment {
  return {
    ...segment,
    songTitle: segment.songTitle || `Segment ${index + 1}`,
  };
}

/**
 * Migrates projects to support new schema
 */
function migrateProjects(projects: any[]): Project[] {
  return projects.map((project) => ({
    ...project,
    segments: project.segments.map((seg: any, idx: number) =>
      migrateSegment(seg, idx)
    ),
  }));
}

export function loadProjects(): Project[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(PROJECTS_KEY);
    if (!stored) return [];

    const projects = JSON.parse(stored);
    return migrateProjects(projects);
  } catch (error) {
    console.error("Error loading projects:", error);
    return [];
  }
}

export function saveProjects(projects: Project[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("Error saving projects:", error);
  }
}

export function createNewProject(): Project {
  const timestamp = Date.now();
  return {
    id: crypto.randomUUID(),
    name: `Parody ${timestamp}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    segments: [],
  };
}

export function clearAllProjects(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROJECTS_KEY);
}
