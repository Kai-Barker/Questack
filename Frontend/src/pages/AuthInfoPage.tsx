import ChevronButton from '../components/ui/ChevronButton';
import AuthCard from '../components/auth/AuthCard';

const pages = {
  recover: {
    tab: 'Access recovery',
    title: 'Recover access',
    body: "Access recovery isn't online yet: it needs email delivery, which is still being built. Until then, ask a Questack admin to help you back in.",
  },
  terms: {
    tab: 'Terms of service',
    title: 'Terms of service',
    body: 'The full terms are being written. Questack is a student project in development: use it to learn, be kind to other pilots, and never upload code you are not allowed to share.',
  },
  privacy: {
    tab: 'Privacy policy',
    title: 'Privacy policy',
    body: "The full policy is being written. In short: your callsign is public, your email is private, and your access code is stored only as a bcrypt hash. Code you paste for the Ship's AI is sent to Google's Gemini to explain it and is never saved.",
  },
};

// Placeholders for the links on the sign-in screens
export default function AuthInfoPage({ page }: { page: keyof typeof pages }) {
  const content = pages[page];
  return (
    <AuthCard tab={content.tab} status="standing by">
      <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase">{content.title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">{content.body}</p>
      <div className="mt-8">
        <ChevronButton variant="outline" to="/login">
          Back to sign in
        </ChevronButton>
      </div>
    </AuthCard>
  );
}
