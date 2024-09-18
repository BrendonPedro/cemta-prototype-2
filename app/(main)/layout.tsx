import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";

type Props = {
  children: React.ReactNode;
};

const MainLayout = ({ children }: Props) => {
  return (
    <>
      <MobileHeader />
      <Sidebar className="hidden lg:flex" />
      <main className="lg:pl-[256px] min-h-screen pt-[50px] lg:pt-0 flex flex-col">
        <div className="bg-gradient-to-r from-teal-200 to-teal-300 tracking-wide flex-1 w-full overflow-x-auto">
          {children}
        </div>
      </main>
    </>
  );
};

export default MainLayout;
