import { redirect } from "next/navigation";
import { currentSession } from "@/lib/api";

export default async function Home() {
  const s = await currentSession();
  redirect(!s ? "/login" : s.role === "responder" ? "/responder" : "/hub");
}
