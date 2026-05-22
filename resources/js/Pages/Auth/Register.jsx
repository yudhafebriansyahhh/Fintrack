import Icon from '@/Components/Icon';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const fields = [
        ['name', 'Name', 'user', 'Nama lengkap', 'name', 'text'],
        ['email', 'Email', 'mail', 'name@example.com', 'username', 'email'],
        ['phone', 'Nomor WhatsApp', 'whatsapp', '+62 812 3456 7890', 'tel', 'tel'],
        ['password', 'Password', 'lock', 'Minimal 8 karakter', 'new-password', 'password'],
        ['password_confirmation', 'Confirm Password', 'lock', 'Ulangi password', 'new-password', 'password'],
    ];

    return (
        <GuestLayout>
            <Head title="Register" />

            <div className="mb-8">
                <p className="text-sm font-semibold uppercase text-primary-600">
                    Start clean
                </p>
                <h1 className="mt-3 text-4xl font-semibold leading-tight text-slate-950">
                    Mulai catatan finansial yang rapi hari ini.
                </h1>
                <p className="mt-3 text-base leading-7 text-slate-600">
                    Daftar sekali, lalu kelola transaksi, tagihan, dan reminder WhatsApp dari satu pusat kendali.
                </p>
            </div>

            <form onSubmit={submit} className="grid gap-5">
                {fields.map(([key, label, icon, placeholder, autoComplete, type]) => (
                    <div key={key}>
                        <label htmlFor={key} className="text-sm font-semibold text-slate-900">
                            {label}
                        </label>
                        <div className="relative mt-2">
                            <Icon name={icon} className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <TextInput
                                id={key}
                                type={type}
                                name={key}
                                value={data[key]}
                                className="block h-14 w-full rounded-2xl border-slate-200 bg-slate-50 pl-12 pr-4 text-base shadow-sm transition focus:bg-white"
                                autoComplete={autoComplete}
                                placeholder={placeholder}
                                isFocused={key === 'name'}
                                onChange={(e) => setData(key, e.target.value)}
                                required
                            />
                        </div>
                        <InputError message={errors[key]} className="mt-2" />
                    </div>
                ))}

                <PrimaryButton
                    className="mt-2 h-14 w-full justify-center rounded-2xl text-base normal-case shadow-lg shadow-primary-700/25 transition hover:-translate-y-0.5"
                    disabled={processing}
                >
                    Create Account
                    <Icon name="arrowUp" className="ml-3 h-5 w-5 rotate-45" />
                </PrimaryButton>

                <p className="text-center text-sm text-slate-600">
                    Sudah punya akun?{' '}
                    <Link
                        href={route('login')}
                        className="font-semibold text-primary-700 hover:text-primary-800"
                    >
                        Sign in
                    </Link>
                </p>
            </form>
        </GuestLayout>
    );
}
