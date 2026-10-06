import Image from "next/image";
import { scenes, type Scene } from "./reminders";

export default function HabitIcon({ kind }: { kind: Scene }) {
  const safeKind = Object.prototype.hasOwnProperty.call(scenes, kind) ? kind : "plant";
  return <Image src={`/habit-icons/${safeKind}.svg`} width={192} height={192} unoptimized alt="" aria-hidden="true" />;
}
