import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Button, Card, Field, Input, Spinner } from '../components/ui.jsx';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFields({});
    setBusy(true);
    try {
      await signIn(form);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
      <p className="mt-1 text-sm text-slate-600">Manage your emergency profile and QR code.</p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <Alert tone="error">{error}</Alert>}

          <Field label="Email address" required error={fields.email}>
            <Input
              type="email"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              invalid={Boolean(fields.email)}
              required
            />
          </Field>

          <Field label="Password" required error={fields.password}>
            <Input
              type="password"
              value={form.password}
              onChange={set('password')}
              autoComplete="current-password"
              invalid={Boolean(fields.password)}
              required
            />
          </Field>

          <Button type="submit" disabled={busy} className="w-full">
            {busy && <Spinner className="h-4 w-4" />}
            Sign in
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-center text-sm text-slate-600">
        No account yet?{' '}
        <Link to="/signup" className="font-semibold text-brand-700 underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
