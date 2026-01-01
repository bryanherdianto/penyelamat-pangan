import Link from "next/link";
import Image from "next/image";

export default function NavbarLanding() {
  return (
    <nav className="w-full h-16 flex items-center justify-between px-10 sticky top-0 py-10 z-30 bg-primary-1 shadow-md">
      <Image src="/Images/logo.png" alt="logo" width={128} height={64} />
      <ul className="flex space-x-20">
        <li className="ml-auto">
          <Link href="/" className="hover:underline cursor-pointer">
            Home
          </Link>
        </li>
        <li className="ml-auto">
          <Link href="/" className="hover:underline cursor-pointer">
            Donate
          </Link>
        </li>
        <li className="ml-auto">
          <Link href="/" className="hover:underline cursor-pointer font-bold text-text-2">
            Login
          </Link>
        </li>
        <li>
          <Link
            href="/signin"
            className="text-white hover:underline px-4 py-2 rounded-lg bg-linear-to-br from-gradient-1 to-gradient-2 cursor-pointer"
          >
            Get Started
          </Link>
        </li>
      </ul>
    </nav>
  );
}
