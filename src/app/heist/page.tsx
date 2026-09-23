import type { Metadata } from "next";
import HeistGame from "./heist-game";

export const metadata: Metadata = {
  title: "Jev Heist — Can you outsmart the guard?",
  description:
    "Three gems. One clever guard. A pocket-sized heist against TypeSafe Jev.",
};

export default function HeistPage() {
  return <HeistGame />;
}
