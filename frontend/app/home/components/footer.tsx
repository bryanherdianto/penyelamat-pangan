import Image from "next/image";

export default function Footer() {
  return (
    <div className="grid items-center justify-center gap-y-5 bg-white py-10 rounded-t-3xl">
      <Image src="/Images/logo.png" alt="logo" width={100} height={100} />
      <h1 className="">©2024 Chain of Kindness</h1>
    </div>
  );
}
