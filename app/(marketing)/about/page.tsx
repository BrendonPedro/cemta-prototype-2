import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-silver">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-2 cemta-title">
            Meet the <span className="text-gradient">CEMTA</span> Team
          </h1>
        </div>

        <div className="flex flex-wrap justify-center mb-12">
          {["Brendon4.jpeg", "daniele.png", "Daren.jpeg", "Hakim.jpeg"].map(
            (img, index) => (
              <div key={index} className="m-5">
                <Image
                  src={`/team_images/${img}`}
                  alt={`Team member ${index + 1}`}
                  width={250}
                  height={250}
                  className="transition-all duration-1000 hover:scale-110 shadow-md bg-gray-600 p-0.5"
                />
              </div>
            )
          )}
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold">& Our Robot Friend😊!</h2>
        </div>

        <div className="robots">
          <div className="android">
            <div className="head">
              <div className="eyes">
                <div className="left_eye"></div>
                <div className="right_eye"></div>
              </div>
            </div>
            <div className="upper_body">
              <div className="left_arm"></div>
              <div className="torso"></div>
              <div className="right_arm"></div>
            </div>
            <div className="lower_body">
              <div className="left_leg"></div>
              <div className="right_leg"></div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link
            href="/"
            className="text-2xl font-semibold text-primary hover:text-primary-foreground transition-colors duration-300"
          >
            Take Me Back!
          </Link>
        </div>
      </div>
    </div>
  );
}
