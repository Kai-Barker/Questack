import logo from '../../assets/QuestackLogoTemp.png';

// The Questack logo. TEMPORARY artwork (QuestackLogoTemp.png): swap the
// image here when the final logo is ready and every screen updates.
// alt="" because the QUESTACK wordmark always sits beside it and names it.
export default function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <img src={logo} alt="" width={size} height={size} draggable={false} className={`select-none ${className}`} />;
}
