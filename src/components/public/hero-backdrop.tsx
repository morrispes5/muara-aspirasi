import Image from "next/image";

export function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="hero-media absolute inset-0 -z-10">
      <Image
        alt=""
        className="hero-media-image object-cover"
        fill
        priority
        sizes="100vw"
        src="/images/campus-gateway.jpg"
      />
    </div>
  );
}
