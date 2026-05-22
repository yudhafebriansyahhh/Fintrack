import Checkbox from '@/Components/Checkbox';
import Icon from '@/Components/Icon';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            <div className="mb-10">
                <p className="text-sm font-semibold uppercase text-primary-600">
                    Welcome back
                </p>
                <h1 className="mt-3 text-5xl font-semibold leading-tight text-slate-950">
                    Kendalikan uangmu, bukan sebaliknya.
                </h1>
                <p className="mt-4 text-lg leading-7 text-slate-600">
                    Masuk ke dashboard aman Anda dan lihat cashflow, tagihan, serta reminder dalam satu layar.
                </p>
            </div>

            {status && (
                <div className="mb-6 rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-success">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <label htmlFor="email" className="text-sm font-semibold text-slate-900">
                        Email Address
                    </label>
                    <div className="relative mt-3">
                        <Icon name="mail" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="block h-14 w-full rounded-2xl border-slate-200 bg-slate-50 pl-12 pr-4 text-base shadow-sm transition focus:bg-white"
                            autoComplete="username"
                            placeholder="name@example.com"
                            isFocused={true}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </div>
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div>
                    <label htmlFor="password" className="text-sm font-semibold text-slate-900">
                        Password
                    </label>
                    <div className="relative mt-3">
                        <Icon name="lock" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="block h-14 w-full rounded-2xl border-slate-200 bg-slate-50 pl-12 pr-4 text-base shadow-sm transition focus:bg-white"
                            autoComplete="current-password"
                            placeholder="password"
                            onChange={(e) => setData('password', e.target.value)}
                        />
                    </div>
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="flex items-center justify-between gap-4">
                    <label className="flex items-center">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                        />
                        <span className="ms-3 text-sm text-slate-600">
                            Remember me
                        </span>
                    </label>

                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-sm font-semibold text-primary-700 transition hover:text-primary-800"
                        >
                            Forgot password?
                        </Link>
                    )}
                </div>

                <PrimaryButton
                    className="h-14 w-full justify-center rounded-2xl text-base normal-case shadow-lg shadow-primary-700/25 transition hover:-translate-y-0.5"
                    disabled={processing}
                >
                    Sign In
                    <Icon name="arrowUp" className="ml-3 h-5 w-5 rotate-45" />
                </PrimaryButton>

                <p className="text-center text-sm text-slate-600">
                    Belum punya akun?{' '}
                    <Link
                        href={route('register')}
                        className="font-semibold text-primary-700 hover:text-primary-800"
                    >
                        Register now
                    </Link>
                </p>
            </form>
        </GuestLayout>
    );
}
