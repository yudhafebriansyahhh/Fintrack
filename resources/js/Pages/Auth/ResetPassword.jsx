import Icon from '@/Components/Icon';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Reset Password" />

            <div className="mb-8">
                <p className="text-sm font-semibold uppercase text-primary-600">
                    New password
                </p>
                <h1 className="mt-3 text-4xl font-semibold text-slate-950">
                    Kunci baru, kontrol tetap di tangan Anda.
                </h1>
                <p className="mt-3 text-base leading-7 text-slate-600">
                    Buat password baru untuk membuka kembali dashboard finansial Anda.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
                {[
                    ['email', 'Email Address', 'mail', 'username', 'email'],
                    ['password', 'Password', 'lock', 'new-password', 'password'],
                    ['password_confirmation', 'Confirm Password', 'lock', 'new-password', 'password'],
                ].map(([key, label, icon, autoComplete, type]) => (
                    <div key={key}>
                        <label htmlFor={key} className="text-sm font-semibold text-slate-900">
                            {label}
                        </label>
                        <div className="relative mt-3">
                            <Icon name={icon} className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <TextInput
                                id={key}
                                type={type}
                                name={key}
                                value={data[key]}
                                className="block h-14 w-full rounded-none border-slate-200 bg-slate-50 pl-12 text-base shadow-sm transition focus:bg-white"
                                autoComplete={autoComplete}
                                isFocused={key === 'password'}
                                onChange={(e) => setData(key, e.target.value)}
                            />
                        </div>
                        <InputError message={errors[key]} className="mt-2" />
                    </div>
                ))}

                <PrimaryButton
                    className="h-14 w-full justify-center rounded-md text-base normal-case shadow-lg shadow-primary-700/25"
                    disabled={processing}
                >
                    Reset Password
                </PrimaryButton>
            </form>
        </GuestLayout>
    );
}
