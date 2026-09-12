import { Link } from 'react-router-dom';
import { Button, Card } from '../components/ui.jsx';
import InstallApp from '../components/InstallApp.jsx';

const STEPS = [
  {
    n: '01',
    title: 'Create a profile',
    body: 'Enter blood group, allergies, chronic conditions, medications and emergency contacts once.',
  },
  {
    n: '02',
    title: 'Generate a QR',
    body: 'The system creates a unique, revocable code linked to that profile.',
  },
  {
    n: '03',
    title: 'Scan in an emergency',
    body: 'Any smartphone camera opens it. No app, no login, no delay.',
  },
  {
    n: '04',
    title: 'Treat faster',
    body: 'Responders see critical facts and act within the golden hour.',
  },
];

export default function Landing() {
  return (
    <div className="space-y-14">
      <section className="pt-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700 ring-1 ring-brand-200">
          Scan. Save. Secure.
        </span>

        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Your medical history,{' '}
          <span className="text-brand-600">one scan away</span>
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
          In a road accident or a sudden collapse, responders have no way to learn your blood group,
          allergies or conditions. VitalQR puts them one camera scan away, without an app and
          without a login.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button as={Link} to="/signup" size="lg">
            Create my emergency profile
          </Button>
          <Button as={Link} to="/login" variant="secondary" size="lg">
            I already have an account
          </Button>
          <InstallApp size="lg" />
        </div>
      </section>

      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <Card key={s.n} className="p-5">
              <span className="text-xs font-black tracking-widest text-brand-600">{s.n}</span>
              <h3 className="mt-2 font-bold text-slate-900">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900">Masked by default</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            A plain scan reveals only what a responder needs to act: blood group, allergies, chronic
            conditions, current medications and an emergency contact. Nothing else is exposed, so a
            lost or photographed code cannot become a full medical leak.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900">Unlocked by OTP</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Full history, past surgeries and insurance details stay locked. Unlocking sends a code to
            your registered emergency contact, so your family decides who sees the rest, and every
            request is written to your audit log.
          </p>
        </Card>
      </section>

      <section>
        <h2 className="text-center text-2xl font-bold text-slate-900">
          Carried however it fits real life
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: 'Vehicle owners',
              body: 'A durable sticker on the helmet, dashboard or bike. Traffic police and paramedics scan it at the scene.',
            },
            {
              title: 'Children',
              body: 'A bag tag, school ID or wearable card lets a teacher reach a parent and see allergies in seconds.',
            },
            {
              title: 'Senior citizens',
              body: 'A pendant, wristband or medicine-box label covering chronic conditions and daily medications.',
            },
          ].map((c) => (
            <Card key={c.title} className="p-5">
              <h3 className="font-bold text-slate-900">{c.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{c.body}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
