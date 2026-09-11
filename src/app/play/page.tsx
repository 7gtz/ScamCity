import { redirect } from "next/navigation";
import { DEFAULT_SCENARIO } from "@/content/scenarios";

export default function PlayIndex() {
  redirect(`/play/${DEFAULT_SCENARIO}`);
}
