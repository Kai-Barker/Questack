import Button from '../ui/Button';
import Panel from '../ui/Panel';

export default function DecodeTransmissionCard() {
  return (
    <Panel label="Decode a transmission">
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Intercepted code you don't understand? Upload it and the Ship's AI will help you decode it step by step.
      </p>
      <Button variant="outline" to="/decoder" className="mt-5 w-full">
        Open decoder
      </Button>
    </Panel>
  );
}
