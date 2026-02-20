import type {
  GenerateParseRequest,
  GenerateParseResponse,
  GenerateConfirmRequest,
  GenerateConfirmResponse,
  ResumeListItem,
  ResumeDetail,
  UpdateResumeRequest,
  TemplateInfo,
  PersonalProfile,
  ExportRequest,
} from '@resu/shared';

const BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ─── Generate endpoints ───

export function parseJD(data: GenerateParseRequest) {
  return fetchJSON<GenerateParseResponse & { tokenUsage: Record<string, number> }>(
    '/generate/parse',
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export function confirmGeneration(data: GenerateConfirmRequest) {
  return fetchJSON<GenerateConfirmResponse>('/generate/confirm', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Resume CRUD ───

export function listResumes() {
  return fetchJSON<ResumeListItem[]>('/resumes');
}

export function getResume(id: string) {
  return fetchJSON<ResumeDetail>(`/resume/${id}`);
}

export function updateResume(id: string, data: UpdateResumeRequest) {
  return fetchJSON<{ success: boolean }>(`/resume/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteResume(id: string) {
  return fetchJSON<{ success: boolean }>(`/resume/${id}`, {
    method: 'DELETE',
  });
}

// ─── Export ───

export async function exportResumePDF(id: string, config?: ExportRequest): Promise<Blob> {
  const response = await fetch(`${BASE}/resume/${id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config ?? {}),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Export failed' }));
    throw new Error(error.error || 'Export failed');
  }

  return response.blob();
}

// ─── Templates & Profile ───

export function listTemplates() {
  return fetchJSON<TemplateInfo[]>('/templates');
}

export function getProfile() {
  return fetchJSON<PersonalProfile>('/profile');
}

export function updateProfile(data: PersonalProfile) {
  return fetchJSON<{ success: boolean }>('/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
