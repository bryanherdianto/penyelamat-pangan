import Image from "next/image";

type CardProps = {
  image: string;
  authorImg: string;
  authorName: string;
  cardTitle: string;
  cardContent: string;
  buttonText?: string;
};

export default function Card({ image, authorImg, authorName, cardTitle, cardContent }: CardProps) {
  return (
    <div className="grid grid-cols-2 items-center rounded-2xl text-white bg-linear-to-br from-gradient-3 via-gradient-4 to-gradient-5 w-800 p-7">
      <div>
        <Image src={image} alt="ImageCard" width={350} height={100} className="rounded-xl" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <Image src={authorImg} alt={authorName} width={7} height={7}/>
          <p className="text-center">{authorName}</p>
        </div>
        <h1 className="text-wrap text-2xl my-4 font-bold">{cardTitle}</h1>
        <p className="text-wrap text-lg">{cardContent}</p>
        <button className="px-4 py-2 my-3 text-white border-2 border-white rounded-lg">Donate Now</button>
      </div>
    </div>
  );
}
