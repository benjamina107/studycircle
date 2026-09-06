import { createClient } from "@/lib/supabase/server";
import { createChatHandlers } from "@/features/class-chat/server";

export const dynamic = "force-dynamic";
export const { GET, POST } = createChatHandlers(createClient);
