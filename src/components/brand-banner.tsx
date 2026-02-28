import Image from "next/image";

import styles from "./brand-banner.module.css";

type BrandBannerProps = Readonly<{
  title: string;
  subtitle?: string;
  compact?: boolean;
}>;

export function BrandBanner({ title, subtitle, compact = false }: BrandBannerProps) {
  return (
    <section className={`${styles.banner} ${compact ? styles.compact : ""}`}>
      <Image
        src="/logo/banner-1.jpg"
        alt="Institucion Colrosario Manizales"
        fill
        className={styles.image}
        priority
      />
      <div className={styles.overlay} />
      <div className={styles.content}>
        <p className={styles.kicker}>Colrosario Manizales</p>
        <h2>{title}</h2>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
    </section>
  );
}
