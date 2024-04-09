import { Header } from "./header";
import { Footer } from "./footer";

type Props = {
    children: React.ReactNode;
};

const MarketingLayout = ({ children }: Props) => {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center h-14 bg-gradient-to-r from-teal-200 to-teal-300">
          {children}
        </main>
        <Footer />
      </div>
    );
};

export default MarketingLayout;


