import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap narrow">
      <h1>Off the map</h1>
      <p style={{ marginTop: 16 }}>There is nothing at this address.</p>
      <Link className="btn" href="/">Back to the mountain</Link>
    </div>
  );
}
