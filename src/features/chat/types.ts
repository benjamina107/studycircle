export interface Channel {
  id: string;
  name: string;
  spaceId: string;
  subspaceId: string;
  courseName: string;
  professorName: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  requestId?: string;
}

export interface MeetupPin {
  id: string;
  title: string;
  locationName: string;
  startsAt: string;
  channelId: string;
  spaceId: string;
  subspaceId: string;
}

export interface ChatOverview {
  channels: Channel[];
  meetups: MeetupPin[];
}

export interface ChatService {
  listMessages(channelId: string, signal?: AbortSignal): Promise<ChatMessage[]>;
  sendMessage(input: { channelId: string; body: string; requestId: string }, signal?: AbortSignal): Promise<ChatMessage>;
  getChatsOverview(signal?: AbortSignal): Promise<ChatOverview>;
}
