
import MenuUpload from "@/components/MenuUpload";
import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1>menus page</h1>
      <Link href='/'>
        <button>
          Go Back
          </button>
        </Link>
      <MenuUpload />
    </div>
  );
}



