import Image from "next/image";
import { Cinzel } from "next/font/google";
import AppleIcon from "@/app/apple-icon.png";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 animate-in fade-in duration-700 delay-500 fill-mode-forwards opacity-0">
      <div className="relative h-24 w-24 overflow-hidden rounded-xl bg-neutral-900 shadow-2xl">
        <Image
          src={AppleIcon}
          alt="Loading..."
          fill
          className="object-cover"
          priority
        />
        {/* Shimmer effect overlay */}
        <div className="absolute inset-0 z-10 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <h2
          className={`text-xl font-semibold text-amber-100 ${cinzel.className} tracking-widest`}
        >
          LOADING
        </h2>
        <div className="h-0.5 w-16 overflow-hidden rounded-full bg-amber-900/30">
          <div className="h-full w-full animate-indeterminate-bar bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
        </div>
      </div>
    </div>
  );
}
