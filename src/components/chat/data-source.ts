/** Future authenticated contract; never implemented or invoked by the demo.
 * Implementations must authorize subspace membership server-side and confirm delivery.
 * Demo messages are deliberately separate from this server data interface.
 */
export interface ChatDataSource {
  listChannels(subspaceId: string): Promise<readonly { id: string; name: string }[]>;
  listMessages(channelId: string): Promise<readonly { id: string; authorId: string; text: string; createdAt: string }[]>;
  sendMessage(input: { channelId: string; text: string; clientRequestId: string }): Promise<
    { delivered: true; messageId: string } | { delivered: false; error: string }
  >;
}
