/* Numbered feature-card template.
   Illustration on top, "01" badge, bold title, muted description.
   Used on the platform page; reusable anywhere a numbered capability
   list appears (home, modules, …). */

export default function FeatureCard({
  index,
  title,
  description,
  image,
  imageAlt,
}: {
  index: number;
  title: string;
  description: string;
  image: string;
  imageAlt?: string;
}) {
  return (
    <div className="dash-card dash-card-hover h-full overflow-hidden">
      <div className="relative aspect-[16/10] overflow-hidden bg-brand-tint/40">
        <img
          src={image}
          alt={imageAlt ?? title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-8">
        <span className="grid h-16 w-16 place-items-center rounded-[18px] bg-brand-tint text-[22px] font-extrabold tracking-tight text-brand">
          {String(index + 1).padStart(2, "0")}
        </span>
        <p className="mt-6 text-[22px] font-bold tracking-tight text-ink">
          {title}
        </p>
        <p className="mt-3 text-[15.5px] leading-[1.7] text-muted">
          {description}
        </p>
      </div>
    </div>
  );
}
