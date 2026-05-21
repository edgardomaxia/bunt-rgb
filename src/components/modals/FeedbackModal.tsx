import { ModalShell } from "./ModalShell";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function FeedbackModal({ open, onClose }: Props) {
  return (
    <ModalShell open={open} onClose={onClose} width={720} maxHeight="min(800px, 90vh)">
      <iframe
        src="https://tally.so/r/xXpB15"
        width="100%"
        height={620}
        style={{ border: "none", borderRadius: 12 }}
        title="BUNT RGB Anonymous Feedback"
      />
    </ModalShell>
  );
}
