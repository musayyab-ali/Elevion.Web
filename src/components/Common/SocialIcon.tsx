import * as Icon from "@phosphor-icons/react/dist/ssr";

type PhosphorIcon = typeof Icon.FacebookLogo;

/** The icon for each social platform the admin offers (the platform names are the API's, lower case). */
const ICONS: Record<string, PhosphorIcon> = {
  facebook: Icon.FacebookLogo,
  instagram: Icon.InstagramLogo,
  twitter: Icon.TwitterLogo,
  youtube: Icon.YoutubeLogo,
  pinterest: Icon.PinterestLogo,
  linkedin: Icon.LinkedinLogo,
  snapchat: Icon.SnapchatLogo,
  whatsapp: Icon.WhatsappLogo,
  tiktok: Icon.TiktokLogo,
  messenger: Icon.MessengerLogo,
  google: Icon.GoogleLogo,
};

const SocialIcon = ({ platform, size = 24, className = "" }: { platform: string; size?: number; className?: string }) => {
  const Component = ICONS[platform] ?? Icon.Globe;
  return <Component size={size} className={className} aria-hidden="true" />;
};

export default SocialIcon;
