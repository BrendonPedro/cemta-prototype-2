// No "use client" directive here
import { CemtaTeam } from "@/components/CemtaTeam";

// Notice the async keyword - server components can be async
export default async function CemtaTeamPage() {
  return (
    <div>
      <CemtaTeam />
    </div>
  );
}