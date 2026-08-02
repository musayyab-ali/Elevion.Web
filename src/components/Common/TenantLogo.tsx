"use client";

import Image from "next/image";
import Link from "next/link";
import { useLandingPage } from "@/hooks/useLandingPage";
import { isLandingImageEnabled } from "@/lib/tenant-landing";

interface TenantLogoProps {
  className?: string;
  textClassName?: string;
  imageClassName?: string;
  href?: string;
  welcomeName?: string | null;
}

const TenantLogo = ({
  className = "",
  textClassName = "heading5",
  imageClassName = "h-8 w-8 object-contain",
  href = "/",
  welcomeName,
}: TenantLogoProps) => {
  const landing = useLandingPage();
  const logoSrc =
    landing &&
      isLandingImageEnabled(landing.HeaderImageRequest) &&
      landing.HeaderImagePath
      ? landing.HeaderImagePath
      : null;

  const isLoggedInView = welcomeName !== undefined;

  const brandLabel = isLoggedInView ? (
    welcomeName ? (
      <>
        <span className="hidden md:inline">Welcome, </span>
        <span className="md:hidden">Hi, </span>
        <span className="capitalize">{welcomeName}</span>
      </>
    ) : (
      "Welcome Back!"
    )
  ) : (
    "TopSaver"
  );

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 min-w-0 ${className}`}
      title={
        isLoggedInView
          ? welcomeName
            ? `Welcome, ${welcomeName}`
            : "Welcome Back!"
          : "TopSaver"
      }
    >
      {logoSrc && (
        <Image
          src={logoSrc}
          alt={welcomeName ? "User profile" : "TopSaver logo"}
          width={44}
          height={44}
          className={`${imageClassName} shrink-0`}
          priority
        />
      )}
      <span className={`${textClassName} truncate`}>{brandLabel}</span>
    </Link>
  );
};

export default TenantLogo;
