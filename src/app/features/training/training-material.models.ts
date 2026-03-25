export type MaterialType = 'PDF' | 'VIDEO' | 'IMAGE' | 'LINK';

export interface TrainingMaterial {
  id:               string;
  version:          number;
  title:            string;
  description:      string | null;
  type:             MaterialType;
  url:              string;
  originalFileName: string | null;
  fileSizeBytes:    number | null;
  mimeType:         string | null;
  category:         string | null;
  tags:             string[];
  uploadedBy:       string;
  uploaderName:     string;
  storeId:          string | null;
  usageCount:       number;
  createdAt:        string;
  updatedAt:        string;
}

export interface MaterialPage {
  content:          TrainingMaterial[];
  totalElements:    number;
  totalPages:       number;
  number:           number;
  size:             number;
}

export interface CreateLinkMaterialRequest {
  title:       string;
  description?: string;
  url:         string;
  category?:   string;
  tags?:       string[];
  storeId?:    string;
}

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  PDF:   'PDF',
  VIDEO: 'Video',
  IMAGE: 'Imagen',
  LINK:  'Liga',
};

export const MATERIAL_TYPE_COLORS: Record<MaterialType, string> = {
  PDF:   'bg-red-100 text-red-700',
  VIDEO: 'bg-purple-100 text-purple-700',
  IMAGE: 'bg-blue-100 text-blue-700',
  LINK:  'bg-teal-100 text-teal-700',
};
