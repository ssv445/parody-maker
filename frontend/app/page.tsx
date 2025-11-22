"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProjectSelector from "@/components/ProjectSelector";
import SegmentList from "@/components/SegmentList";
import PreviewPlayer from "@/components/PreviewPlayer";
import GenerateButton from "@/components/GenerateButton";
import { Project, Segment } from "@/lib/types";
import { loadProjects, saveProjects, createNewProject } from "@/lib/localStorage";
import { validateAllSegments } from "@/lib/validation";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(0);

  // Load projects on mount
  useEffect(() => {
    const loadedProjects = loadProjects();

    // Sort projects by most recently updated
    const sortedProjects = loadedProjects.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    setProjects(sortedProjects);

    // Check URL for project ID
    const urlProjectId = searchParams.get('project');

    if (urlProjectId && sortedProjects.find(p => p.id === urlProjectId)) {
      // Use project from URL if it exists
      setCurrentProjectId(urlProjectId);
    } else if (sortedProjects.length > 0) {
      // Automatically select the most recently updated project
      const projectId = sortedProjects[0].id;
      setCurrentProjectId(projectId);
      router.replace(`/?project=${projectId}`);
    } else {
      // Create a new project with random name if none exist
      const newProject = createNewProject();
      setProjects([newProject]);
      setCurrentProjectId(newProject.id);
      router.replace(`/?project=${newProject.id}`);
    }
  }, []);

  const currentProject = projects.find(p => p.id === currentProjectId);

  useEffect(() => {
    if (currentProject) {
      setSegments(currentProject.segments);
    }
  }, [currentProjectId]);

  useEffect(() => {
    if (currentProjectId && segments.length >= 0) {
      const updatedProjects = projects.map(p =>
        p.id === currentProjectId
          ? { ...p, segments, updatedAt: new Date().toISOString() }
          : p
      );
      setProjects(updatedProjects);
      saveProjects(updatedProjects);
    }
  }, [segments]);

  const handleProjectChange = (projectId: string) => {
    setCurrentProjectId(projectId);
    setCurrentSegmentIndex(0);
    router.push(`/?project=${projectId}`);
  };

  const handleProjectCreate = () => {
    const newProject = createNewProject();
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    setCurrentProjectId(newProject.id);
    saveProjects(updatedProjects);
    router.push(`/?project=${newProject.id}`);
  };

  const handleProjectRename = (projectId: string, newName: string) => {
    const updatedProjects = projects.map(p =>
      p.id === projectId ? { ...p, name: newName } : p
    );
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
  };

  const handleProjectDelete = (projectId: string) => {
    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    saveProjects(updatedProjects);

    if (projectId === currentProjectId) {
      if (updatedProjects.length > 0) {
        const newProjectId = updatedProjects[0].id;
        setCurrentProjectId(newProjectId);
        router.push(`/?project=${newProjectId}`);
      } else {
        const newProject = createNewProject();
        setProjects([newProject]);
        setCurrentProjectId(newProject.id);
        router.push(`/?project=${newProject.id}`);
      }
    }
  };

  const handleProjectDuplicate = (projectId: string) => {
    const projectToDuplicate = projects.find(p => p.id === projectId);
    if (projectToDuplicate) {
      const duplicatedProject: Project = {
        ...projectToDuplicate,
        id: crypto.randomUUID(),
        name: `${projectToDuplicate.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedProjects = [...projects, duplicatedProject];
      setProjects(updatedProjects);
      saveProjects(updatedProjects);
      setCurrentProjectId(duplicatedProject.id);
      router.push(`/?project=${duplicatedProject.id}`);
    }
  };

  const handleExportSegments = () => {
    if (!currentProject || segments.length === 0) {
      alert("No segments to export!");
      return;
    }

    const exportData = segments.map(s => ({
      url: s.url,
      startTime: s.startTime,
      endTime: s.endTime,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentProject.name.replace(/[^a-z0-9]/gi, "_")}_segments.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSegments = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);

        if (!Array.isArray(importedData)) {
          alert("Invalid JSON format. Expected an array of segments.");
          return;
        }

        // Validate the structure
        const isValid = importedData.every(item =>
          item.url && item.startTime && item.endTime
        );

        if (!isValid) {
          alert("Invalid segment format. Each segment must have url, startTime, and endTime.");
          return;
        }

        // Convert to full segments
        const { getYouTubeId, getYouTubeThumbnail } = require("@/lib/youtube");
        const { fetchYouTubeTitle } = require("@/lib/youtube");

        const newSegments: Segment[] = importedData.map((item: any) => {
          const videoId = getYouTubeId(item.url) || "";
          return {
            id: crypto.randomUUID(),
            songTitle: `Video ${videoId}`,
            url: item.url,
            videoId,
            startTime: item.startTime,
            endTime: item.endTime,
            thumbnail: getYouTubeThumbnail(videoId),
            verified: true,
            validationErrors: [],
          };
        });

        // Fetch titles asynchronously
        newSegments.forEach(async (segment) => {
          const title = await fetchYouTubeTitle(segment.videoId);
          segment.songTitle = title;
          setSegments([...newSegments]);
        });

        setSegments(newSegments);
        alert(`Imported ${newSegments.length} segments successfully!`);
      } catch (error) {
        alert("Failed to parse JSON file. Please check the file format.");
        console.error("Import error:", error);
      }
    };
    reader.readAsText(file);

    // Reset input value
    event.target.value = "";
  };

  const validationResult = validateAllSegments(segments);
  const isValid = validationResult.isValid;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
              Parody Song Generator
            </h1>
            <div className="flex gap-2">
              <button
                onClick={handleExportSegments}
                disabled={segments.length === 0}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                title="Export segments as JSON"
              >
                Export
              </button>
              <label className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer transition-colors">
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSegments}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Centered Preview */}
      <main className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* Project Selector */}
        <div className="flex-shrink-0 mb-4 sm:mb-6">
          <ProjectSelector
            projects={projects}
            currentProjectId={currentProjectId}
            onProjectChange={handleProjectChange}
            onProjectCreate={handleProjectCreate}
            onProjectRename={handleProjectRename}
            onProjectDelete={handleProjectDelete}
            onProjectDuplicate={handleProjectDuplicate}
          />
        </div>

        {/* Preview Player - Center */}
        <div className="flex-shrink-0 mb-4 sm:mb-6">
          <PreviewPlayer
            segments={segments}
            currentSegmentIndex={currentSegmentIndex}
            onSegmentChange={setCurrentSegmentIndex}
            downloadButton={
              <GenerateButton
                segments={segments}
                isValid={isValid}
                validationErrors={validationResult.errors}
                projectName={currentProject?.name || "Untitled"}
                compact
              />
            }
          />
        </div>

        {/* Horizontal Segment List */}
        <div className="flex-1 min-h-0">
          <SegmentList
            segments={segments}
            onSegmentsChange={setSegments}
            currentSegmentIndex={currentSegmentIndex}
            onSegmentClick={setCurrentSegmentIndex}
            onPreview={(videoId, start, end) => {
              if ((window as any).__previewHandler) {
                (window as any).__previewHandler(videoId, start, end);
              }
            }}
            horizontal
          />
        </div>
      </main>
    </div>
  );
}
