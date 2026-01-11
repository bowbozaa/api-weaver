import { v4 as uuidv4 } from "uuid";

export interface Design {
  id: string;
  name: string;
  description?: string;
  content: any;
  createdAt: Date;
  updatedAt: Date;
  versions: DesignVersion[];
}

export interface DesignVersion {
  id: string;
  designId: string;
  content: any;
  createdAt: Date;
  description?: string;
}

export interface Component {
  id: string;
  name: string;
  type: string;
  props: any;
  styles: any;
  createdAt: Date;
}

export interface ExportResult {
  code: string;
  language: string;
  framework: string;
}

export interface PreviewResult {
  url: string;
  expiresAt: Date;
}

export interface BackendConnection {
  designId: string;
  endpoint: string;
  method: string;
  connected: boolean;
}

const designs: Map<string, Design> = new Map();
const components: Map<string, Component> = new Map();

export async function generateDesign(params: {
  name: string;
  description?: string;
  template?: string;
  components?: string[];
}): Promise<Design> {
  const id = uuidv4();
  const now = new Date();
  
  const design: Design = {
    id,
    name: params.name,
    description: params.description,
    content: {
      template: params.template || "blank",
      components: params.components || [],
      layout: { type: "flex", direction: "column" },
    },
    createdAt: now,
    updatedAt: now,
    versions: [],
  };
  
  designs.set(id, design);
  return design;
}

export async function listDesigns(): Promise<Design[]> {
  return Array.from(designs.values());
}

export async function getDesign(id: string): Promise<Design | null> {
  return designs.get(id) || null;
}

export async function updateDesign(
  id: string,
  updates: Partial<Pick<Design, "name" | "description" | "content">>
): Promise<Design | null> {
  const design = designs.get(id);
  if (!design) return null;
  
  const version: DesignVersion = {
    id: uuidv4(),
    designId: id,
    content: { ...design.content },
    createdAt: new Date(),
    description: "Auto-saved before update",
  };
  design.versions.push(version);
  
  if (updates.name) design.name = updates.name;
  if (updates.description !== undefined) design.description = updates.description;
  if (updates.content) design.content = { ...design.content, ...updates.content };
  design.updatedAt = new Date();
  
  designs.set(id, design);
  return design;
}

export async function exportDesign(params: {
  designId: string;
  format: string;
  framework?: string;
}): Promise<ExportResult> {
  const design = designs.get(params.designId);
  if (!design) {
    throw new Error("Design not found");
  }
  
  const framework = params.framework || "react";
  let code = "";
  
  if (framework === "react") {
    code = `import React from 'react';

export function ${design.name.replace(/\s+/g, "")}() {
  return (
    <div className="container">
      {/* Generated from design: ${design.name} */}
      <h1>${design.name}</h1>
      ${design.description ? `<p>${design.description}</p>` : ""}
    </div>
  );
}`;
  } else if (framework === "vue") {
    code = `<template>
  <div class="container">
    <!-- Generated from design: ${design.name} -->
    <h1>${design.name}</h1>
    ${design.description ? `<p>${design.description}</p>` : ""}
  </div>
</template>

<script>
export default {
  name: '${design.name.replace(/\s+/g, "")}',
}
</script>`;
  } else {
    code = `<!-- Generated HTML for: ${design.name} -->
<div class="container">
  <h1>${design.name}</h1>
  ${design.description ? `<p>${design.description}</p>` : ""}
</div>`;
  }
  
  return {
    code,
    language: framework === "html" ? "html" : "typescript",
    framework,
  };
}

export async function createComponent(params: {
  name: string;
  type: string;
  props?: any;
  styles?: any;
}): Promise<Component> {
  const id = uuidv4();
  
  const component: Component = {
    id,
    name: params.name,
    type: params.type,
    props: params.props || {},
    styles: params.styles || {},
    createdAt: new Date(),
  };
  
  components.set(id, component);
  return component;
}

export async function listComponents(): Promise<Component[]> {
  return Array.from(components.values());
}

export async function getComponent(id: string): Promise<Component | null> {
  return components.get(id) || null;
}

export async function deleteComponent(id: string): Promise<boolean> {
  return components.delete(id);
}

export async function connectBackend(params: {
  designId: string;
  endpoint: string;
  method?: string;
}): Promise<BackendConnection> {
  const design = designs.get(params.designId);
  if (!design) {
    throw new Error("Design not found");
  }
  
  return {
    designId: params.designId,
    endpoint: params.endpoint,
    method: params.method || "GET",
    connected: true,
  };
}

export async function createPreview(params: {
  designId: string;
  options?: any;
}): Promise<PreviewResult> {
  const design = designs.get(params.designId);
  if (!design) {
    throw new Error("Design not found");
  }
  
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);
  
  return {
    url: `/preview/${params.designId}`,
    expiresAt,
  };
}

export async function getVersionHistory(designId: string): Promise<DesignVersion[]> {
  const design = designs.get(designId);
  if (!design) {
    throw new Error("Design not found");
  }
  
  return design.versions;
}

export async function restoreVersion(params: {
  designId: string;
  versionId: string;
}): Promise<Design | null> {
  const design = designs.get(params.designId);
  if (!design) return null;
  
  const version = design.versions.find(v => v.id === params.versionId);
  if (!version) {
    throw new Error("Version not found");
  }
  
  const currentVersion: DesignVersion = {
    id: uuidv4(),
    designId: params.designId,
    content: { ...design.content },
    createdAt: new Date(),
    description: "Before restore",
  };
  design.versions.push(currentVersion);
  
  design.content = { ...version.content };
  design.updatedAt = new Date();
  
  designs.set(params.designId, design);
  return design;
}
