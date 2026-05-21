import { ModalShell } from "./ModalShell";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function HelpModal({ open, onClose }: Props) {
  return (
    <ModalShell open={open} onClose={onClose} title="How it works" width={420}>
      <div style={{ opacity: 0.85, fontSize: 14, lineHeight: 1.55 }}>
        Click a tile: the 8 surrounding tiles change color (red → green → blue → red).
        Make all tiles the same color in as few moves as possible. PAR is the optimal
        number of moves.
      </div>
    </ModalShell>
  );
}
