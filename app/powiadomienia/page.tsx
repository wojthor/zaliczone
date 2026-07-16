import { PowiadomieniaInboxClient } from "./powiadomienia-inbox-client";
import { getTutorInboxMessages } from "@/lib/data/queries";

export default async function PowiadomieniaPage() {
  const messages = await getTutorInboxMessages();
  return <PowiadomieniaInboxClient initialMessages={messages} />;
}
