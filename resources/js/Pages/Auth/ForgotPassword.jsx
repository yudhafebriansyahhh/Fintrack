import Icon from '@/Components/Icon';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password" />

            <div className="mb-8">
                <p className="text-sm font-semibold uppercase text-primary-600">
                    Reset access
                </p>
                <h1 className="mt-3 text-4xl font-semibold text-slate-950">
                    Tenang, akses bisa dipulihkan.
                </h1>
                <p className="mt-3 text-base leading-7 text-slate-600">
                    Masukkan email akun Anda. Kami akan kirim tautan reset yang aman.
                </p>
            </div>

            {status && (
                <div className="mb-6 rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-success">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
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
                            className="block h-14 w-full rounded-none border-slate-200 bg-slate-50 pl-12 text-base shadow-sm transition focus:bg-white"
                            isFocused={true}
                            placeholder="name@example.com"
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </div>
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <PrimaryButton
                    className="h-14 w-full justify-center rounded-md text-base normal-case shadow-lg shadow-primary-700/25"
                    disabled={processing}
                >
                    Kirim Link Reset
                </PrimaryButton>
            </form>
        </GuestLayout>
    );
}
