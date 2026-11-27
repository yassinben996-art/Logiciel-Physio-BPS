// QR code du lien d'appairage, dessiné en SVG (aucun canvas, aucun HTML injecté).
import QRCode from 'qrcode';

export default function PairingQr({ text, label = 'QR code d’appairage' }: { text: string; label?: string }) {
  const m = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules;
  const n = m.size;
  const cells: JSX.Element[] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (m.get(r, c)) cells.push(<rect key={`${r}-${c}`} x={c + 4} y={r + 4} width="1" height="1" />);
  return (
    <svg
      className="pairing-qr"
      viewBox={`0 0 ${n + 8} ${n + 8}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={n + 8} height={n + 8} fill="#ffffff" />
      <g fill="#000000">{cells}</g>
    </svg>
  );
}
