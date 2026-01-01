"use client";

import Navbar from "./components/navbar";
import Footer from "./components/footer";
import Card from "./components/cards1";

import Image from "next/image";

import React from "react";
import Slider from "react-slick";
// slick-carousel global CSS must be imported from a global layout file in Next.js
// to avoid "Global CSS" import errors. Imports moved to `app/layout.tsx`.

export default function Home() {
    const settings = {
      dots: true,
      infinite: true,
      speed: 500,
      slidesToShow: 1,
      slidesToScroll: 1,
    };

  return (
    <div className="justify-center items-center min-h-screen">
      
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section>
        <div className="flex items-center min-h-screen pb-40">
          <Image src="/Images/bg1.png" alt="Background 1" width={500} height={300} className="absolute top-0 -left-20 z-20" />
          <Image src="/Images/bg2.png" alt="Background 2" width={600} height={400} className="absolute right-0 -top-14 z-0"/>
          <Image src="/Images/bg3.png" alt="Background 3" width={600} height={400} className="absolute top-5 -right-20 z-0"/>
          <Image src="/Images/bg4.png" alt="Background 4" width={600} height={400} className="absolute top-64 left-48"/>
          <div className="flex justify-center items-center px-48 gap-20 z-10">
            <div>
              <div className="relative w-96 h-96">
                <Image src="/Images/bg5.png" alt="Background 5" width={384} height={384} className="absolute top-0 left-4"/>
                <Image src="/Images/bg6.png" alt="Background 5" width={300} height={300} className="absolute top-16 left-20"/>
              </div>
            </div>
            <div className="justify-center items-center">
              <h1 className="text-text-3 font-bold text-7xl my-5 text-left">
                Kindness <span className="text-text-2">
                  Secured
                </span> Impact <span className="text-text-2">
                  Ensured
                </span> 
              </h1>
              <p className="text-2xl text-text-3 my-5">
                Transparent Giving, Powered by ICP Technology
              </p>
              <button className="text-xl text-white bg-linear-to-br from-gradient-3 via-gradient-4 to-gradient-5 px-5 py-3 rounded-lg">Donate Now</button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Chain of Kindness  */}
      <section className="min-h-screen relative overflow-hidden mb-20">
        <h2 className="text-text-3 my-5 text-center text-5xl">Why <span className="font-bold">Chain of Kindness?</span></h2>
        <Image src="/Images/bg7.png" alt="Background 7" width={300} height={300} className="absolute top-5 left-0 z-0"/>
        <Image src="/Images/bg8.png" alt="Background 8" width={300} height={300} className="absolute top-5 right-0"/>
        <div className="flex items-center justify-center my-20 text-text-3 gap-14">
          <div>
            <div className="w-80 bg-white rounded-2xl border-gray-400 p-5 my-5">
              <Image src="/Images/icon1.png" alt="Icon 1" width={48} height={48} className="py-2 w-12" />
              <h3 className="font-bold text-xl text-left">Extra Security
              with Identity Verification</h3>
              <p className="text-lg text-justify">Through a simple KTP (ID Card) verification process, we ensure that all donors are real individuals, reducing the risk of fraudulent activity and misuse of funds.</p>
            </div>
            <div className="w-80 bg-white rounded-2xl border-gray-400 p-5">
              <Image src="/Images/icon3.png" alt="Icon 3" width={48} height={48} className="py-2 w-12" />
              <h3 className="font-bold text-xl text-left">AI-Powered
              Impact Tracking</h3>
              <p className="text-lg text-justify">Our AI system identifies the most effective charities and community projects, ensuring that your contribution is directed to initiatives that truly matter.</p>
            </div>
          </div>
          <div>
          <div className="relative w-80 bg-linear-to-br from-gradient-1 to-gradient-2 rounded-2xl border-gray-400 p-5 text-white overflow-hidden">
              {/* Gambar latar belakang */}
              <Image
                src="/Images/bg9.png"
                alt="Background 9"
                width={320}
                height={320}
                className="absolute top-0 left-0 w-full h-full object-cover opacity-0 z-0"
              />

              {/* Konten utama */}
              <div className="relative">
                <Image src="/Images/icon2.png" alt="Icon 2" width={48} height={48} className="py-2 w-12 mb-5" />
                <h3 className="font-bold text-xl text-left my-2">
                  Powered by ICP for Greater Transparency
                </h3>
                <p className="text-lg text-justify z-40">
                  Chain of Kindness leverages the revolutionary power of Internet Computer
                  Protocol (ICP) to ensure your donations are secure, fast, and fully
                  traceable.
                </p>
                <p className="text-lg text-justify mt-4">
                  ICP enables decentralized transactions, meaning every donation is
                  verified on the blockchain, leaving no room for fraud or misuse.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="mb-20">
        <h2 className="text-text-3 text-center text-6xl mx-52">&quot;The Best Way to Find Yourself is to
        Lose Yourself in the Service of Others.&quot;</h2>
        <h3 className="bg-linear-to-br from-text-2 to-text-3 bg-clip-text text-transparent text-center text-5xl my-5 font-semibold">~ Mahatma Gandhi</h3>
      </section>

      <section className="flex justify-center items-center my-20">
        <section className="w-800">
          <div className="items-center justify-center self-center"> {/* Kontainer slider */}
            <Slider {...settings}>
              <div>
                <Card
                  image={'/Images/dummy1.png'}
                  authorImg={'/Images/dummy2.png'}
                  authorName="James Austin"
                  cardTitle="Shelter in Hope: Building a World Where Everyone Has a Place to Call Home"
                  cardContent="The 'Shelter in Hope' campaign aims to provide immediate support, long-term solutions, and a voice for the homeless community. Through innovative initiatives and the power of collective action, we strive to offer shelter, dignity, and hope to those without a home."
                  buttonText="Donate Now"
                />
              </div>
              <div>
                <Card
                  image={'/Images/dummy1.png'}
                  authorImg={'/Images/dummy2.png'}
                  authorName="2"
                  cardTitle="Shelter in Hope: Building a World Where Everyone Has a Place to Call Home"
                  cardContent="The 'Shelter in Hope' campaign aims to provide immediate support, long-term solutions, and a voice for the homeless community. Through innovative initiatives and the power of collective action, we strive to offer shelter, dignity, and hope to those without a home."
                  buttonText="Donate Now"
                />
              </div>
              <div>
                <Card
                  image={'/Images/dummy1.png'}
                  authorImg={'/Images/dummy2.png'}
                  authorName="3"
                  cardTitle="Shelter in Hope: Building a World Where Everyone Has a Place to Call Home"
                  cardContent="The 'Shelter in Hope' campaign aims to provide immediate support, long-term solutions, and a voice for the homeless community. Through innovative initiatives and the power of collective action, we strive to offer shelter, dignity, and hope to those without a home."
                  buttonText="Donate Now"
                />
              </div>
            </Slider>
          </div>
        </section>
      </section>

      {/* Footer */}
      <Footer/>
      
    </div>
  );
}
