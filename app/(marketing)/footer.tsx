import { Button } from "@/components/ui/button";
import Image from "next/image";

export const Footer = () => {
  return (
    <footer className="hidden lg:block h-20 w-full border-t-2 border-slate-300 p-2 bg-slate-100">
      <div className="max-w-screen-lg mx-auto flex items-center justify-evenly h-full">
        <Button size="lg" variant="ghostTeal" className="w-full">
          <Image
            src="/flags/TW.svg"
            alt="Chinese"
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          Traditional Chinese
        </Button>
        <Button size="lg" variant="ghostTeal" className="w-full">
          <Image
            src="/flags/es.svg"
            alt="Spanish"
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          Spanish
        </Button>
        <Button size="lg" variant="ghostTeal" className="w-full">
          <Image
            src="/flags/ID - Indonesia.svg"
            alt="Spanish"
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          Indonesian
        </Button>
        <Button size="lg" variant="ghostTeal" className="w-full">
          <Image
            src="/flags/FR - France.svg"
            alt="French"
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          French
        </Button>
        <Button size="lg" variant="ghostTeal" className="w-full">
          <Image
            src="/flags/IT - Italy.svg"
            alt="Italian"
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          Italian
        </Button>
        <Button size="lg" variant="ghostTeal" className="w-full">
          <Image
            src="/flags/JP - Japan.svg"
            alt="Japanese"
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          Japanese
        </Button>
        <Button size="lg" variant="ghostTeal" className="w-full">
          <Image
            src="/flags/KR - Korea (South).svg"
            alt="Korean"
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          Korean
        </Button>
      </div>
    </footer>
  );
};
