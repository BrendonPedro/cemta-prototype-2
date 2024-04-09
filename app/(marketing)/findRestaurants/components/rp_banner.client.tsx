"use client";

import { Button } from "@/components/ui/button"
import Image from "next/image";
import { MouseEventHandler } from 'react';

const RestaurantPartner_Banner = ({
  handleOnClick,
  buttonText,
}: {
  handleOnClick: MouseEventHandler<HTMLButtonElement> | undefined;
  buttonText: string;
}) => {
  return (
    <div className="mb-12 grid lg:mb-24 lg:grid-cols-2">
      <div className="z-20 flex flex-col px-2 md:pt-12">
        <h1 className="my-2 flex-wrap text-5xl font-extrabold">
          <span className="pr-2 text-teal-600">Find</span>
          <span className="text-gray-900">Restaurants</span>
        </h1>
        <p className="font-aleo text-xl font-semibold text-gray-900 md:mt-1 lg:text-2xl">
          Enjoy exclusive offers and discover new favorites at our partner
          restaurants!
        </p>
        <div className="mt-5">
          <Button variant="cemta" onClick={handleOnClick}>{buttonText}</Button>
        </div>
        {/* <p className="text-xs text-zinc-950-600 md:mt-1 ml-5 dark:text-gray-400 font-medium">
          A tick indicates a CEMTA partnership ✔
        </p> */}
      </div>
      <div className="absolute top-2 z-10 md:top-0 md:mt-12 md:pl-10 md:pt-0 lg:right-1/4 lg:flex lg:pl-20">
        <Image
          src="/static/hero-image2.png"
          width={600}
          height={500}
          alt="hero image"
          priority={true}
        />
      </div>
    </div>
  );
}

export default RestaurantPartner_Banner;

/*
 * v0 by Vercel.
 * @see https://v0.dev/t/pjP85I6mG2b
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
// import Link from "next/link"

// export default function Component() {
//   return (
//     <div className="bg-gray-900 dark:bg-gray-50">
//       <div className="container py-6 px-4 md:py-12 md:px-6">
//         <div className="flex flex-col items-center justify-center space-y-2">
//           <h2 className="text-3xl font-bold tracking-tighter text-gray-50 sm:text-4xl/tight md:text-5xl/tight dark:text-gray-900">
//             Restaurant Partners
//           </h2>
//           <p className="mx-auto max-w-[700px] text-center text-gray-300 md:text-xl/relaxed dark:text-gray-400">
//             Enjoy exclusive offers and discover new favorites at our partner restaurants.
//           </p>
//           <Link
//             className="inline-flex h-10 items-center rounded-md bg-gray-100 px-8 text-sm font-medium text-gray-900 shadow transition-colors hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-950 dark:hover:bg-gray-800 dark:hover:text-gray-50"
//             href="#"
//           >
//             View Restaurants Nearby
//           </Link>
//           <p className="text-xs text-gray-500 dark:text-gray-400">A tick indicates a CEMTA partnership</p>
//         </div>
//       </div>
//     </div>
//   )
// }
