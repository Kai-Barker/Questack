import galaxyTexture from '../../assets/GalaxyTexture.webp';

// The darkened starfield behind the splash and sign-in screens. Sits behind
// everything in the nearest `isolate` stacking context. `deep` darkens it
// further (the splash).
export default function GalaxyBackdrop({ deep = false }: { deep?: boolean }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${galaxyTexture})` }}
      />
      <div aria-hidden="true" className={`fixed inset-0 -z-10 ${deep ? 'bg-space-950/[0.88]' : 'bg-space-950/75'}`} />
    </>
  );
}
