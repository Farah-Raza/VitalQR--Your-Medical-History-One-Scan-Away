import { Link } from 'react-router-dom';
import { Button, Card } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        If you scanned a QR code and landed here, the code may have been revoked by its owner or is
        not a VitalQR code.
      </p>
      <Button as={Link} to="/" className="mt-5">
        Go to the homepage
      </Button>
    </Card>
  );
}
