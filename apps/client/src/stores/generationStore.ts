import { create } from 'zustand';
import type {
  ParsedJobDescription,
  RelevanceSelection,
  ResumeData,
  CoverLetterData,
  ATSScoreResult,
  GenerationConfig,
} from '@resu/shared';

export type PipelineStage =
  | 'idle'
  | 'parsing' // Step 1: Parsing JD
  | 'enriching' // Step 1.5: Skill graph analysis
  | 'planning' // Step 2: Strategic planning
  | 'selecting' // Step 3: Selecting relevant items
  | 'reviewing' // Checkpoint: User reviewing selections
  | 'generating' // Step 4: Generating resume
  | 'scoring' // Step 5: ATS scoring
  | 'critiquing' // Step 5.5: Critic reviewing resume
  | 'revising' // Step 5.6: Revising based on critique
  | 'cover-letter' // Step 6: Generating cover letter
  | 'complete' // All done
  | 'error';

interface GenerationState {
  // Pipeline state
  stage: PipelineStage;
  error: string | null;

  // Generation inputs
  jdText: string;
  config: GenerationConfig;

  // Pipeline outputs
  parsedJD: ParsedJobDescription | null;
  relevanceSelection: RelevanceSelection | null;
  resumeData: ResumeData | null;
  coverLetter: CoverLetterData | null;
  atsScore: ATSScoreResult | null;
  resumeId: string | null;

  // Current editing state
  activeTemplateId: string;
  editMode: boolean;

  // Actions
  setJdText: (text: string) => void;
  setConfig: (config: Partial<GenerationConfig>) => void;
  setStage: (stage: PipelineStage) => void;
  setError: (error: string | null) => void;
  setParsedJD: (parsedJD: ParsedJobDescription) => void;
  setRelevanceSelection: (selection: RelevanceSelection) => void;
  setResumeData: (data: ResumeData) => void;
  setCoverLetter: (data: CoverLetterData) => void;
  setATSScore: (score: ATSScoreResult) => void;
  setResumeId: (id: string) => void;
  setTemplate: (templateId: string) => void;
  toggleEditMode: () => void;
  reset: () => void;
}

const defaultConfig: GenerationConfig = {
  tone: 'professional',
  skillsToEmphasize: [],
  targetPageLength: 1,
  templateId: 'ats-classic',
};

export const useGenerationStore = create<GenerationState>((set) => ({
  stage: 'idle',
  error: null,
  jdText: '',
  config: defaultConfig,
  parsedJD: null,
  relevanceSelection: null,
  resumeData: null,
  coverLetter: null,
  atsScore: null,
  resumeId: null,
  activeTemplateId: 'ats-classic',
  editMode: false,

  setJdText: (text) => set({ jdText: text }),
  setConfig: (config) => set((s) => ({ config: { ...s.config, ...config } })),
  setStage: (stage) => set({ stage, error: stage === 'error' ? undefined : null }),
  setError: (error) => set({ error, stage: error ? 'error' : 'idle' }),
  setParsedJD: (parsedJD) => set({ parsedJD }),
  setRelevanceSelection: (selection) => set({ relevanceSelection: selection }),
  setResumeData: (data) => set({ resumeData: data }),
  setCoverLetter: (data) => set({ coverLetter: data }),
  setATSScore: (score) => set({ atsScore: score }),
  setResumeId: (id) => set({ resumeId: id }),
  setTemplate: (templateId) => set({ activeTemplateId: templateId }),
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
  reset: () =>
    set({
      stage: 'idle',
      error: null,
      jdText: '',
      config: defaultConfig,
      parsedJD: null,
      relevanceSelection: null,
      resumeData: null,
      coverLetter: null,
      atsScore: null,
      resumeId: null,
      editMode: false,
    }),
}));
