import Link from "next/link";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found | TripMate',
  description: 'It seems you have wandered off the path.',
};

export default function NotFound() {
  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#1e2335]">
      {/* Background Image containing the 404 illustration, text, and button */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/images/404_bg.jpg')" }}
      />
      
      {/* 
        Since the 'Home' button and text are painted directly into the reference image, 
        we overlay a large invisible clickable area over the lower-middle section of the screen.
        This ensures users can click the painted button to return home even as the background scales.
      */}
      <div className="absolute bottom-[10%] left-0 right-0 h-1/3 flex items-center justify-center z-10">
        <Link 
            href="/" 
            className="w-3/4 md:w-1/3 h-full cursor-pointer outline-none focus:ring-2 focus:ring-[#F5A623]/50 rounded-xl"
            aria-label="Go back Home"
        >
          <span className="sr-only">Go back Home</span>
        </Link>
      </div>
    </main>
  );
}
