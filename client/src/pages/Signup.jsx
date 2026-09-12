import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Button, Card, Field, Input, Spinner } from '../components/ui.jsx';

/** Live validation, per the Review-II deliverable list. */
function validate(form) {
  const errors = {};
  if (!form.displayName.trim()) errors.displayName = 'Enter your name';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address';
  if (form.password.length < 8) errors.password = 'Use at least 8 characters';
  if (form.confirm !== form.password) errors.confirm = 'Passwords do not match';
  return errors;
}

export default function Signup() {
  const { signUp } = useAuth();

  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [serverFields, setServerFields] = useState({});
  const [busy, setBusy] = useState(false);

  const errors = validate(form);
  const showError = (key) => (touched[key] ? errors[key] : undefined) || serverFields[key];

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setServerFields((f) => ({ ...f, [key]: undefined }));
  };
  const blur = (key) => () => setTouched((t) => ({ ...t, [key]: true }));

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ displayName: true, email: true, password: true, confirm: true });
    if (Object.keys(errors).length) return;

    setServerError('');
    setServerFields({});
    setBusy(true);
    try {
      await signUp({
        email: form.email,
        password: form.password,
        displayName: form.displayName,
      });
      // Where a new account lands is decided by the route guard in App.jsx,
      // which redirects as soon as this succeeds. Nothing to navigate to here.
    } catch (err) {
      setServerError(err.message);
      setServerFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-600">
        Takes a minute. You will add medical details next.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {serverError && <Alert tone="error">{serverError}</Alert>}

          <Field label="Full name" required error={showError('displayName')}>
            <Input
              value={form.displayName}
              onChange={set('displayName')}
              onBlur={blur('displayName')}
              autoComplete="name"
              invalid={Boolean(showError('displayName'))}
            />
          </Field>

          <Field label="Email address" required error={showError('email')}>
            <Input
              type="email"
              value={form.email}
              onChange={set('email')}
              onBlur={blur('email')}
              autoComplete="email"
              invalid={Boolean(showError('email'))}
            />
          </Field>

          <Field
            label="Password"
            required
            error={showError('password')}
            hint="At least 8 characters"
          >
            <Input
              type="password"
              value={form.password}
              onChange={set('password')}
              onBlur={blur('password')}
              autoComplete="new-password"
              invalid={Boolean(showError('password'))}
            />
          </Field>

          <Field label="Confirm password" required error={showError('confirm')}>
            <Input
              type="password"
              value={form.confirm}
              onChange={set('confirm')}
              onBlur={blur('confirm')}
              autoComplete="new-password"
              invalid={Boolean(showError('confirm'))}
            />
          </Field>

          <Button type="submit" disabled={busy} className="w-full">
            {busy && <Spinner className="h-4 w-4" />}
            Create account
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-brand-700 underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
