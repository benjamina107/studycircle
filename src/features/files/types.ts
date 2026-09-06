export type ClassFile = {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  created_at: string;
  uploader_id: string;
  subspace_id: string;
};

export type ClassFilesPage = {
  files: ClassFile[];
  hasMore: boolean;
  nextCursor: string | null;
};
