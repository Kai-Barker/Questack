import logo from '../../assets/QuestackLogo.png';

// The Questack logo (QuestackLogo.png), also used as the browser favicon.
// alt="" because the QUESTACK wordmark always sits beside it and names it.
export default function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <img src={logo} alt="" width={size} height={size} draggable={false} className={`select-none ${className}`} />;
}
