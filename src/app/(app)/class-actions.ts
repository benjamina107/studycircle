"use server";
import { cookies } from "next/headers";
import { classContext } from "@/lib/class-context";

export async function rememberClass(id: string): Promise<boolean> {
  try {
    const { user, groups } = await classContext();
    if (typeof id !== "string" || !groups.some(group => group.id === id)) return false;
    const jar = await cookies();
    const key = `sc-group-${user.id}`;
    if (jar.get(key)?.value !== id) jar.set(key, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 180 });
    return true;
  } catch { return false; }
}
