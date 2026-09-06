export type ClassFile = {
  id: string; name: string; size: number; mime_type: string;
  created_at: string; uploader_id: string; subspace_id: string;
};
export type Message = {
  id: string; channelId: string; authorId: string | null; authorName: string;
  body: string; createdAt: string; requestId: string; file: ClassFile | null;
};
export type Conversation = { channel: { id: string; name: string }; messages: Message[] };
